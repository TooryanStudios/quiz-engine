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
const socket = io(window.location.origin);
const queryParams = new URLSearchParams(window.location.search);
const quizSlugFromUrl = queryParams.get('quiz');

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
  // new: question-type extras
  currentQuestionType: 'single',
  matchConnections: [],    // matchConnections[leftIdx] = displayRightIdx (-1 = unset)
  matchActiveLeft: -1,     // which left slot is currently "selected"
  matchRights: [],         // shuffled right labels sent by server
  orderItemOrder: [],      // current order of item indices on screen
  currentJoinUrl: '',
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
// Host Mode UI (Local / Global)
// ─────────────────────────────────────────────
function applyModeInfo(data) {
  if (!data) return;
  const { mode, joinUrl, qrSvg, localIp, localIpCandidates, localIpAvailable, warning } = data;

  const indicator = document.getElementById('mode-indicator');
  const warnEl    = document.getElementById('mode-warning');
  const localBtn  = document.getElementById('btn-mode-local');
  const globalBtn = document.getElementById('btn-mode-global');
  const urlEl     = document.getElementById('host-join-url');
  const qrWrap    = document.getElementById('host-qr-canvas');

  if (indicator) {
    indicator.textContent = mode === 'local' ? '📶 Local' : '🌐 Global';
  }

  if (localBtn && globalBtn) {
    localBtn.classList.toggle('mode-active', mode === 'local');
    globalBtn.classList.toggle('mode-active', mode !== 'local');
    localBtn.disabled = !localIpAvailable;
  }

  if (warnEl) {
    if (!localIpAvailable && warning) {
      warnEl.textContent = warning;
      warnEl.style.display = 'block';
    } else {
      warnEl.textContent = '';
      warnEl.style.display = 'none';
    }
  }

  if (urlEl) {
    const ips = Array.isArray(localIpCandidates)
      ? localIpCandidates.map((entry) => entry.address).filter(Boolean)
      : [];
    const ipHint = mode === 'local' && ips.length > 1
      ? `\nDetected IPs: ${ips.join(', ')}`
      : '';
    urlEl.textContent = joinUrl
      ? `${joinUrl}${ipHint}`
      : (localIp ? `http://${localIp} (pending room)` : '—');
  }
  state.currentJoinUrl = joinUrl || '';
  if (qrWrap) qrWrap.innerHTML = qrSvg || '';
}

function setConnectionStatus(kind, message) {
  let el = document.getElementById('connection-status-chip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'connection-status-chip';
    el.style.position = 'fixed';
    el.style.top = '12px';
    el.style.left = '12px';
    el.style.zIndex = '9999';
    el.style.padding = '6px 10px';
    el.style.borderRadius = '999px';
    el.style.fontSize = '12px';
    el.style.fontWeight = '700';
    el.style.backdropFilter = 'blur(6px)';
    el.style.border = '1px solid transparent';
    document.body.appendChild(el);
  }

  if (kind === 'ok') {
    el.style.background = 'rgba(16, 185, 129, 0.18)';
    el.style.color = '#86efac';
    el.style.borderColor = 'rgba(16, 185, 129, 0.4)';
  } else if (kind === 'warn') {
    el.style.background = 'rgba(245, 158, 11, 0.18)';
    el.style.color = '#fcd34d';
    el.style.borderColor = 'rgba(245, 158, 11, 0.4)';
  } else {
    el.style.background = 'rgba(239, 68, 68, 0.18)';
    el.style.color = '#fca5a5';
    el.style.borderColor = 'rgba(239, 68, 68, 0.4)';
  }

  el.textContent = message;
}

setConnectionStatus('warn', 'Connecting to server…');

// ─────────────────────────────────────────────
// Question Rendering — dispatcher
// ─────────────────────────────────────────────
function renderQuestion(data, isHost) {
  stopClientTimer();
  state.hasAnswered       = false;
  state.myAnswerIndex     = -1;
  state.questionIndex     = data.questionIndex;
  state.totalQuestions    = data.total;
  state.questionDuration  = data.duration;
  state.questionStartTime = Date.now();
  state.currentQuestionType = data.question.type;

  if (isHost) {
    renderHostQuestion(data);
  } else {
    renderPlayerQuestion(data);
  }
}

