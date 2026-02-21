'use strict';

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

    if (pct <= 0.33) {
      ringEl.classList.add('timer-danger');
    } else {
      ringEl.classList.remove('timer-danger');
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
function renderPlayerList(players, listEl, countEl) {
  countEl.textContent = players.length;
  listEl.innerHTML = players
    .map((p) => `<li class="player-chip">${escapeHtml(p.nickname)}</li>`)
    .join('');
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
      `0 / ${0} answered`; // will update via answer_update event

    const grid = document.getElementById('host-options-grid');
    grid.innerHTML = data.question.options
      .map(
        (opt, i) =>
          `<div class="option-card ${OPTION_COLORS[i]}">
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
    showView('view-host-question');
  } else {
    /** PLAYER QUESTION VIEW **/
    document.getElementById('player-q-progress').textContent =
      `Q ${data.questionIndex + 1} / ${data.total}`;
    document.getElementById('player-question-text').textContent = data.question.text;
    document.getElementById('player-answered-msg').textContent = '';

    const grid = document.getElementById('player-options-grid');
    grid.innerHTML = data.question.options
      .map(
        (opt, i) =>
          `<button
            class="option-btn ${OPTION_COLORS[i]}"
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
        const answerIndex = parseInt(btn.dataset.index, 10);
        submitAnswer(answerIndex);
      });
    });

    startClientTimer(
      data.duration,
      document.getElementById('player-timer-count'),
      document.getElementById('player-timer-ring')
    );
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

  document.getElementById('result-correct-answer').textContent =
    data.correctOption;

  // Show the player how many points they earned this round
  const myRound = data.roundScores.find((r) => r.id === socket.id);
  const resultMsg = document.getElementById('result-player-score-msg');

  if (state.role === 'player' && myRound) {
    if (myRound.isCorrect) {
      resultMsg.textContent = `+${myRound.roundScore} points! 🎉`;
      resultMsg.className = 'result-score-msg correct';
    } else {
      resultMsg.textContent = `Wrong answer. 0 points.`;
      resultMsg.className = 'result-score-msg incorrect';
    }
  } else {
    resultMsg.textContent = '';
  }

  showView('view-question-result');
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
        `<li class="lb-entry ${entry.id === socket.id ? 'lb-mine' : ''}">
          <span class="lb-rank">${i + 1}</span>
          <span class="lb-nickname">${escapeHtml(entry.nickname)}</span>
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
  state.role = 'host';
  socket.emit('host:create');
});

// Home — Become Player
document.getElementById('btn-become-player').addEventListener('click', () => {
  state.role = 'player';
  showView('view-player-join');
});

// Player Join — Back button
document.getElementById('btn-back-from-join').addEventListener('click', () => {
  showView('view-home');
});

// Player Join — Submit form
document.getElementById('form-join').addEventListener('submit', (e) => {
  e.preventDefault();
  const pin = document.getElementById('input-pin').value.trim();
  const nickname = document.getElementById('input-nickname').value.trim();

  if (!pin || !nickname) return;

  state.pin = pin;
  state.nickname = nickname;
  socket.emit('player:join', { pin, nickname });
});

// Host Lobby — Back button (disconnect and return home)
document.getElementById('btn-back-from-host-lobby').addEventListener('click', () => {
  socket.disconnect();
  socket.connect(); // fresh connection for next session
  state.role = null;
  state.pin = null;
  showView('view-home');
});

// Host Start Game
document.getElementById('btn-start-game').addEventListener('click', () => {
  socket.emit('host:start');
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
      document.getElementById('host-player-count')
    );
    const startBtn = document.getElementById('btn-start-game');
    startBtn.disabled = players.length === 0;
    document.querySelector('#view-host-lobby .hint-text').textContent =
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
});

/** BOTH: New question */
socket.on('game:question', (data) => {
  renderQuestion(data, state.role === 'host');
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
  setTimeout(() => {
    showLeaderboard(data, false);
  }, 2000); // Wait for result screen to be visible briefly
});

/** BOTH: Game over — final leaderboard */
socket.on('game:over', (data) => {
  setTimeout(() => {
    // Show final leaderboard
    const listEl = document.getElementById('final-leaderboard-list');
    listEl.innerHTML = data.leaderboard
      .map(
        (entry, i) =>
          `<li class="lb-entry ${entry.id === socket.id ? 'lb-mine' : ''}">
            <span class="lb-rank">${i + 1}</span>
            <span class="lb-nickname">${escapeHtml(entry.nickname)}</span>
            <span class="lb-score">${entry.totalScore} pts</span>
          </li>`
      )
      .join('');
    showView('view-game-over');
  }, 3000);
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
