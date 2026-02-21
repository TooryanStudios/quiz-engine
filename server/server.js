'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const config = require('../config');

// Recorded once at process startup — shown on the home screen
const BUILD_TIME = new Date().toLocaleString('en-GB', {
  year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false, timeZoneName: 'short',
});

// ─────────────────────────────────────────────
// Express + HTTP server
// ─────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint (used by Render.com)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Build info endpoint — returns server start time for the home screen version badge
app.get('/api/build-info', (_req, res) => res.json({ buildTime: BUILD_TIME }));

// ─────────────────────────────────────────────
// Socket.io setup with CORS
// ─────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: config.CORS_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

// ─────────────────────────────────────────────
// Hardcoded Quiz Questions
// Each question has: text, options (4), correctIndex (0-based)
// ─────────────────────────────────────────────
const QUESTIONS = [
  {
    text: 'What is the capital of France?',
    options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
    correctIndex: 2,
  },
  {
    text: 'How many planets are in our solar system?',
    options: ['7', '8', '9', '10'],
    correctIndex: 1,
  },
  {
    text: 'Which element has the chemical symbol "O"?',
    options: ['Gold', 'Oxygen', 'Osmium', 'Oganesson'],
    correctIndex: 1,
  },
  {
    text: 'Who painted the Mona Lisa?',
    options: ['Michelangelo', 'Raphael', 'Caravaggio', 'Leonardo da Vinci'],
    correctIndex: 3,
  },
  {
    text: 'What is 12 × 12?',
    options: ['124', '144', '132', '148'],
    correctIndex: 1,
  },
  {
    text: 'Which country invented the World Wide Web?',
    options: ['USA', 'Germany', 'United Kingdom', 'Japan'],
    correctIndex: 2,
  },
  {
    text: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correctIndex: 3,
  },
  {
    text: 'Which programming language is known as the "language of the web"?',
    options: ['Python', 'Java', 'JavaScript', 'C++'],
    correctIndex: 2,
  },
];

// ─────────────────────────────────────────────
// In-Memory Room State
// rooms: Map<pin, RoomObject>
// ─────────────────────────────────────────────
const rooms = new Map();

/**
 * Room structure:
 * {
 *   pin, hostSocketId, state, questionIndex, questionTimer, questionStartTime,
 *   paused, pausedTimeRemaining,
 *   players: Map<socketId, { id, nickname, score, streak, maxStreak,
 *                            currentAnswerIndex, answerTime }>
 * }
 */

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Generate a random N-digit PIN string that is not already in use. */
function generatePIN() {
  const len = config.GAME.PIN_LENGTH;
  let pin;
  do {
    pin = Math.floor(Math.random() * Math.pow(10, len))
      .toString()
      .padStart(len, '0');
  } while (rooms.has(pin));
  return pin;
}

/** Return a safe player list (array) suitable for broadcasting. */
function getPlayerList(room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    score: p.score,
    streak: p.streak,
  }));
}

/** Find the room owned by a given host socket. */
function findHostRoom(hostSocketId) {
  return Array.from(rooms.values()).find((r) => r.hostSocketId === hostSocketId) || null;
}

/**
 * Base score formula:
 *   correct → 1000 × (1 - (timeTaken / totalTime) × 0.5)
 *   wrong   → 0
 * Streak bonus: +100 per consecutive correct (capped at +500 for 5+)
 */
function calculateScore(timeTakenSec, isCorrect, streak) {
  if (!isCorrect) return 0;
  const total = config.GAME.QUESTION_DURATION_SEC;
  const ratio = Math.min(timeTakenSec, total) / total;
  const base = Math.round(1000 * (1 - ratio * 0.5));
  const streakBonus = Math.min(streak, 5) * 100; // up to +500
  return base + streakBonus;
}

// ─────────────────────────────────────────────
// Game Flow
// ─────────────────────────────────────────────

/** Broadcast the current question to all sockets in a room. */
function sendQuestion(room) {
  const q = QUESTIONS[room.questionIndex];
  // Only send text + options (never the correctIndex!) to clients
  io.to(room.pin).emit('game:question', {
    questionIndex: room.questionIndex,
    total: QUESTIONS.length,
    question: { text: q.text, options: q.options },
    duration: config.GAME.QUESTION_DURATION_SEC,
  });

  room.questionStartTime = Date.now();
  room.state = 'question';
  room.paused = false;
  room.pausedTimeRemaining = 0;

  // Server-side timer — locks answers when time is up
  room.questionTimer = setTimeout(() => {
    endQuestion(room);
  }, config.GAME.QUESTION_DURATION_SEC * 1000);
}