// ── Host view: shows question + non-interactive options/items ──────────
function renderHostQuestion(data) {
  const q = data.question;
  document.getElementById('host-q-progress').textContent =
    `Q ${data.questionIndex + 1} / ${data.total}`;
  document.getElementById('host-question-text').textContent = q.text;
  document.getElementById('host-answer-counter').textContent = '0 / 0 answered';

  const pauseBtn = document.getElementById('btn-pause-resume');
  pauseBtn.textContent = '⏸️ Pause';
  pauseBtn.dataset.paused = 'false';

  const grid = document.getElementById('host-options-grid');
  if (q.type === 'single' || q.type === 'multi') {
    grid.innerHTML = (q.options || []).map((opt, i) =>
      `<div class="option-card ${OPTION_COLORS[i]} stagger-${i + 1}">
        <span class="opt-icon">${OPTION_ICONS[i]}</span>
        <span class="opt-text">${escapeHtml(opt)}</span>
      </div>`
    ).join('');
  } else if (q.type === 'match') {
    grid.innerHTML =
      `<div class="host-pairs-preview">${(q.lefts || []).map((l, i) =>
        `<div class="host-pair-row stagger-${Math.min(i + 1, 4)}">
          <span class="host-pair-side">${escapeHtml(l)}</span>
          <span class="host-pair-arrow">⟷</span>
          <span class="host-pair-side host-pair-right">?</span>
        </div>`
      ).join('')}</div>`;
  } else if (q.type === 'order') {
    grid.innerHTML =
      `<div class="host-order-preview">${(q.items || []).map((item, i) =>
        `<div class="host-order-item stagger-${Math.min(i + 1, 4)}">${i + 1}. ${escapeHtml(item)}</div>`
      ).join('')}</div>`;
  }

  startClientTimer(data.duration,
    document.getElementById('host-timer-count'),
    document.getElementById('host-timer-ring'));

  const layout = document.getElementById('host-question-layout');
  layout.classList.remove('animate-in');
  void layout.offsetWidth;
  layout.classList.add('animate-in');
  showView('view-host-question');
}

// ── Player view: interactive answer UI per question type ───────────────
function renderPlayerQuestion(data) {
  const q = data.question;
  document.getElementById('player-q-progress').textContent =
    `Q ${data.questionIndex + 1} / ${data.total}`;
  document.getElementById('player-question-text').textContent = q.text;
  document.getElementById('player-answered-msg').textContent = '';

  // Streak badge
  const streakBadge = document.getElementById('player-streak-badge');
  if (state.myStreak >= 2) {
    document.getElementById('player-streak-count').textContent = state.myStreak;
    streakBadge.style.display = 'inline-flex';
  } else {
    streakBadge.style.display = 'none';
  }

  // Reset all type containers
  const optGrid   = document.getElementById('player-options-grid');
  const matchCont = document.getElementById('player-match-container');
  const orderCont = document.getElementById('player-order-container');
  const submitBtn = document.getElementById('btn-submit-answer');
  optGrid.style.display   = '';
  matchCont.style.display = 'none';
  orderCont.style.display = 'none';
  submitBtn.style.display = 'none';
  submitBtn.disabled      = false;
  submitBtn.textContent   = '✔ تأكيد الإجابة';

  if (q.type === 'single') {
    renderSingleChoice(q);
  } else if (q.type === 'multi') {
    renderMultiChoice(q);
  } else if (q.type === 'match') {
    optGrid.style.display = 'none';
    renderMatch(q);
  } else if (q.type === 'order') {
    optGrid.style.display = 'none';
    renderOrder(q);
  }

  startClientTimer(data.duration,
    document.getElementById('player-timer-count'),
    document.getElementById('player-timer-ring'));

  const layout = document.getElementById('player-question-layout');
  layout.classList.remove('animate-in');
  void layout.offsetWidth;
  layout.classList.add('animate-in');
  showView('view-player-question');
}

