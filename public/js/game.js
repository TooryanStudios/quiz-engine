'use strict';

// ─────────────────────────────────────────────
// Sound Engine (synthesized via Web Audio API — no files needed)
// ─────────────────────────────────────────────
let audioCtx = null;
let muted = false;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type, duration, volume = 0.25, delay = 0) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) {}
}

const Sounds = {
  click:    () => playTone(600, 'sine', 0.06, 0.15),
  tick:     () => playTone(880, 'square', 0.04, 0.1),
  urgentTick: () => { playTone(1100, 'square', 0.05, 0.18); },
  correct:  () => {
    playTone(523, 'sine', 0.1, 0.35);
    playTone(659, 'sine', 0.1, 0.35, 0.11);
    playTone(784, 'sine', 0.18, 0.35, 0.22);
  },
  wrong:    () => {
    playTone(220, 'sawtooth', 0.15, 0.3);
    playTone(160, 'sawtooth', 0.15, 0.3, 0.14);
  },
  start:    () => {
    [440, 554, 659, 880].forEach((f, i) => playTone(f, 'sine', 0.12, 0.3, i * 0.1));
  },
  fanfare:  () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => playTone(f, 'sine', 0.22, 0.4, i * 0.09));
  },
  pause:    () => playTone(300, 'sine', 0.2, 0.2),
  resume:   () => {
    playTone(440, 'sine', 0.1, 0.2);
    playTone(550, 'sine', 0.1, 0.2, 0.1);
  },
};

// Fetch and display server build time on home screen
fetch('/api/build-info')
  .then((r) => r.json())
  .then(({ buildTime }) => {
    const el = document.getElementById('build-time');
    if (el) el.textContent = `Build: ${buildTime}`;
  })
  .catch(() => {});

// ─────────────────────────────────────────────
// Socket.io connection
// The server serves socket.io client at /socket.io/socket.io.js
// ─────────────────────────────────────────────
const socket = io();

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
const state = {
  role: null,          // 'host' | 'player'
  pin: null,
  nickname: null,
  questionIndex: 0,
  totalQuestions: 0,
  questionDuration: 30,
  questionStartTime: null,
  hasAnswered: false,
  myAnswerIndex: -1,
  myScore: 0,
  myStreak: 0,
  isPaused: false,
  timerInterval: null,
};

// ─────────────────────────────────────────────
// Option colors (Kahoot-style)
// ─────────────────────────────────────────────
const OPTION_COLORS = ['opt-violet', 'opt-cyan', 'opt-amber', 'opt-emerald'];
const OPTION_ICONS  = ['A', 'B', 'C', 'D'];

// ─────────────────────────────────────────────
// View Management
// ─────────────────────────────────────────────
function showView(viewId) {
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('active', v.id === viewId);
  });
}

// ─────────────────────────────────────────────
// Timer
// ─────────────────────────────────────────────
function startClientTimer(duration, countEl, ringEl) {
  stopClientTimer();
  let remaining = duration;

  function tick() {
    remaining = Math.max(0, duration - Math.round((Date.now() - state.questionStartTime) / 1000));
    countEl.textContent = remaining;

    const pct = remaining / duration;
    ringEl.style.setProperty('--timer-pct', pct);

    if (pct <= 0.2) {
      ringEl.classList.add('timer-danger', 'timer-urgent');
      Sounds.urgentTick();
    } else if (pct <= 0.4) {
      ringEl.classList.add('timer-danger');
      ringEl.classList.remove('timer-urgent');
      Sounds.tick();
    } else {
      ringEl.classList.remove('timer-danger', 'timer-urgent');
    }

    if (remaining <= 0) stopClientTimer();
  }

  tick();
  state.timerInterval = setInterval(tick, 500);
}

function stopClientTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