/** End a question: reveal answer, compute scores, show leaderboard. */
function endQuestion(room) {
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  room.state = 'leaderboard';

  const q = QUESTIONS[room.questionIndex];

  // Compute per-player round scores and add to total
  const roundScores = [];
  room.players.forEach((player) => {
    const isCorrect = player.currentAnswerIndex === q.correctIndex;

    // Update streak BEFORE calculating score so bonus applies immediately
    if (isCorrect) {
      player.streak++;
      player.maxStreak = Math.max(player.maxStreak, player.streak);
    } else {
      player.streak = 0;
    }

    const roundScore = calculateScore(player.answerTime, isCorrect, player.streak);
    player.score += roundScore;
    roundScores.push({
      id: player.id,
      nickname: player.nickname,
      roundScore,
      totalScore: player.score,
      isCorrect,
      streak: player.streak,
    });
    // Reset answer for next question
    player.currentAnswerIndex = -1;
    player.answerTime = config.GAME.QUESTION_DURATION_SEC;
  });

  // Sort round scores descending
  roundScores.sort((a, b) => b.totalScore - a.totalScore);

  // Broadcast question result
  io.to(room.pin).emit('question:end', {
    correctIndex: q.correctIndex,
    correctOption: q.options[q.correctIndex],
    roundScores,
  });

  // After a short pause, show leaderboard then advance
  setTimeout(() => {
    const leaderboard = roundScores; // already sorted
    const isLastQuestion = room.questionIndex >= QUESTIONS.length - 1;

    if (isLastQuestion) {
      room.state = 'finished';
      io.to(room.pin).emit('game:over', { leaderboard });
    } else {
      io.to(room.pin).emit('game:leaderboard', { leaderboard, isFinal: false });

      // Advance to next question after leaderboard display time
      setTimeout(() => {
        room.questionIndex++;
        sendQuestion(room);
      }, config.GAME.LEADERBOARD_DURATION_MS);
    }
  }, 2000); // 2s to show the correct answer highlight before leaderboard
}