// ── Single choice (pick one, immediate submit) ─────────────────────────
function renderSingleChoice(q) {
  const grid = document.getElementById('player-options-grid');
  grid.innerHTML = (q.options || []).map((opt, i) =>
    `<button
      class="option-btn ${OPTION_COLORS[i]} stagger-${i + 1}"
      data-index="${i}"
      aria-label="Option ${i + 1}: ${escapeHtml(opt)}"
    >
      <span class="opt-icon">${OPTION_ICONS[i]}</span>
      <span class="opt-text">${escapeHtml(opt)}</span>
    </button>`
  ).join('');

  grid.querySelectorAll('.option-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.hasAnswered) return;
      Sounds.click();
      submitAnswer({ answerIndex: parseInt(btn.dataset.index, 10) });
    });
  });
}

// ── Multi-select (pick all that apply, then tap Submit) ────────────────
function renderMultiChoice(q) {
  const grid    = document.getElementById('player-options-grid');
  const submit  = document.getElementById('btn-submit-answer');
  submit.style.display = 'block';
  submit.disabled      = true;

  grid.innerHTML = (q.options || []).map((opt, i) =>
    `<button
      class="option-btn ${OPTION_COLORS[i]} stagger-${i + 1}"
      data-index="${i}"
      aria-label="Option ${i + 1}: ${escapeHtml(opt)}"
    >
      <span class="opt-icon">${OPTION_ICONS[i]}</span>
      <span class="opt-text">${escapeHtml(opt)}</span>
    </button>`
  ).join('');

  grid.querySelectorAll('.option-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.hasAnswered) return;
      Sounds.click();
      btn.classList.toggle('multi-selected');
      const anySelected = grid.querySelectorAll('.multi-selected').length > 0;
      submit.disabled = !anySelected;
    });
  });
}

// ── Match / Connect (tap left slot → tap right chip to pair) ───────────
function renderMatch(q) {
  state.matchConnections = new Array(q.lefts.length).fill(-1);
  state.matchActiveLeft  = -1;
  state.matchRights      = q.rights;

  document.getElementById('player-match-container').style.display = 'block';
  const submit = document.getElementById('btn-submit-answer');
  submit.style.display = 'block';
  submit.disabled      = true;

  refreshMatchUI(q.lefts, q.rights);
}

function refreshMatchUI(lefts, rights) {
  const leftCol  = document.getElementById('match-left-col');
  const rightPool = document.getElementById('match-right-pool');
  const placed   = new Set(state.matchConnections.filter(v => v !== -1));

  // Left slots
  leftCol.innerHTML = lefts.map((l, i) => {
    const ri      = state.matchConnections[i];
    const filled  = ri !== -1;
    const isActive = state.matchActiveLeft === i;
    return `<div
      class="match-left-item${filled ? ' match-filled ' + OPTION_COLORS[i] : ''}${isActive ? ' match-active-slot' : ''}"
      data-left-idx="${i}">
      <span class="match-left-label">${escapeHtml(l)}</span>
      ${filled
        ? `<span class="match-conn">${escapeHtml(rights[ri])}</span>`
        : `<span class="match-placeholder">…</span>`
      }
    </div>`;
  }).join('');

  // Right chip pool (unplaced only)
  rightPool.innerHTML = rights.map((r, i) => {
    if (placed.has(i)) return '';
    return `<div class="match-right-chip stagger-${(i % 4) + 1}" data-right-idx="${i}">${escapeHtml(r)}</div>`;
  }).join('');

  // Left slot click → select / unfit
  leftCol.querySelectorAll('.match-left-item').forEach(el => {
    el.addEventListener('click', () => {
      if (state.hasAnswered) return;
      const li = parseInt(el.dataset.leftIdx);
      if (state.matchConnections[li] !== -1) {
        // Remove existing connection
        state.matchConnections[li] = -1;
        state.matchActiveLeft = li;
      } else {
        state.matchActiveLeft = (state.matchActiveLeft === li) ? -1 : li;
      }
      checkMatchComplete();
      refreshMatchUI(lefts, rights);
    });
  });

  // Right chip click → attach to active / first-empty left slot
  rightPool.querySelectorAll('.match-right-chip').forEach(el => {
    el.addEventListener('click', () => {
      if (state.hasAnswered) return;
      Sounds.click();
      const ri = parseInt(el.dataset.rightIdx);
      let target = state.matchActiveLeft;
      if (target === -1) {
        target = state.matchConnections.indexOf(-1); // first empty
      }
      if (target !== -1) {
        state.matchConnections[target] = ri;
        // Advance to next empty slot
        state.matchActiveLeft = state.matchConnections.indexOf(-1);
      }
      checkMatchComplete();
      refreshMatchUI(lefts, rights);
    });
  });
}