// ─────────────────────────────────────────────
// Player List Rendering
// ─────────────────────────────────────────────
function renderPlayerList(players, listEl, countEl, isHostLobby = false) {
  countEl.textContent = players.length;
  const kickHint = document.getElementById('kick-hint');

  if (isHostLobby) {
    // Host lobby: show kick buttons
    listEl.innerHTML = players
      .map(
        (p) =>
          `<li class="player-chip kickable" data-id="${p.id}">
            ${escapeHtml(p.nickname)}
            <button class="btn-kick" data-id="${p.id}" title="Kick player">❌</button>
          </li>`
      )
      .join('');
    // Attach kick listeners
    listEl.querySelectorAll('.btn-kick').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Sounds.click();
        socket.emit('host:kick', { playerId: btn.dataset.id });
      });
    });
    if (kickHint) kickHint.style.display = players.length > 0 ? 'block' : 'none';
  } else {
    listEl.innerHTML = players
      .map((p) => `<li class="player-chip">${escapeHtml(p.nickname)}</li>`)
      .join('');
  }
}

// ─────────────────────────────────────────────
// Question Rendering
// ─────────────────────────────────────────────
function renderQuestion(data, isHost) {
  stopClientTimer();
  state.hasAnswered = false;
  state.myAnswerIndex = -1;
  state.questionIndex = data.questionIndex;
  state.totalQuestions = data.total;
  state.questionDuration = data.duration;
  state.questionStartTime = Date.now();

  if (isHost) {
    /** HOST QUESTION VIEW **/
    document.getElementById('host-q-progress').textContent =
      `Q ${data.questionIndex + 1} / ${data.total}`;
    document.getElementById('host-question-text').textContent = data.question.text;
    document.getElementById('host-answer-counter').textContent =
      `0 / 0 answered`;

    // Reset pause/resume button
    const pauseBtn = document.getElementById('btn-pause-resume');
    pauseBtn.textContent = '⏸️ Pause';
    pauseBtn.dataset.paused = 'false';

    const grid = document.getElementById('host-options-grid');
    grid.innerHTML = data.question.options
      .map(
        (opt, i) =>
          `<div class="option-card ${OPTION_COLORS[i]} stagger-${i + 1}">
            <span class="opt-icon">${OPTION_ICONS[i]}</span>
            <span class="opt-text">${escapeHtml(opt)}</span>
          </div>`
      )
      .join('');

    startClientTimer(
      data.duration,
      document.getElementById('host-timer-count'),
      document.getElementById('host-timer-ring')
    );

    const layout = document.getElementById('host-question-layout');
    layout.classList.remove('animate-in');
    void layout.offsetWidth; // force reflow
    layout.classList.add('animate-in');
    showView('view-host-question');
  } else {
    /** PLAYER QUESTION VIEW **/
    document.getElementById('player-q-progress').textContent =
      `Q ${data.questionIndex + 1} / ${data.total}`;
    document.getElementById('player-question-text').textContent = data.question.text;
    document.getElementById('player-answered-msg').textContent = '';

    // Update streak badge
    const streakBadge = document.getElementById('player-streak-badge');
    if (state.myStreak >= 2) {
      document.getElementById('player-streak-count').textContent = state.myStreak;
      streakBadge.style.display = 'inline-flex';
    } else {
      streakBadge.style.display = 'none';
    }

    const grid = document.getElementById('player-options-grid');
    grid.innerHTML = data.question.options
      .map(
        (opt, i) =>
          `<button
            class="option-btn ${OPTION_COLORS[i]} stagger-${i + 1}"
            data-index="${i}"
            aria-label="Option ${i + 1}: ${escapeHtml(opt)}"
          >
            <span class="opt-icon">${OPTION_ICONS[i]}</span>
            <span class="opt-text">${escapeHtml(opt)}</span>
          </button>`
      )
      .join('');

    // Bind click handlers to answer buttons
    grid.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.hasAnswered) return;
        Sounds.click();
        const answerIndex = parseInt(btn.dataset.index, 10);
        submitAnswer(answerIndex);
      });
    });

    startClientTimer(
      data.duration,
      document.getElementById('player-timer-count'),
      document.getElementById('player-timer-ring')
    );

    const layout = document.getElementById('player-question-layout');
    layout.classList.remove('animate-in');
    void layout.offsetWidth;
    layout.classList.add('animate-in');
    showView('view-player-question');
  }
}