// ─────────────────────────────────────────────
// Socket.io Event Handlers
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── HOST: Create a new room ──────────────────
  socket.on('host:create', () => {
    const pin = generatePIN();

    const room = {
      pin,
      hostSocketId: socket.id,
      players: new Map(),
      state: 'lobby',
      questionIndex: 0,
      questionTimer: null,
      questionStartTime: 0,
      paused: false,
      pausedTimeRemaining: 0,
    };

    rooms.set(pin, room);
    socket.join(pin);

    console.log(`[Room] Created: PIN=${pin} by host=${socket.id}`);
    socket.emit('room:created', { pin });
  });

  // ── PLAYER: Join a room ──────────────────────
  socket.on('player:join', ({ pin, nickname }) => {
    const room = rooms.get(pin);

    // Room not found
    if (!room) {
      socket.emit('room:error', { message: `No room found with PIN: ${pin}` });
      return;
    }

    // *** Late Joiner Handling ***
    // If the game has already started, reject the player.
    if (room.state !== 'lobby') {
      socket.emit('room:error', {
        message: 'Game already in progress. Please wait for the next round.',
      });
      return;
    }

    // Duplicate nickname check
    const nameTaken = Array.from(room.players.values()).some(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
    );
    if (nameTaken) {
      socket.emit('room:error', { message: 'That nickname is already taken.' });
      return;
    }

    // Add player to room
    const player = {
      id: socket.id,
      nickname: nickname.trim(),
      score: 0,
      streak: 0,
      maxStreak: 0,
      currentAnswerIndex: -1,
      answerTime: config.GAME.QUESTION_DURATION_SEC,
    };
    room.players.set(socket.id, player);
    socket.join(pin);

    // Tag the socket with its room PIN for disconnect cleanup
    socket.data.pin = pin;
    socket.data.isHost = false;

    console.log(`[Room ${pin}] Player joined: ${nickname} (${socket.id})`);

    // Confirm to the joining player
    socket.emit('room:joined', {
      pin,
      nickname: player.nickname,
      players: getPlayerList(room),
    });

    // Notify everyone in the room (including host) about the updated player list
    io.to(pin).emit('room:player_joined', {
      players: getPlayerList(room),
    });
  });

  // ── HOST: Start the game ─────────────────────
  socket.on('host:start', () => {
    // Find the room this host owns
    const room = Array.from(rooms.values()).find(
      (r) => r.hostSocketId === socket.id
    );

    if (!room) {
      socket.emit('room:error', { message: 'Room not found.' });
      return;
    }

    if (room.players.size === 0) {
      socket.emit('room:error', { message: 'Need at least one player to start.' });
      return;
    }

    if (room.state !== 'lobby') {
      socket.emit('room:error', { message: 'Game already started.' });
      return;
    }

    console.log(`[Room ${room.pin}] Game started by host ${socket.id}`);

    // Broadcast game start to everyone in the room
    io.to(room.pin).emit('game:start', {
      totalQuestions: QUESTIONS.length,
    });

    // Small delay before first question (let clients animate into game view)
    setTimeout(() => {
      sendQuestion(room);
    }, 1500);
  });

  // ── HOST: Pause the game ─────────────────────
  socket.on('host:pause', () => {
    const room = findHostRoom(socket.id);
    if (!room || room.state !== 'question' || room.paused) return;

    room.paused = true;
    const elapsed = Date.now() - room.questionStartTime;
    room.pausedTimeRemaining = Math.max(
      0,
      config.GAME.QUESTION_DURATION_SEC * 1000 - elapsed
    );
    clearTimeout(room.questionTimer);
    room.questionTimer = null;

    console.log(`[Room ${room.pin}] Paused. ${Math.ceil(room.pausedTimeRemaining / 1000)}s remaining.`);
    io.to(room.pin).emit('game:paused', {
      timeRemaining: Math.ceil(room.pausedTimeRemaining / 1000),
    });
  });

  // ── HOST: Resume the game ────────────────────
  socket.on('host:resume', () => {
    const room = findHostRoom(socket.id);
    if (!room || !room.paused) return;

    room.paused = false;
    // Shift questionStartTime so elapsed time is correct when resumed
    room.questionStartTime = Date.now() - (
      config.GAME.QUESTION_DURATION_SEC * 1000 - room.pausedTimeRemaining
    );
    room.questionTimer = setTimeout(() => endQuestion(room), room.pausedTimeRemaining);

    console.log(`[Room ${room.pin}] Resumed. ${Math.ceil(room.pausedTimeRemaining / 1000)}s remaining.`);
    io.to(room.pin).emit('game:resumed', {
      timeRemaining: Math.ceil(room.pausedTimeRemaining / 1000),
    });
  });

  // ── HOST: Skip current question ──────────────
  socket.on('host:skip', () => {
    const room = findHostRoom(socket.id);
    if (!room || (room.state !== 'question' && !room.paused)) return;
    console.log(`[Room ${room.pin}] Question skipped by host.`);
    endQuestion(room);
  });

  // ── HOST: Kick a player from the lobby ───────
  socket.on('host:kick', ({ playerId }) => {
    const room = findHostRoom(socket.id);
    if (!room || room.state !== 'lobby') return;

    const player = room.players.get(playerId);
    if (!player) return;

    room.players.delete(playerId);

    const playerSocket = io.sockets.sockets.get(playerId);
    if (playerSocket) {
      playerSocket.emit('room:kicked', {
        message: 'You were removed from the room by the host.',
      });
      playerSocket.leave(room.pin);
    }

    console.log(`[Room ${room.pin}] Kicked player: ${player.nickname}`);
    io.to(room.pin).emit('room:player_joined', { players: getPlayerList(room) });
  });

  // ── PLAYER: Submit an answer ─────────────────
  socket.on('player:answer', ({ questionIndex, answerIndex }) => {
    const pin = socket.data.pin;
    if (!pin) return;

    const room = rooms.get(pin);
    if (!room || room.state !== 'question') return;

    // Ignore answers for a different question (race condition guard)
    if (questionIndex !== room.questionIndex) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    // Ignore if already answered
    if (player.currentAnswerIndex !== -1) return;

    // Record the answer and time taken
    const timeTakenMs = Date.now() - room.questionStartTime;
    const timeTakenSec = timeTakenMs / 1000;

    player.currentAnswerIndex = answerIndex;
    player.answerTime = timeTakenSec;

    // Acknowledge to the player that their answer was received
    socket.emit('answer:received', { answerIndex });

    // Notify the host how many players have answered (live counter)
    const answeredCount = Array.from(room.players.values()).filter(
      (p) => p.currentAnswerIndex !== -1
    ).length;

    const hostSocket = io.sockets.sockets.get(room.hostSocketId);
    if (hostSocket) {
      hostSocket.emit('question:answer_update', {
        answered: answeredCount,
        total: room.players.size,
      });
    }

    // Auto-end question if everyone has answered
    if (answeredCount === room.players.size) {
      endQuestion(room);
    }
  });

  // ── DISCONNECT ───────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);
    const pin = socket.data.pin;

    if (pin) {
      const room = rooms.get(pin);
      if (room) {
        room.players.delete(socket.id);

        if (room.state === 'lobby') {
          // Notify remaining players about updated list
          io.to(pin).emit('room:player_joined', {
            players: getPlayerList(room),
          });
        }
      }
      return;
    }

    // Host disconnected — find and destroy the room
    const hostedRoom = Array.from(rooms.values()).find(
      (r) => r.hostSocketId === socket.id
    );
    if (hostedRoom) {
      console.log(`[Room ${hostedRoom.pin}] Host disconnected. Closing room.`);
      if (hostedRoom.questionTimer) clearTimeout(hostedRoom.questionTimer);

      io.to(hostedRoom.pin).emit('room:closed', {
        message: 'The host has disconnected. The game has ended.',
      });

      // Remove all sockets from the Socket.io room
      io.socketsLeave(hostedRoom.pin);
      rooms.delete(hostedRoom.pin);
    }
  });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
httpServer.listen(config.PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║       Quiz Engine Server             ║
  ║  Listening on port ${config.PORT}           ║
  ║  Domain: ${config.DOMAIN}  ║
  ╚══════════════════════════════════════╝
  `);
});