function checkMatchComplete() {
  const allFilled = state.matchConnections.every(v => v !== -1);
  document.getElementById('btn-submit-answer').disabled = !allFilled;
}

// ── Order / Drag-to-Sort (↑↓ buttons to reorder) ──────────────────────
function renderOrder(q) {
  state.orderItemOrder = q.items.map((_, i) => i);

  document.getElementById('player-order-container').style.display = 'block';
  const submit = document.getElementById('btn-submit-answer');
  submit.style.display = 'block';
  submit.disabled      = false;

  refreshOrderUI(q.items);
}

function refreshOrderUI(items) {
  const list = document.getElementById('order-list');
  list.innerHTML = state.orderItemOrder.map((itemIdx, pos) =>
    `<li class="order-item stagger-${Math.min(pos + 1, 4)}" data-pos="${pos}">
      <button class="btn-order-move btn-order-up" data-pos="${pos}" ${pos === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
      <span class="order-label" dir="auto">${escapeHtml(items[itemIdx])}</span>
      <button class="btn-order-move btn-order-dn" data-pos="${pos}" ${pos === state.orderItemOrder.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
    </li>`
  ).join('');

  list.querySelectorAll('.btn-order-up').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.hasAnswered) return;
      Sounds.click();
      const pos = parseInt(btn.dataset.pos);
      if (pos === 0) return;
      [state.orderItemOrder[pos], state.orderItemOrder[pos - 1]] =
        [state.orderItemOrder[pos - 1], state.orderItemOrder[pos]];
      refreshOrderUI(items);
    });
  });

  list.querySelectorAll('.btn-order-dn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.hasAnswered) return;
      Sounds.click();
      const pos = parseInt(btn.dataset.pos);
      if (pos === state.orderItemOrder.length - 1) return;
      [state.orderItemOrder[pos], state.orderItemOrder[pos + 1]] =
        [state.orderItemOrder[pos + 1], state.orderItemOrder[pos]];
      refreshOrderUI(items);
    });
  });
}

// ─────────────────────────────────────────────
// Submit Answer (Player)
// ─────────────────────────────────────────────
function submitAnswer(answer) {
  if (state.hasAnswered) return;
  state.hasAnswered  = true;

  socket.emit('player:answer', { questionIndex: state.questionIndex, answer });

  const type = state.currentQuestionType;

  if (type === 'single') {
    const grid = document.getElementById('player-options-grid');
    grid.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.disabled = true;
      if (i === answer.answerIndex) btn.classList.add('selected');
      else                          btn.classList.add('dimmed');
    });
  } else {
    // multi / match / order — disable the submit button
    const btn = document.getElementById('btn-submit-answer');
    btn.disabled    = true;
    btn.textContent = '✔ تم الإرسال!';
  }

  document.getElementById('player-answered-msg').textContent =
    '✅ تم إرسال إجابتك! انتظر الآخرين…';
}