// ─────────────────────────────────────────────
// Submit Answer (Player)
// ─────────────────────────────────────────────
function submitAnswer(answerIndex) {
  if (state.hasAnswered) return;
  state.hasAnswered = true;
  state.myAnswerIndex = answerIndex;

  socket.emit('player:answer', {
    questionIndex: state.questionIndex,
    answerIndex,
  });

  // Visually lock the buttons
  const grid = document.getElementById('player-options-grid');
  grid.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === answerIndex) {
      btn.classList.add('selected');
    } else {
      btn.classList.add('dimmed');
    }
  });

  document.getElementById('player-answered-msg').textContent =
    '✅ Answer submitted! Waiting for others…';
}

// ─────────────────────────────────────────────
// Question Result Screen
// ─────────────────────────────────────────────
function showQuestionResult(data) {
  stopClientTimer();
  document.getElementById('overlay-paused').style.display = 'none';

  document.getElementById('result-correct-answer').textContent = data.correctOption;

  // Animate options if still on question view (player answered)
  const playerGrid = document.getElementById('player-options-grid');
  playerGrid.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === data.correctIndex) {
      btn.classList.remove('dimmed', 'selected');
      btn.classList.add('reveal-correct');
    } else {
      btn.classList.remove('selected');
      btn.classList.add('reveal-wrong');
    }
  });

  // Show the player how many points they earned this round
  const myRound = data.roundScores.find((r) => r.id === socket.id);
  const resultMsg  = document.getElementById('result-player-score-msg');
  const streakMsg  = document.getElementById('result-streak-msg');

  if (state.role === 'player' && myRound) {
    state.myStreak = myRound.streak;
    state.myScore  = myRound.totalScore;
    if (myRound.isCorrect) {
      Sounds.correct();
      resultMsg.textContent = `+${myRound.roundScore} pts 🎉`;
      resultMsg.className = 'result-score-msg correct';
      streakMsg.textContent = myRound.streak >= 2 ? `🔥 ${myRound.streak} in a row!` : '';
    } else {
      Sounds.wrong();
      resultMsg.textContent = 'Wrong answer. 0 pts.';
      resultMsg.className = 'result-score-msg incorrect';
      streakMsg.textContent = '';
    }
  } else {
    resultMsg.textContent = '';
    streakMsg.textContent = '';
  }

  // Small delay so the reveal animation can be seen before switching views
  setTimeout(() => showView('view-question-result'), 400);
}

// ─────────────────────────────────────────────
// Leaderboard Screen
// ─────────────────────────────────────────────
function showLeaderboard(data, isFinal) {
  const titleEl = document.getElementById('lb-title');
  const hintEl  = document.getElementById('lb-next-hint');

  titleEl.textContent = isFinal ? '🎉 Final Results' : '🏆 Leaderboard';
  hintEl.textContent  = isFinal ? '' : 'Next question coming up…';
  hintEl.style.display = isFinal ? 'none' : 'block';

  const listEl = document.getElementById('leaderboard-list');
  listEl.innerHTML = data.leaderboard
    .map(
      (entry, i) =>
        `<li class="lb-entry ${entry.id === socket.id ? 'lb-mine' : ''}" style="animation-delay:${i * 0.07}s">
          <span class="lb-rank">${i + 1}</span>
          <span class="lb-nickname">${escapeHtml(entry.nickname)}${entry.streak >= 2 ? ` <span class="lb-streak">🔥${entry.streak}</span>` : ''}</span>
          <span class="lb-score">${entry.totalScore} pts</span>
        </li>`
    )
    .join('');

  showView('view-leaderboard');
}

// ─────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showError(elId, message) {
  const el = document.getElementById(elId);
  if (el) {
    el.textContent = message;
    setTimeout(() => { el.textContent = ''; }, 4000);
  }
}

// ─────────────────────────────────────────────
// UI Event Listeners
// ─────────────────────────────────────────────

// Home — Become Host
document.getElementById('btn-become-host').addEventListener('click', () => {
  Sounds.click();
  state.role = 'host';
  socket.emit('host:create');
});

// Home — Become Player
document.getElementById('btn-become-player').addEventListener('click', () => {
  Sounds.click();
  state.role = 'player';
  showView('view-player-join');
});

// Player Join — Back button
document.getElementById('btn-back-from-join').addEventListener('click', () => {
  Sounds.click();
  showView('view-home');
});

// Player Join — Submit form
document.getElementById('form-join').addEventListener('submit', (e) => {
  e.preventDefault();
  const pin = document.getElementById('input-pin').value.trim();
  const nickname = document.getElementById('input-nickname').value.trim();
  if (!pin || !nickname) return;
  Sounds.click();
  state.pin = pin;
  state.nickname = nickname;
  socket.emit('player:join', { pin, nickname });
});

// Host Lobby — Back button
document.getElementById('btn-back-from-host-lobby').addEventListener('click', () => {
  Sounds.click();
  socket.disconnect();
  socket.connect();
  state.role = null;
  state.pin = null;
  showView('view-home');
});

// Host Start Game
document.getElementById('btn-start-game').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:start');
});

// Host Pause / Resume
document.getElementById('btn-pause-resume').addEventListener('click', () => {
  const btn = document.getElementById('btn-pause-resume');
  if (btn.dataset.paused === 'true') {
    socket.emit('host:resume');
  } else {
    socket.emit('host:pause');
  }
});

// Host Skip question
document.getElementById('btn-skip').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:skip');
});

// Mute toggle
document.getElementById('btn-mute').addEventListener('click', () => {
  muted = !muted;
  document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
});

// Play Again button
document.getElementById('btn-play-again').addEventListener('click', () => {
  location.reload();
});

// Back to Home from Room Closed
document.getElementById('btn-home-from-closed').addEventListener('click', () => {
  location.reload();
});

// ─────────────────────────────────────────────
// Socket.io Event Handlers
// ─────────────────────────────────────────────

/** HOST: Room created successfully */
socket.on('room:created', ({ pin }) => {
  state.pin = pin;
  document.getElementById('host-pin').textContent = pin;
  document.getElementById('host-player-count').textContent = '0';
  document.getElementById('host-player-list').innerHTML = '';

  // Generate QR code pointing to join URL with PIN pre-filled
  const joinUrl = `${window.location.origin}/?pin=${pin}`;
  const qrContainer = document.getElementById('host-qr-canvas');
  qrContainer.innerHTML = ''; // clear any previous QR
  new QRCode(qrContainer, {
    text: joinUrl,
    width: 180,
    height: 180,
    colorDark: '#ffffff',
    colorLight: '#16213e',
    correctLevel: QRCode.CorrectLevel.H,
  });

  showView('view-host-lobby');
});

/** PLAYER: Successfully joined the room */
socket.on('room:joined', ({ pin, nickname, players }) => {
  state.pin = pin;
  state.nickname = nickname;
  document.getElementById('player-room-pin').textContent = pin;
  renderPlayerList(
    players,
    document.getElementById('player-player-list'),
    document.getElementById('player-player-count')
  );
  showView('view-player-lobby');
});

/** BOTH: Someone joined — update player list */
socket.on('room:player_joined', ({ players }) => {
  if (state.role === 'host') {
    renderPlayerList(
      players,
      document.getElementById('host-player-list'),
      document.getElementById('host-player-count'),
      true // isHostLobby — show kick buttons
    );
    const startBtn = document.getElementById('btn-start-game');
    startBtn.disabled = players.length === 0;
    document.getElementById('lobby-hint').textContent =
      players.length > 0 ? `${players.length} player(s) ready.` : 'Waiting for at least 1 player…';
  } else {
    renderPlayerList(
      players,
      document.getElementById('player-player-list'),
      document.getElementById('player-player-count')
    );
  }
});

/** BOTH: Error from server */
socket.on('room:error', ({ message }) => {
  if (state.role === 'player') {
    showError('join-error', `⚠️ ${message}`);
  } else {
    alert(`Server error: ${message}`);
  }
});