// ─────────────────────────────────────────────
// Question Result Screen
// ─────────────────────────────────────────────
function showQuestionResult(data) {
  stopClientTimer();
  document.getElementById('overlay-paused').style.display = 'none';

  const labelEl    = document.getElementById('result-correct-label');
  const answerEl   = document.getElementById('result-correct-answer');
  const pairsEl    = document.getElementById('result-pairs-list');
  const resultMsg  = document.getElementById('result-player-score-msg');
  const streakMsg  = document.getElementById('result-streak-msg');

  // Reset
  pairsEl.style.display  = 'none';
  answerEl.style.display = '';

  const type = data.questionType;

  if (type === 'single') {
    labelEl.textContent   = '✅ الإجابة الصحيحة';
    answerEl.textContent  = data.correctOption;

    // Animate options grid
    const grid = document.getElementById('player-options-grid');
    grid.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.disabled = true;
      btn.classList.remove('multi-selected');
      if (i === data.correctIndex) {
        btn.classList.remove('dimmed', 'selected');
        btn.classList.add('reveal-correct');
      } else {
        btn.classList.remove('selected');
        btn.classList.add('reveal-wrong');
      }
    });

  } else if (type === 'multi') {
    labelEl.textContent  = '✅ الإجابات الصحيحة';
    answerEl.textContent = (data.correctOptions || []).join('، ');

    const grid = document.getElementById('player-options-grid');
    grid.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.disabled = true;
      btn.classList.remove('multi-selected');
      if ((data.correctIndices || []).includes(i)) {
        btn.classList.add('reveal-correct');
      } else {
        btn.classList.add('reveal-wrong');
      }
    });

  } else if (type === 'match') {
    labelEl.textContent        = '✅ التطابق الصحيح';
    answerEl.style.display     = 'none';
    pairsEl.style.display      = 'block';
    pairsEl.innerHTML = (data.correctPairs || []).map(p =>
      `<li class="result-pair">
        <span dir="auto">${escapeHtml(p.left)}</span>
        <span class="pair-arrow">→</span>
        <span dir="auto">${escapeHtml(p.right)}</span>
      </li>`
    ).join('');

  } else if (type === 'order') {
    labelEl.textContent    = '✅ الترتيب الصحيح';
    answerEl.style.display = 'none';
    pairsEl.style.display  = 'block';
    pairsEl.innerHTML = (data.correctOrder || []).map((itemIdx, pos) =>
      `<li class="result-pair">
        <span class="result-order-rank">${pos + 1}</span>
        <span dir="auto">${escapeHtml((data.items || [])[itemIdx] || '')}</span>
      </li>`
    ).join('');
  }

  // Score / streak message for player
  const myRound = (data.roundScores || []).find(r => r.id === socket.id);
  if (state.role === 'player' && myRound) {
    state.myStreak = myRound.streak;
    state.myScore  = myRound.totalScore;

    if (myRound.isCorrect) {
      Sounds.correct();
      resultMsg.textContent = `+${myRound.roundScore} pts 🎉`;
      resultMsg.className   = 'result-score-msg correct';
      streakMsg.textContent = myRound.streak >= 2 ? `🔥 ${myRound.streak} على التوالي!` : '';
    } else if (myRound.roundScore > 0) {
      // Partial credit (match / order but not 100%)
      Sounds.correct();
      resultMsg.textContent = `+${myRound.roundScore} pts (جزئي)`;
      resultMsg.className   = 'result-score-msg correct';
      streakMsg.textContent = '';
    } else {
      Sounds.wrong();
      resultMsg.textContent = 'إجابة خاطئة. ٠ نقطة.';
      resultMsg.className   = 'result-score-msg incorrect';
      streakMsg.textContent = '';
    }
  } else {
    resultMsg.textContent = '';
    streakMsg.textContent = '';
  }

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
  socket.emit('host:create', { quizSlug: quizSlugFromUrl || null });
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

// Host Lobby — Mode toggle
document.getElementById('btn-mode-local').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:mode:set', { mode: 'local' });
});

document.getElementById('btn-mode-global').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:mode:set', { mode: 'global' });
});

// Host Start Game
document.getElementById('btn-start-game').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:start');
});

document.getElementById('btn-copy-join-url').addEventListener('click', async () => {
  Sounds.click();
  const btn = document.getElementById('btn-copy-join-url');
  const url = state.currentJoinUrl;
  if (!url) {
    btn.textContent = '⚠️ No URL yet';
    setTimeout(() => { btn.textContent = '📋 Copy Join URL'; }, 1400);
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = '✅ Copied!';
  } catch (_err) {
    const temp = document.createElement('textarea');
    temp.value = url;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
    btn.textContent = '✅ Copied!';
  }
  setTimeout(() => { btn.textContent = '📋 Copy Join URL'; }, 1400);
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

// Pause overlay resume (host only)
document.getElementById('btn-overlay-resume').addEventListener('click', () => {
  if (state.role !== 'host') return;
  Sounds.click();
  socket.emit('host:resume');
});

// Host Skip question
document.getElementById('btn-skip').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:skip');
});

document.getElementById('btn-end-game').addEventListener('click', () => {
  if (state.role !== 'host') return;
  Sounds.click();
  socket.emit('host:end');
});