/** BOTH: Game is starting */
socket.on('game:start', ({ totalQuestions }) => {
  state.totalQuestions = totalQuestions;
  state.myStreak = 0;
  Sounds.start();
});

/** BOTH: New question */
socket.on('game:question', (data) => {
  state.isPaused = false;
  document.getElementById('overlay-paused').style.display = 'none';
  renderQuestion(data, state.role === 'host');
});

/** HOST: Game paused */
socket.on('game:paused', () => {
  state.isPaused = true;
  stopClientTimer();
  Sounds.pause();
  const btn = document.getElementById('btn-pause-resume');
  if (btn) { btn.textContent = '▶️ Resume'; btn.dataset.paused = 'true'; }
  document.getElementById('overlay-paused').style.display = 'flex';
});

/** BOTH: Game resumed */
socket.on('game:resumed', ({ timeRemaining }) => {
  state.isPaused = false;
  Sounds.resume();
  document.getElementById('overlay-paused').style.display = 'none';
  const btn = document.getElementById('btn-pause-resume');
  if (btn) { btn.textContent = '⏸️ Pause'; btn.dataset.paused = 'false'; }
  // Restart client timer with remaining seconds
  state.questionStartTime = Date.now() - ((state.questionDuration - timeRemaining) * 1000);
  const isHost = state.role === 'host';
  startClientTimer(
    state.questionDuration,
    document.getElementById(isHost ? 'host-timer-count' : 'player-timer-count'),
    document.getElementById(isHost ? 'host-timer-ring' : 'player-timer-ring')
  );
});

/** HOST: Live answer count update */
socket.on('question:answer_update', ({ answered, total }) => {
  const el = document.getElementById('host-answer-counter');
  if (el) el.textContent = `${answered} / ${total} answered`;
});

/** PLAYER: Server acknowledged answer */
socket.on('answer:received', () => {
  // UI already updated in submitAnswer()
});

/** BOTH: Question ended — show correct answer */
socket.on('question:end', (data) => {
  showQuestionResult(data);
});

/** BOTH: Leaderboard between questions */
socket.on('game:leaderboard', (data) => {
  // Server already waits 2s after question:end before sending this — no extra delay needed
  showLeaderboard(data, false);
});

/** BOTH: Game over — final leaderboard */
socket.on('game:over', (data) => {
  // Stop timer immediately — player may still be on question view if they never answered
  stopClientTimer();
  document.getElementById('overlay-paused').style.display = 'none';
  Sounds.fanfare();
  // Confetti celebration
  if (typeof confetti === 'function') {
    confetti({ particleCount: 160, spread: 80, origin: { y: 0.5 } });
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 400);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 700);
  }
  const listEl = document.getElementById('final-leaderboard-list');
  listEl.innerHTML = data.leaderboard
    .map(
      (entry, i) =>
        `<li class="lb-entry ${entry.id === socket.id ? 'lb-mine' : ''}" style="animation-delay:${i * 0.07}s">
          <span class="lb-rank">${i + 1}</span>
          <span class="lb-nickname">${escapeHtml(entry.nickname)}</span>
          <span class="lb-score">${entry.totalScore} pts</span>
        </li>`
    )
    .join('');
  showView('view-game-over');
});

/** PLAYER: Kicked by host */
socket.on('room:kicked', ({ message }) => {
  stopClientTimer();
  document.getElementById('room-closed-msg').textContent = message;
  showView('view-room-closed');
});

/** PLAYER: Host disconnected */
socket.on('room:closed', ({ message }) => {
  stopClientTimer();
  document.getElementById('room-closed-msg').textContent = message;
  showView('view-room-closed');
});

// ─────────────────────────────────────────────
// QR Auto-fill: runs LAST so state & showView are fully declared
// If URL has ?pin=XXXXXX (from QR scan), skip home and go straight
// to the player join view with PIN pre-filled.
// ─────────────────────────────────────────────
(function () {
  const params = new URLSearchParams(window.location.search);
  const pinFromUrl = params.get('pin');
  if (pinFromUrl) {
    state.role = 'player';
    document.getElementById('input-pin').value = pinFromUrl;
    showView('view-player-join');
  }
})();