// Submit answer (multi / match / order)
document.getElementById('btn-submit-answer').addEventListener('click', () => {
  if (state.hasAnswered) return;
  Sounds.click();
  const type = state.currentQuestionType;
  if (type === 'multi') {
    const selected = Array.from(
      document.querySelectorAll('#player-options-grid .multi-selected')
    ).map(el => parseInt(el.dataset.index, 10));
    if (selected.length === 0) return;
    submitAnswer({ answerIndices: selected });
  } else if (type === 'match') {
    submitAnswer({ matches: [...state.matchConnections] });
  } else if (type === 'order') {
    submitAnswer({ order: [...state.orderItemOrder] });
  }
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

document.getElementById('btn-start-new-session').addEventListener('click', () => {
  if (state.role !== 'host') return;
  Sounds.click();
  socket.emit('host:new-session');
});

// Back to Home from Room Closed
document.getElementById('btn-home-from-closed').addEventListener('click', () => {
  location.reload();
});

// ─────────────────────────────────────────────
// Socket.io Event Handlers
// ─────────────────────────────────────────────

/** HOST: Room created successfully */
socket.on('room:created', ({ pin, ...modeInfo }) => {
  state.pin = pin;
  document.getElementById('host-pin').textContent = pin;
  document.getElementById('host-player-count').textContent = '0';
  document.getElementById('host-player-list').innerHTML = '';

  applyModeInfo(modeInfo);
  showView('view-host-lobby');
});

/** HOST: Mode updated (local/global) */
socket.on('room:mode', (modeInfo) => {
  applyModeInfo(modeInfo);
});

socket.on('connect', () => {
  setConnectionStatus('ok', 'Server connected');
});

socket.on('connect_error', () => {
  setConnectionStatus('error', 'Cannot reach server. Check LAN / local mode IP.');
});

socket.on('disconnect', () => {
  setConnectionStatus('warn', 'Connection lost. Reconnecting…');
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
  const overlay = document.getElementById('overlay-paused');
  const overlayBtn = document.getElementById('btn-overlay-resume');
  if (state.role === 'host') {
    overlay.style.display = 'none';
    overlayBtn.style.display = 'none';
  } else {
    overlay.style.display = 'flex';
    overlayBtn.style.display = 'none';
  }
});

/** BOTH: Game resumed */
socket.on('game:resumed', ({ timeRemaining }) => {
  state.isPaused = false;
  Sounds.resume();
  document.getElementById('overlay-paused').style.display = 'none';
  document.getElementById('btn-overlay-resume').style.display = 'none';
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
  const newSessionBtn = document.getElementById('btn-start-new-session');
  newSessionBtn.style.display = state.role === 'host' ? 'block' : 'none';
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

socket.on('room:reset', ({ players, modeInfo }) => {
  stopClientTimer();
  state.isPaused = false;
  state.questionIndex = 0;
  state.totalQuestions = 0;
  state.myStreak = 0;
  document.getElementById('overlay-paused').style.display = 'none';

  if (state.role === 'host') {
    if (modeInfo) applyModeInfo(modeInfo);
    renderPlayerList(
      players || [],
      document.getElementById('host-player-list'),
      document.getElementById('host-player-count'),
      true
    );
    const startBtn = document.getElementById('btn-start-game');
    startBtn.disabled = !(players && players.length > 0);
    document.getElementById('lobby-hint').textContent =
      players && players.length > 0 ? `${players.length} player(s) ready.` : 'Waiting for at least 1 player…';
    showView('view-host-lobby');
  } else {
    renderPlayerList(
      players || [],
      document.getElementById('player-player-list'),
      document.getElementById('player-player-count')
    );
    showView('view-player-lobby');
  }
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
  const scanFallbackBanner = document.getElementById('scan-fallback-banner');

  if (scanFallbackBanner) {
    scanFallbackBanner.style.display = 'block';
  }

  if (pinFromUrl) {
    state.role = 'player';
    document.getElementById('input-pin').value = pinFromUrl;
    if (scanFallbackBanner) {
      scanFallbackBanner.innerHTML =
        `<strong>Scanned successfully.</strong><span>PIN <b>${escapeHtml(pinFromUrl)}</b> was filled automatically. If auto-join fails, tap Join Game manually.</span>`;
    }
    showView('view-player-join');
  }
})();
