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
// Session Persistence (reconnect support)
// ─────────────────────────────────────────────
function getOrCreatePlayerId() {
  let id = localStorage.getItem('quizPlayerId');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('quizPlayerId', id);
  }
  return id;
}
const myPlayerId = getOrCreatePlayerId();

function saveGameSession(pin, nickname, avatar) {
  localStorage.setItem('quizSession', JSON.stringify({ pin, nickname, avatar, playerId: myPlayerId }));
}
function clearGameSession() {
  localStorage.removeItem('quizSession');
}

let rejoinAttempt = false; // true while an auto-rejoin is in flight

// ─────────────────────────────────────────────
// Predefined Avatar Set
// ─────────────────────────────────────────────
const AVATARS = ['🦁','🐯','🦊','🐼','🐨','🐸','🦄','🦖','🦝','🕺','🤖','👾','🎃','🧙','🦸','🐇','⚡','🔥','🎮','🏆'];

// If a quiz slug is in the URL, show ID immediately then fetch title
// Update both the home banner and the player-join banner
if (quizSlugFromUrl) {
  const el = document.getElementById('quiz-title-banner');
  const el2 = document.getElementById('join-quiz-title-banner');
  const setText = (text) => {
    if (el)  { el.textContent = text; el.style.display = 'block'; }
    // intentionally not shown on player join screen
  };
  setText(`🆔 ${quizSlugFromUrl}`);
  fetch(`/api/quiz-info/${encodeURIComponent(quizSlugFromUrl)}`)
    .then((r) => r.ok ? r.json() : null)
    .then((data) => {
      if (!data) return;
      setText(`📋 ${data.title}`);
    })
    .catch(() => {});
}

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
  matchLefts: [],          // left-side labels (sent by server)
  matchRights: [],         // shuffled right labels sent by server
  orderItemOrder: [],      // current order of item indices on screen
  orderItems: [],          // original item labels for order question
  currentJoinUrl: '',
  currentBoss: null,
  myRole: null,
  roleInfo: null,
  questionPlayers: [],
  roleAbilityUsed: false,
  isFrozen: false,
  currentDifficulty: 'classic',  // 'easy' | 'classic' | 'hard'
  avatar: '🎮',  // selected avatar emoji
  hostIsPlayer: false,       // experimental: host joined as a player too
};

let scholarPreviewInterval = null;
let frozenTimeout = null;

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

  const activeView = document.getElementById(viewId);
  const attribution = document.querySelector('.tooryan-attribution');
  if (activeView && attribution && attribution.parentElement !== activeView) {
    activeView.appendChild(attribution);
  }
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
            <span class="avatar-circle">${p.avatar || '🎮'}</span>
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
      .map((p) => `<li class="player-chip"><span class="avatar-circle">${p.avatar || '🎮'}</span>${escapeHtml(p.nickname)}</li>`)
      .join('');
  }
}

// ─────────────────────────────────────────────
// Avatar Picker Modal
// ─────────────────────────────────────────────
function openAvatarPicker(currentAvatar, onSelect) {
  const modal = document.getElementById('avatar-picker-modal');
  const grid  = document.getElementById('modal-avatar-grid');

  grid.innerHTML = AVATARS.map((a) =>
    `<button type="button" class="avatar-option${a === currentAvatar ? ' selected' : ''}" data-avatar="${a}">${a}</button>`
  ).join('');

  grid.querySelectorAll('.avatar-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      onSelect(btn.dataset.avatar);
      modal.style.display = 'none';
    });
  });

  modal.style.display = 'flex';
}

// Close modal via × button or clicking the backdrop
document.getElementById('btn-close-avatar-picker').addEventListener('click', () => {
  document.getElementById('avatar-picker-modal').style.display = 'none';
});
document.getElementById('avatar-picker-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
});

// Join form — avatar trigger
document.getElementById('join-avatar-btn').addEventListener('click', () => {
  openAvatarPicker(state.avatar, (a) => {
    state.avatar = a;
    document.getElementById('join-avatar-display').textContent = a;
    const lbl = document.querySelector('#join-avatar-btn .avatar-trigger-label');
    if (lbl) lbl.textContent = 'Avatar selected ✓';
  });
});


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

  // Populate share URL bar
  const shareInput = document.getElementById('share-url-input');
  if (shareInput && joinUrl) {
    shareInput.value = joinUrl;
    const msg = encodeURIComponent(`Join my quiz game! 🎮 Click here to play: ${joinUrl}`);
    const wa = document.getElementById('share-whatsapp');
    const tg = document.getElementById('share-telegram');
    const tw = document.getElementById('share-twitter');
    if (wa) wa.href = `https://wa.me/?text=${msg}`;
    if (tg) tg.href = `https://t.me/share/url?url=${encodeURIComponent(joinUrl)}&text=${encodeURIComponent('Join my quiz game! 🎮')}`;
    if (tw) tw.href = `https://x.com/intent/tweet?text=${msg}`;
  }
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
// Keep Screen Awake (Wake Lock API)
// ─────────────────────────────────────────────
let wakeLockSentinel = null;
let wakeLockEnabled = false;

async function requestScreenWakeLock() {
  if (!wakeLockEnabled) return;
  if (!('wakeLock' in navigator)) return;
  try {
    if (wakeLockSentinel) return;
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
      if (wakeLockEnabled && !document.hidden) {
        requestScreenWakeLock();
      }
    });
  } catch (_err) {
    // Unsupported / denied / non-secure context — ignore silently.
  }
}

function enableKeepAwake() {
  wakeLockEnabled = true;
  requestScreenWakeLock();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    requestScreenWakeLock();
  }
});

// ─────────────────────────────────────────────
// Question Rendering — dispatcher
// ─────────────────────────────────────────────
function renderQuestion(data, isHost) {
  clearScholarPreviewInterval();
  stopClientTimer();
  state.hasAnswered       = false;
  state.myAnswerIndex     = -1;
  state.questionIndex     = data.questionIndex;
  state.totalQuestions    = data.total;
  state.questionDuration  = data.duration;
  state.questionStartTime = Date.now();
  state.currentQuestionType = data.question.type;
  state.questionPlayers = data.players || [];
  state.roleAbilityUsed = false;
  setFrozenState(false);

  if (isHost) {
    renderHostQuestion(data);
  } else {
    renderPlayerQuestion(data);
  }
}

// ── Shared: inject media element into a question-text-box ──────────────
function renderQuestionMedia(media, textElemId) {
  const textEl = document.getElementById(textElemId);
  if (!textEl) return;
  const box = textEl.parentElement;
  const existing = box.querySelector('.question-media');
  if (existing) existing.remove();
  if (!media || !media.url || media.type === 'none') return;
  let el;
  if (media.type === 'video') {
    el = document.createElement('video');
    el.src = media.url;
    el.controls = true;
    el.autoplay = true;
    el.muted = true;
    el.loop = false;
    el.playsInline = true;
  } else {
    el = document.createElement('img');
    el.src = media.url;
    el.alt = '';
    el.onerror = function() {
      this.onerror = null;
      this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='160' viewBox='0 0 320 160'%3E%3Crect width='320' height='160' fill='%231e293b'/%3E%3Ctext x='50%25' y='44%25' font-family='sans-serif' font-size='28' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%96%BC%EF%B8%8F%3C/text%3E%3Ctext x='50%25' y='68%25' font-family='sans-serif' font-size='12' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'%3EImage unavailable%3C/text%3E%3C/svg%3E";
      this.style.opacity = '0.5';
    };
  }
  el.className = 'question-media';
  box.appendChild(el);
}

// ── Clear media from both host and player question boxes ──────────────
function clearQuestionMedia() {
  ['host-question-text', 'player-question-text'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const box = el.parentElement;
    const m = box && box.querySelector('.question-media');
    if (m) m.remove();
  });
}

// ── Host view: shows question + non-interactive options/items ──────────
function renderHostQuestion(data) {
  const q = data.question;
  document.getElementById('host-q-progress').textContent =
    `Q ${data.questionIndex + 1} / ${data.total}`;
  document.getElementById('host-question-text').textContent = q.text;
  renderQuestionMedia(q.media || null, 'host-question-text');
  document.getElementById('host-answer-counter').textContent = '0 / 0 answered';

  const pauseBtn = document.getElementById('btn-pause-resume');
  pauseBtn.textContent = '⏸️ Pause';
  pauseBtn.dataset.paused = 'false';

  const grid = document.getElementById('host-options-grid');
  const hostBossPanel = document.getElementById('host-boss-panel');
  hostBossPanel.style.display = 'none';

  if (q.type === 'single' || q.type === 'multi') {
    grid.innerHTML = (q.options || []).map((opt, i) =>
      `<div class="option-card ${OPTION_COLORS[i]} stagger-${i + 1}">
        <span class="opt-icon">${OPTION_ICONS[i]}</span>
        <span class="opt-text">${escapeHtml(opt)}</span>
      </div>`
    ).join('');
  } else if (q.type === 'type') {
    grid.innerHTML =
      `<div class="host-type-preview">
        <span class="host-type-label">Type Sprint</span>
        <span class="host-type-hint">Players submit a typed answer</span>
      </div>`;
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
  } else if (q.type === 'boss') {
    grid.innerHTML = (q.options || []).map((opt, i) =>
      `<div class="option-card ${OPTION_COLORS[i]} stagger-${i + 1}">
        <span class="opt-icon">${OPTION_ICONS[i]}</span>
        <span class="opt-text">${escapeHtml(opt)}</span>
      </div>`
    ).join('');
    state.currentBoss = q.boss || null;
    updateBossPanel('host', q.boss || null);
    hostBossPanel.style.display = 'block';
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
  renderQuestionMedia(q.media || null, 'player-question-text');
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
  const typeCont  = document.getElementById('player-type-container');
  const bossPanel = document.getElementById('player-boss-panel');
  const matchCont = document.getElementById('player-match-container');
  const orderCont = document.getElementById('player-order-container');
  const submitBtn = document.getElementById('btn-submit-answer');
  optGrid.style.display   = '';
  typeCont.style.display  = 'none';
  bossPanel.style.display = 'none';
  matchCont.style.display = 'none';
  orderCont.style.display = 'none';
  submitBtn.style.display = 'none';
  submitBtn.disabled      = false;
  submitBtn.textContent   = '✔ تأكيد الإجابة';

  renderRolePanel(data.players || state.questionPlayers || []);

  if (q.type === 'single') {
    renderSingleChoice(q);
  } else if (q.type === 'type') {
    optGrid.style.display = 'none';
    renderTypeSprint(q);
  } else if (q.type === 'multi') {
    renderMultiChoice(q);
  } else if (q.type === 'match') {
    optGrid.style.display = 'none';
    renderMatch(q);
  } else if (q.type === 'order') {
    optGrid.style.display = 'none';
    renderOrder(q);
  } else if (q.type === 'boss') {
    renderBossQuestion(q);
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

function renderTypeSprint(q) {
  const typeCont = document.getElementById('player-type-container');
  const input = document.getElementById('player-type-input');
  const submit = document.getElementById('btn-submit-answer');

  typeCont.style.display = 'block';
  submit.style.display = 'block';
  submit.disabled = true;

  input.value = '';
  input.placeholder = q.inputPlaceholder || 'Type your answer';
  input.disabled = false;

  input.oninput = () => {
    submit.disabled = input.value.trim().length === 0 || state.hasAnswered;
  };
}

function renderBossQuestion(q) {
  renderSingleChoice(q);
  state.currentBoss = q.boss || null;
  updateBossPanel('player', q.boss || null);
  document.getElementById('player-boss-panel').style.display = 'block';
}

function updateBossPanel(prefix, boss) {
  const nameEl = document.getElementById(`${prefix}-boss-name`);
  const hpEl = document.getElementById(`${prefix}-boss-hp`);
  const fillEl = document.getElementById(`${prefix}-boss-bar-fill`);
  if (!nameEl || !hpEl || !fillEl || !boss) return;

  const maxHp = Math.max(1, Number(boss.maxHp) || 100);
  const remainingHp = Math.max(0, Number(boss.remainingHp) || 0);
  const pct = Math.max(0, Math.min(100, Math.round((remainingHp / maxHp) * 100)));

  nameEl.textContent = boss.name || 'Tooryan Boss';
  hpEl.textContent = `${remainingHp} / ${maxHp}`;
  fillEl.style.width = `${pct}%`;
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
      if (state.hasAnswered || state.isFrozen) return;
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
      if (state.hasAnswered || state.isFrozen) return;
      Sounds.click();
      btn.classList.toggle('multi-selected');
      const anySelected = grid.querySelectorAll('.multi-selected').length > 0;
      submit.disabled = !anySelected;
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  Shared pointer-based drag-and-drop state
// ═══════════════════════════════════════════════════════════
let _drag = null;
function _removeDragGhost() { document.getElementById('__dgh')?.remove(); }
function _dropzoneAt(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el.dataset && el.dataset.dropzone !== undefined) return el;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
//  Match / Connect — drag-and-drop
// ═══════════════════════════════════════════════════════════
function renderMatch(q) {
  state.matchConnections = new Array(q.lefts.length).fill(-1);
  state.matchLefts       = q.lefts;
  state.matchRights      = q.rights;

  document.getElementById('player-match-container').style.display = 'block';
  const submit = document.getElementById('btn-submit-answer');
  submit.style.display = 'block';
  submit.disabled      = true;

  buildMatchUI();
}

function buildMatchUI() {
  if (state.hasAnswered) return;
  const lefts  = state.matchLefts;
  const rights = state.matchRights;
  const placed = new Set(state.matchConnections.filter(v => v !== -1));
  const container = document.getElementById('player-match-container');

  container.innerHTML = `
    <div class="match-dnd-layout">
      <div class="match-dnd-slots">
        ${lefts.map((l, i) => {
          const ri     = state.matchConnections[i];
          const filled = ri !== -1;
          const col    = OPTION_COLORS[i % OPTION_COLORS.length];
          return `<div class="match-dnd-row">
            <div class="match-dnd-label">${escapeHtml(l)}</div>
            <div class="match-dropzone ${filled ? 'match-dz-filled ' + col : 'match-dz-empty'}" data-dropzone="${i}">
              ${filled
                ? `<span class="match-chip in-slot ${col}" data-chip-idx="${ri}" data-in-slot="${i}">${escapeHtml(rights[ri])}</span>`
                : `<span class="match-drop-hint">drop here</span>`}
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="match-dnd-pool">
        <span class="match-pool-label">Drag to match</span>
        ${rights.map((r, i) => {
          if (placed.has(i)) return '';
          return `<span class="match-chip in-pool opt-violet" data-chip-idx="${i}" data-in-slot="-1">${escapeHtml(r)}</span>`;
        }).join('')}
      </div>
    </div>`;

  container.querySelectorAll('.match-chip').forEach(chip => {
    chip.addEventListener('pointerdown', _matchChipPointerDown);
  });
  checkMatchComplete();
}

function _matchChipPointerDown(e) {
  if (state.hasAnswered || state.isFrozen) return;
  e.preventDefault();
  const chip    = e.currentTarget;
  const chipIdx  = parseInt(chip.dataset.chipIdx);
  const fromSlot = parseInt(chip.dataset.inSlot);  // -1 = in pool
  const rect     = chip.getBoundingClientRect();

  const ghost = document.createElement('span');
  ghost.id        = '__dgh';
  ghost.className = 'match-chip match-drag-ghost';
  ghost.textContent = chip.textContent;
  ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;
    width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;
    opacity:0.9;transform:scale(1.1) rotate(-2deg);`;
  document.body.appendChild(ghost);
  chip.style.opacity = '0.2';

  _drag = { type:'match', chipIdx, fromSlot, sourceEl:chip, ghost,
            offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };

  document.addEventListener('pointermove', _matchDragMove);
  document.addEventListener('pointerup',   _matchDragEnd, { once: true });
}

function _matchDragMove(e) {
  if (!_drag || _drag.type !== 'match') return;
  _drag.ghost.style.left = (e.clientX - _drag.offsetX) + 'px';
  _drag.ghost.style.top  = (e.clientY - _drag.offsetY) + 'px';
  document.querySelectorAll('.match-dropzone').forEach(dz => dz.classList.remove('match-dz-hover'));
  const dz = _dropzoneAt(e.clientX, e.clientY);
  if (dz) dz.classList.add('match-dz-hover');
}

function _matchDragEnd(e) {
  document.removeEventListener('pointermove', _matchDragMove);
  if (!_drag || _drag.type !== 'match') { _drag = null; return; }
  _removeDragGhost();
  document.querySelectorAll('.match-dropzone').forEach(dz => dz.classList.remove('match-dz-hover'));

  const dz = _dropzoneAt(e.clientX, e.clientY);
  if (dz) {
    const toSlot  = parseInt(dz.dataset.dropzone);
    const existed = state.matchConnections[toSlot];
    state.matchConnections[toSlot] = _drag.chipIdx;
    if (_drag.fromSlot !== -1) {
      // Chip came from another slot — swap the displaced chip back
      state.matchConnections[_drag.fromSlot] = (existed !== -1) ? existed : -1;
    }
    Sounds.click();
  } else {
    // Dropped outside any zone — return chip to pool
    if (_drag.fromSlot !== -1) state.matchConnections[_drag.fromSlot] = -1;
  }
  _drag = null;
  buildMatchUI();
}

function checkMatchComplete() {
  const allFilled = state.matchConnections.every(v => v !== -1);
  document.getElementById('btn-submit-answer').disabled = !allFilled;
}

// ═══════════════════════════════════════════════════════════
//  Order / Sort — drag-and-drop
// ═══════════════════════════════════════════════════════════
function renderOrder(q) {
  state.orderItemOrder = q.items.map((_, i) => i);
  state.orderItems     = q.items;

  document.getElementById('player-order-container').style.display = 'block';
  const submit = document.getElementById('btn-submit-answer');
  submit.style.display = 'block';
  submit.disabled      = false;

  buildOrderUI();
}

function buildOrderUI() {
  if (state.hasAnswered) return;
  const items = state.orderItems;
  const list  = document.getElementById('order-list');
  list.innerHTML = state.orderItemOrder.map((itemIdx, pos) =>
    `<li class="order-item stagger-${Math.min(pos+1,4)}" data-pos="${pos}">
      <span class="order-drag-handle" aria-hidden="true">⠿</span>
      <span class="order-label" dir="auto">${escapeHtml(items[itemIdx])}</span>
    </li>`
  ).join('');

  list.querySelectorAll('.order-item').forEach(item => {
    item.addEventListener('pointerdown', _orderItemPointerDown);
  });
}

function _orderItemPointerDown(e) {
  if (state.hasAnswered || state.isFrozen) return;
  e.preventDefault();
  const item    = e.currentTarget;
  const fromPos = parseInt(item.dataset.pos);
  const rect    = item.getBoundingClientRect();

  const ghost = document.createElement('li');
  ghost.id        = '__dgh';
  ghost.className = 'order-item order-drag-ghost';
  ghost.innerHTML = item.innerHTML;
  ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;
    width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;
    opacity:0.9;transform:rotate(-1.5deg) scale(1.03);`;
  document.body.appendChild(ghost);
  item.classList.add('order-dragging-source');

  // Drop indicator line
  const ind = document.createElement('li');
  ind.id        = '__ord_ind';
  ind.className = 'order-insert-indicator';
  document.getElementById('order-list').appendChild(ind);

  _drag = { type:'order', fromPos, sourceEl:item, ghost,
            offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
            insertAt: fromPos };

  document.addEventListener('pointermove', _orderDragMove);
  document.addEventListener('pointerup',   _orderDragEnd, { once: true });
}

function _orderDragMove(e) {
  if (!_drag || _drag.type !== 'order') return;
  _drag.ghost.style.left = (e.clientX - _drag.offsetX) + 'px';
  _drag.ghost.style.top  = (e.clientY - _drag.offsetY) + 'px';

  const list  = document.getElementById('order-list');
  const items = [...list.querySelectorAll('.order-item:not(.order-dragging-source)')];
  const ind   = document.getElementById('__ord_ind');
  if (!ind) return;

  let insertAt = state.orderItemOrder.length;
  for (const it of items) {
    const r = it.getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) {
      insertAt = parseInt(it.dataset.pos);
      break;
    }
  }
  // Compensate for the removed source item
  _drag.insertAt = insertAt;
  const target = items.find(it => parseInt(it.dataset.pos) >= insertAt);
  if (target) list.insertBefore(ind, target);
  else        list.appendChild(ind);
}

function _orderDragEnd() {
  document.removeEventListener('pointermove', _orderDragMove);
  if (!_drag || _drag.type !== 'order') { _drag = null; return; }
  const fromPos  = _drag.fromPos;
  const insertAt = _drag.insertAt;
  _removeDragGhost();
  document.getElementById('__ord_ind')?.remove();
  _drag = null;

  const arr = [...state.orderItemOrder];
  const [moved] = arr.splice(fromPos, 1);
  const target  = Math.min(Math.max(insertAt > fromPos ? insertAt - 1 : insertAt, 0), arr.length);
  arr.splice(target, 0, moved);
  state.orderItemOrder = arr;
  Sounds.click();
  buildOrderUI();
}

// ─────────────────────────────────────────────
// Submit Answer (Player)
// ─────────────────────────────────────────────
function submitAnswer(answer) {
  if (state.hasAnswered || state.isFrozen) return;
  state.hasAnswered  = true;

  socket.emit('player:answer', { questionIndex: state.questionIndex, answer });

  const type = state.currentQuestionType;

  if (type === 'single' || type === 'boss') {
    const grid = document.getElementById('player-options-grid');
    grid.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.disabled = true;
      if (i === answer.answerIndex) btn.classList.add('selected');
      else                          btn.classList.add('dimmed');
    });
  } else if (type === 'type') {
    const input = document.getElementById('player-type-input');
    input.disabled = true;
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
  let bossStatusText = '';

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

  } else if (type === 'type') {
    labelEl.textContent  = '✅ الإجابات المقبولة';
    answerEl.textContent = (data.acceptedAnswers || []).join('، ');

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
  } else if (type === 'boss') {
    labelEl.textContent  = '⚔️ Boss Battle Result';
    answerEl.textContent = `${data.correctOption || ''}`;

    if (data.boss) {
      bossStatusText = data.boss.defeated
        ? `💥 ${data.boss.name} defeated!`
        : `🛡️ ${data.boss.name} survived with ${data.boss.remainingHp}/${data.boss.maxHp} HP`;
      resultMsg.textContent = `${bossStatusText} • Team Damage: ${data.boss.totalDamage}`;
      resultMsg.className = `result-score-msg ${data.boss.defeated ? 'correct' : 'incorrect'}`;
    }
  }

  // Score / streak message for player
  const myRound = (data.roundScores || []).find(r => r.id === socket.id);
  if (state.role === 'player' && myRound) {
    state.myStreak = myRound.streak;
    state.myScore  = myRound.totalScore;
    updatePlayerScoreUI();

    if (myRound.isCorrect) {
      Sounds.correct();
      resultMsg.textContent = `+${myRound.roundScore} pts 🎉`;
      resultMsg.className   = 'result-score-msg correct';
      streakMsg.textContent = myRound.streak >= 2 ? `🔥 ${myRound.streak} على التوالي!` : '';
      if (bossStatusText) {
        streakMsg.textContent = `${streakMsg.textContent ? `${streakMsg.textContent} • ` : ''}${bossStatusText}`;
      }
    } else if (myRound.roundScore > 0) {
      // Partial credit (match / order but not 100%)
      Sounds.correct();
      resultMsg.textContent = `+${myRound.roundScore} pts (جزئي)`;
      resultMsg.className   = 'result-score-msg correct';
      streakMsg.textContent = bossStatusText;
    } else {
      Sounds.wrong();
      resultMsg.textContent = 'إجابة خاطئة. ٠ نقطة.';
      resultMsg.className   = 'result-score-msg incorrect';
      streakMsg.textContent = bossStatusText;
    }

    if (myRound.penalty > 0) {
      resultMsg.textContent = `${resultMsg.textContent} (−${myRound.penalty} penalty)`;
    }

    if (data.boss?.teamBonus) {
      streakMsg.textContent = `${streakMsg.textContent ? `${streakMsg.textContent} • ` : ''}🎁 Team bonus +${data.boss.teamBonus}`;
    }
  } else {
    resultMsg.textContent = '';
    streakMsg.textContent = bossStatusText;
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

  // Clear previous question's media so it doesn't show behind the next question hint
  clearQuestionMedia();

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

function updatePlayerScoreUI() {
  const scoreEl = document.getElementById('player-score-count');
  if (scoreEl) scoreEl.textContent = String(state.myScore || 0);
}

function roleDisplayName(role) {
  if (role === 'scholar') return '📘 Scholar';
  if (role === 'shield') return '🛡️ Shield';
  if (role === 'saboteur') return '❄️ Saboteur';
  return 'Player';
}

function difficultyDisplay(preset) {
  if (preset === 'easy') return '🟢 Easy';
  if (preset === 'hard') return '🔴 Hard';
  return '🟡 Classic';
}

function difficultyTag(preset) {
  if (preset === 'easy') return 'Easy';
  if (preset === 'hard') return 'Hard';
  return 'Classic';
}

function updateDifficultyDisplay() {
  const display = difficultyDisplay(state.currentDifficulty);
  const tag = difficultyTag(state.currentDifficulty);
  
  // Update lobby displays
  const hostLobbyDiff = document.getElementById('host-lobby-difficulty');
  if (hostLobbyDiff) hostLobbyDiff.textContent = display;
  
  const playerLobbyDiff = document.getElementById('player-lobby-difficulty');
  if (playerLobbyDiff) playerLobbyDiff.textContent = display;
  
  // Update question headers
  const hostQDiff = document.getElementById('host-q-difficulty');
  if (hostQDiff) hostQDiff.textContent = tag;
  
  const playerQDiff = document.getElementById('player-q-difficulty');
  if (playerQDiff) playerQDiff.textContent = tag;
}

function setFrozenState(active, message) {
  state.isFrozen = active;
  const overlay = document.getElementById('overlay-frozen');
  const msgEl = document.getElementById('frozen-msg');
  if (msgEl && message) msgEl.textContent = message;
  overlay.style.display = active ? 'flex' : 'none';
}

function clearScholarPreviewInterval() {
  if (scholarPreviewInterval) {
    clearInterval(scholarPreviewInterval);
    scholarPreviewInterval = null;
  }
}

function showScholarPreview(data) {
  clearScholarPreviewInterval();
  const q = data.question;
  let left = Number(data.previewSeconds) || 3;

  state.currentQuestionType = q.type;
  document.getElementById('player-q-progress').textContent =
    `Q ${data.questionIndex + 1} / ${data.total}`;
  document.getElementById('player-question-text').textContent = q.text;
  document.getElementById('player-options-grid').style.display = 'none';
  document.getElementById('player-type-container').style.display = 'none';
  document.getElementById('player-match-container').style.display = 'none';
  document.getElementById('player-order-container').style.display = 'none';
  document.getElementById('player-boss-panel').style.display = 'none';
  document.getElementById('btn-submit-answer').style.display = 'none';
  document.getElementById('player-answered-msg').textContent = `📘 Scholar preview: answers open in ${left}s`;
  showView('view-player-question');

  scholarPreviewInterval = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearScholarPreviewInterval();
      return;
    }
    document.getElementById('player-answered-msg').textContent = `📘 Scholar preview: answers open in ${left}s`;
  }, 1000);
}

function renderRolePanel(players = []) {
  const badge = document.getElementById('player-role-badge');
  const panel = document.getElementById('player-role-panel');
  const title = document.getElementById('player-role-panel-title');
  const hint = document.getElementById('player-role-hint');
  const select = document.getElementById('role-target-select');
  const actionBtn = document.getElementById('btn-role-action');

  if (!state.myRole) {
    badge.style.display = 'none';
    panel.style.display = 'none';
    return;
  }

  badge.style.display = 'inline-flex';
  badge.textContent = roleDisplayName(state.myRole);

  const targets = players.filter((p) => p.id !== socket.id);

  if (state.myRole === 'scholar') {
    panel.style.display = 'block';
    title.textContent = 'Scholar passive ability';
    hint.textContent = `You see each question ${state.roleInfo?.scholarPreviewSeconds || 3}s early.`;
    select.style.display = 'none';
    actionBtn.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  select.style.display = '';
  actionBtn.style.display = '';
  actionBtn.disabled = state.roleAbilityUsed || targets.length === 0;

  if (state.myRole === 'shield') {
    title.textContent = 'Shield ability';
    hint.textContent = `Protect one teammate from -${state.roleInfo?.wrongPenalty || 80} penalty this question.`;
  } else {
    title.textContent = 'Saboteur ability';
    hint.textContent = `Freeze one player for ${state.roleInfo?.saboteurFreezeSeconds || 2}s.`;
  }

  select.innerHTML = targets
    .map((p) => `<option value="${p.id}">${escapeHtml(p.nickname)}</option>`)
    .join('');
}

// ─────────────────────────────────────────────
// UI Event Listeners
// ─────────────────────────────────────────────

// Home — Become Host
document.getElementById('btn-become-host').addEventListener('click', () => {
  enableKeepAwake();
  Sounds.click();
  state.role = 'host';
  socket.emit('host:create', { quizSlug: quizSlugFromUrl || null });
});

// Home — Become Player
document.getElementById('btn-become-player').addEventListener('click', () => {
  enableKeepAwake();
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
  enableKeepAwake();
  const pin = document.getElementById('input-pin').value.trim();
  const nickname = document.getElementById('input-nickname').value.trim();
  if (!pin || !nickname) return;
  Sounds.click();
  state.pin = pin;
  state.nickname = nickname;
  socket.emit('player:join', { pin, nickname, avatar: state.avatar, playerId: myPlayerId });
});

// Player Lobby — Edit Profile toggle
document.getElementById('btn-edit-profile').addEventListener('click', () => {
  const panel = document.getElementById('edit-profile-panel');
  panel.classList.toggle('open');
});

// Player Lobby — Save profile (nickname change)
document.getElementById('btn-save-profile').addEventListener('click', () => {
  const newNick = document.getElementById('edit-nickname-input').value.trim();
  const errEl = document.getElementById('edit-profile-error');
  if (!newNick) {
    if (errEl) errEl.textContent = 'Nickname cannot be empty.';
    return;
  }
  if (errEl) errEl.textContent = '';
  Sounds.click();
  socket.emit('player:update_profile', { nickname: newNick, avatar: state.avatar });
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

// Host Lobby — mode toggle
document.getElementById('btn-mode-local').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:mode:set', { mode: 'local' });
});

document.getElementById('btn-mode-global').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:mode:set', { mode: 'global' });
});

// Host Lobby — Share copy button
document.getElementById('btn-share-copy').addEventListener('click', async () => {
  const url = state.currentJoinUrl;
  if (!url) return;
  Sounds.click();
  const btn = document.getElementById('btn-share-copy');
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg> Copy';
      btn.classList.remove('copied');
    }, 2000);
  } catch {
    prompt('Copy this link:', url);
  }
});

// Host-as-Player toggle
const chkHostAsPlayer = document.getElementById('chk-host-as-player');
const hostPlayerForm  = document.getElementById('host-player-form');
if (chkHostAsPlayer) {
  chkHostAsPlayer.addEventListener('change', () => {
    if (hostPlayerForm) {
      hostPlayerForm.style.display = chkHostAsPlayer.checked ? 'flex' : 'none';
    }
    if (!chkHostAsPlayer.checked && state.hostIsPlayer) {
      // Toggle off — ask server to remove us
      socket.emit('host:join_as_player', { nickname: '' });
    }
  });
}

document.getElementById('btn-host-join-as-player')?.addEventListener('click', () => {
  const nickname = document.getElementById('host-player-nickname')?.value.trim();
  if (!nickname) {
    const st = document.getElementById('host-as-player-status');
    if (st) st.textContent = '\u26a0\ufe0f Please enter a nickname.';
    return;
  }
  Sounds.click();
  socket.emit('host:join_as_player', { nickname, avatar: state.avatar });
});

// Host Start Game
document.getElementById('btn-start-game').addEventListener('click', () => {
  enableKeepAwake();
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
  if (state.hasAnswered || state.isFrozen) return;
  Sounds.click();
  const type = state.currentQuestionType;
  if (type === 'type') {
    const input = document.getElementById('player-type-input');
    const value = input.value.trim();
    if (!value) return;
    submitAnswer({ textAnswer: value });
  } else if (type === 'multi') {
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

document.getElementById('btn-role-action').addEventListener('click', () => {
  if (state.isFrozen || state.roleAbilityUsed) return;
  const targetId = document.getElementById('role-target-select').value;
  if (!targetId) return;

  if (state.myRole === 'shield') {
    socket.emit('role:shield', { targetId });
  } else if (state.myRole === 'saboteur') {
    socket.emit('role:saboteur', { targetId });
  }

  state.roleAbilityUsed = true;
  renderRolePanel(state.questionPlayers || []);
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
socket.on('room:joined', ({ pin, nickname, avatar, players }) => {
  state.pin = pin;
  state.nickname = nickname;
  state.avatar = avatar || '🎮';
  state.myScore = 0;
  updatePlayerScoreUI();
  document.getElementById('player-room-pin').textContent = pin;

  // Save session for potential reconnect
  saveGameSession(pin, nickname, avatar || '🎮');

  // Pre-fill edit form
  const editNickEl = document.getElementById('edit-nickname-input');
  if (editNickEl) editNickEl.value = nickname;

  // Wire lobby avatar trigger button
  const lobbyBtn = document.getElementById('lobby-avatar-btn');
  const lobbyDisplayEl = document.getElementById('lobby-avatar-display');
  if (lobbyDisplayEl) lobbyDisplayEl.textContent = state.avatar;
  if (lobbyBtn) {
    lobbyBtn.onclick = () => {
      openAvatarPicker(state.avatar, (a) => {
        state.avatar = a;
        if (lobbyDisplayEl) lobbyDisplayEl.textContent = a;
        socket.emit('player:update_profile', { nickname: state.nickname, avatar: a });
      });
    };
  }

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

/** PLAYER: Rejoined a game in progress after disconnection */
socket.on('room:rejoined', ({ pin, nickname, avatar, players, score, streak, roomState, role, questionData, leaderboard }) => {
  rejoinAttempt = false;

  state.pin = pin;
  state.nickname = nickname;
  state.avatar = avatar || '🎮';
  state.role = 'player';
  state.myScore = score || 0;
  state.myStreak = streak || 0;
  updatePlayerScoreUI();

  if (role === 'scholar') state.myRole = 'scholar';
  else if (role === 'shield') state.myRole = 'shield';
  else if (role === 'saboteur') state.myRole = 'saboteur';
  else state.myRole = null;

  renderPlayerList(
    players,
    document.getElementById('player-player-list'),
    document.getElementById('player-player-count')
  );

  setConnectionStatus('ok', 'Reconnected ✓');

  if (roomState === 'lobby') {
    showView('view-player-lobby');
  } else if ((roomState === 'question' || roomState === 'question-pending') && questionData) {
    renderQuestion({
      questionIndex: questionData.questionIndex,
      total: questionData.total,
      question: questionData.question,
      duration: questionData.duration,
      players: questionData.players,
    }, false);
    // Sync the client timer to the server's elapsed time
    state.questionStartTime = Date.now() - (questionData.duration - questionData.timeRemaining) * 1000;
    if (questionData.hasAnswered) {
      state.hasAnswered = true;
      document.getElementById('player-answered-msg').textContent = '✅ تم إرسال إجابتك! انتظر الآخرين…';
    }
  } else if (roomState === 'finished' && leaderboard) {
    // Populate podium immediately (no ceremony delay on rejoin)
    document.getElementById('final-leaderboard-list').innerHTML = leaderboard.map((entry, i) =>
      `<li class="lb-entry ${entry.id === socket.id ? 'lb-mine' : ''}" style="animation-delay:${i * 0.07}s">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-nickname">${escapeHtml(entry.nickname)}</span>
        <span class="lb-score">${entry.totalScore} pts</span>
      </li>`
    ).join('');
    const fillSlotRejoin = (slotId, avatarId, nameId, scoreId, entry) => {
      if (!entry) { const el = document.getElementById(slotId); if (el) el.style.display = 'none'; return; }
      document.getElementById(avatarId).textContent = entry.avatar || '🎮';
      document.getElementById(nameId).textContent   = escapeHtml(entry.nickname);
      document.getElementById(scoreId).textContent  = `${entry.totalScore} pts`;
    };
    fillSlotRejoin('podium-slot-1', 'podium-avatar-1', 'podium-name-1', 'podium-score-1', leaderboard[0]);
    fillSlotRejoin('podium-slot-2', 'podium-avatar-2', 'podium-name-2', 'podium-score-2', leaderboard[1]);
    fillSlotRejoin('podium-slot-3', 'podium-avatar-3', 'podium-name-3', 'podium-score-3', leaderboard[2]);
    ['podium-slot-1', 'podium-slot-2', 'podium-slot-3'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none') { el.style.opacity = '1'; el.classList.add('podium-revealed'); }
    });
    document.getElementById('podium-full-results').classList.add('podium-results-visible');
    document.getElementById('btn-start-new-session').style.display = 'none';
    clearGameSession();
    showView('view-game-over');
  } else {
    // Fallback: show the player lobby
    showView('view-player-lobby');
  }
});

/** PLAYER: Server could not find the session to rejoin */
socket.on('room:rejoin_failed', ({ message }) => {
  rejoinAttempt = false;
  clearGameSession();
  setConnectionStatus('ok', 'Server connected');
  showView('view-home');
});

/** HOST: Server confirmed host joined as player */
socket.on('host:joined_as_player', ({ joined, nickname, avatar }) => {
  state.hostIsPlayer = !!joined;
  const statusEl = document.getElementById('host-as-player-status');
  const chk = document.getElementById('chk-host-as-player');
  if (joined) {
    if (statusEl) statusEl.textContent = `\u2705 Joined as "${nickname}" — you will play too!`;
    if (chk) chk.checked = true;
  } else {
    if (statusEl) statusEl.textContent = '';
    const form = document.getElementById('host-player-form');
    if (form) form.style.display = 'none';
    if (chk) chk.checked = false;
  }
});

/** BOTH: Error from server */
socket.on('room:error', ({ message }) => {
  const editPanel = document.getElementById('edit-profile-panel');
  if (state.role === 'player' && editPanel && editPanel.classList.contains('open')) {
    const errEl = document.getElementById('edit-profile-error');
    if (errEl) errEl.textContent = `⚠️ ${message}`;
  } else if (state.role === 'player') {
    showError('join-error', `⚠️ ${message}`);
  } else {
    alert(`Server error: ${message}`);
  }
});

/** PLAYER: Server confirmed profile update */
socket.on('room:profile_updated', ({ nickname, avatar }) => {
  state.nickname = nickname;
  state.avatar = avatar;

  // Update edit form
  const editNickEl = document.getElementById('edit-nickname-input');
  if (editNickEl) editNickEl.value = nickname;

  // Update lobby avatar trigger display
  const lobbyDisplayEl = document.getElementById('lobby-avatar-display');
  if (lobbyDisplayEl) lobbyDisplayEl.textContent = avatar;

  // Clear errors and close panel
  const errEl = document.getElementById('edit-profile-error');
  if (errEl) errEl.textContent = '';
  const panel = document.getElementById('edit-profile-panel');
  if (panel) panel.classList.remove('open');
});

/** BOTH: Game is starting */
socket.on('game:start', ({ totalQuestions }) => {
  state.totalQuestions = totalQuestions;
  state.myStreak = 0;
  state.myScore = 0;
  updatePlayerScoreUI();
  Sounds.start();

  // Preload all question images so they appear instantly during the game
  if (quizSlugFromUrl) {
    fetch(`/api/quiz-preview/${encodeURIComponent(quizSlugFromUrl)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data || !Array.isArray(data.questions)) return;
        data.questions.forEach((q) => {
          if (q.media && q.media.url && q.media.type === 'image') {
            const img = new Image();
            img.src = q.media.url;
          }
        });
      })
      .catch(() => {});
  }
});

socket.on('game:roles', (data) => {
  state.roleInfo = {
    scholarPreviewSeconds: data.scholarPreviewSeconds || 3,
    saboteurFreezeSeconds: data.saboteurFreezeSeconds || 2,
    wrongPenalty: data.wrongPenalty || 80,
  };
  state.currentDifficulty = data.challengePreset || 'classic';
  updateDifficultyDisplay();

  const roles = data.roles || {};
  if (roles.scholarId === socket.id) state.myRole = 'scholar';
  else if (roles.shieldId === socket.id) state.myRole = 'shield';
  else if (roles.saboteurId === socket.id) state.myRole = 'saboteur';
  else state.myRole = null;
});

socket.on('game:question_preview', (data) => {
  if (state.role !== 'player') return;
  showScholarPreview(data);
});

/** BOTH: New question */
socket.on('game:question', (data) => {
  state.isPaused = false;
  document.getElementById('overlay-paused').style.display = 'none';
  // If host is also playing, show the player (interactive) question view
  const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
  renderQuestion(data, isHostOnly);
});

socket.on('role:shield_applied', ({ from }) => {
  if (state.role !== 'player') return;
  const msg = document.getElementById('player-answered-msg');
  if (msg) msg.textContent = `🛡️ ${from} protected you from penalty this round.`;
});

socket.on('role:frozen', ({ durationMs, from }) => {
  if (state.role !== 'player') return;
  clearTimeout(frozenTimeout);
  setFrozenState(true, `❄️ ${from} froze your screen for ${Math.ceil((durationMs || 2000) / 1000)}s`);
  frozenTimeout = setTimeout(() => {
    setFrozenState(false);
  }, durationMs || 2000);
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

/** BOTH: Game over — Podium Ceremony */
socket.on('game:over', (data) => {
  clearGameSession();
  clearScholarPreviewInterval();
  stopClientTimer();
  setFrozenState(false);
  document.getElementById('overlay-paused').style.display = 'none';

  const lb = data.leaderboard || [];
  const newSessionBtn = document.getElementById('btn-start-new-session');
  newSessionBtn.style.display = state.role === 'host' ? 'block' : 'none';

  // Populate full leaderboard list
  document.getElementById('final-leaderboard-list').innerHTML = lb
    .map((entry, i) =>
      `<li class="lb-entry ${entry.id === socket.id ? 'lb-mine' : ''}" style="animation-delay:${i * 0.07}s">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-nickname">${escapeHtml(entry.nickname)}</span>
        <span class="lb-score">${entry.totalScore} pts</span>
      </li>`
    ).join('');

  // Populate winner-announcement (hidden; kept for rejoin compat)
  const winnerWrap = document.getElementById('winner-announcement');
  const winnerNameEl = document.getElementById('winner-name');
  const winnerScoreEl = document.getElementById('winner-score');
  const w1 = lb[0];
  if (w1) {
    winnerNameEl.textContent = `👑 ${w1.nickname}`;
    winnerScoreEl.textContent = `${w1.totalScore} pts`;
    winnerWrap.style.display = 'none'; // podium replaces this
  }

  // Helper: fill a podium slot
  function fillSlot(slotId, avatarId, nameId, scoreId, entry) {
    if (!entry) {
      document.getElementById(slotId).style.display = 'none';
      return;
    }
    document.getElementById(avatarId).textContent = entry.avatar || '🎮';
    document.getElementById(nameId).textContent   = escapeHtml(entry.nickname);
    document.getElementById(scoreId).textContent  = `${entry.totalScore} pts`;
  }

  fillSlot('podium-slot-1', 'podium-avatar-1', 'podium-name-1', 'podium-score-1', lb[0]);
  fillSlot('podium-slot-2', 'podium-avatar-2', 'podium-name-2', 'podium-score-2', lb[1]);
  fillSlot('podium-slot-3', 'podium-avatar-3', 'podium-name-3', 'podium-score-3', lb[2]);

  // Reset visual state
  ['podium-slot-1', 'podium-slot-2', 'podium-slot-3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('podium-revealed'); el.style.opacity = '0'; el.style.display = ''; }
  });
  const fullResults = document.getElementById('podium-full-results');
  fullResults.classList.remove('podium-results-visible');

  showView('view-game-over');
  Sounds.fanfare();

  // ── Sequential reveal: 3rd → 2nd → 1st ──
  const REVEAL_INTERVAL = 1700;

  // 3rd place (right pillar, shortest)
  setTimeout(() => {
    const el = document.getElementById('podium-slot-3');
    if (el && lb[2]) el.classList.add('podium-revealed');
  }, 600);

  // 2nd place (left pillar, medium)
  setTimeout(() => {
    const el = document.getElementById('podium-slot-2');
    if (el && lb[1]) el.classList.add('podium-revealed');
  }, 600 + REVEAL_INTERVAL);

  // 1st place (center pillar, tallest) — full celebration
  setTimeout(() => {
    const el = document.getElementById('podium-slot-1');
    if (el && lb[0]) el.classList.add('podium-revealed');
    Sounds.fanfare();
    if (typeof confetti === 'function') {
      confetti({ particleCount: 180, spread: 90, origin: { y: 0.45 } });
      setTimeout(() => confetti({ particleCount: 90, angle: 55, spread: 60, origin: { x: 0 } }), 350);
      setTimeout(() => confetti({ particleCount: 90, angle: 125, spread: 60, origin: { x: 1 } }), 650);
      setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.3 }, colors: ['#facc15','#fb923c','#34d399'] }), 1100);
    }
  }, 600 + REVEAL_INTERVAL * 2);

  // Full results fade in after the ceremony
  setTimeout(() => {
    fullResults.classList.add('podium-results-visible');
  }, 600 + REVEAL_INTERVAL * 2 + 1400);
});

socket.on('room:reset', ({ players, modeInfo }) => {
  clearScholarPreviewInterval();
  stopClientTimer();
  setFrozenState(false);
  state.isPaused = false;
  state.questionIndex = 0;
  state.totalQuestions = 0;
  state.myStreak = 0;
  state.myScore = 0;
  state.hostIsPlayer = false;
  updatePlayerScoreUI();
  document.getElementById('overlay-paused').style.display = 'none';
  // Reset the host-as-player UI for the fresh session
  const chkReset = document.getElementById('chk-host-as-player');
  if (chkReset) chkReset.checked = false;
  const formReset = document.getElementById('host-player-form');
  if (formReset) formReset.style.display = 'none';
  const statusReset = document.getElementById('host-as-player-status');
  if (statusReset) statusReset.textContent = '';

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
  clearGameSession();
  stopClientTimer();
  document.getElementById('room-closed-msg').textContent = message;
  showView('view-room-closed');
});

/** PLAYER: Host disconnected */
socket.on('room:closed', ({ message }) => {
  clearGameSession();
  stopClientTimer();
  document.getElementById('room-closed-msg').textContent = message;
  showView('view-room-closed');
});

// ─────────────────────────────────────────────
// QR Auto-fill: runs LAST so state & showView are fully declared
// If URL has ?pin=XXXXXX (from QR scan), skip home and go straight
// to the player join view with PIN pre-filled.
// If URL has ?quiz=... (from the host's share QR), skip home too —
// the QR is only shared with players, so the host choice is irrelevant.
// If URL has ?quiz=...&mode=host, skip home and go directly to host mode
// ─────────────────────────────────────────────
(function () {
  const params = new URLSearchParams(window.location.search);
  const pinFromUrl = params.get('pin');
  const modeFromUrl = params.get('mode');
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
  } else if (quizSlugFromUrl && modeFromUrl === 'host') {
    // Clicked Play from admin — go directly to host mode
    // Show a launching state on the home view while socket connects
    const btnGroup = document.querySelector('#view-home .btn-group');
    const subtitle = document.querySelector('#view-home .subtitle');
    if (btnGroup) btnGroup.innerHTML = '<p style="color:#2dd4bf;font-size:1.1rem;font-weight:700;letter-spacing:1px;animation:pulse 1.2s infinite">⏳ Launching game…</p>';
    if (subtitle) subtitle.textContent = 'Connecting to server, please wait…';
    enableKeepAwake();
    state.role = 'host';
    const doHostCreate = () => socket.emit('host:create', { quizSlug: quizSlugFromUrl });
    if (socket.connected) {
      doHostCreate();
    } else {
      socket.once('connect', doHostCreate);
    }
  } else if (quizSlugFromUrl) {
    // Came from a quiz QR code — host is already set up, go straight to player join
    state.role = 'player';
    if (scanFallbackBanner) {
      scanFallbackBanner.style.display = 'none';
    }
    showView('view-player-join');
  } else {
    // Check for a saved game session and try to reconnect
    const savedSession = localStorage.getItem('quizSession');
    if (savedSession) {
      try {
        const { pin, playerId: savedPlayerId } = JSON.parse(savedSession);
        if (pin && savedPlayerId) {
          rejoinAttempt = true;
          state.role = 'player';
          setConnectionStatus('warn', 'Reconnecting to game…');
          const attemptRejoin = () => {
            socket.emit('player:rejoin', { pin, playerId: savedPlayerId });
          };
          if (socket.connected) {
            attemptRejoin();
          } else {
            socket.once('connect', attemptRejoin);
          }
          return; // wait for room:rejoined or room:rejoin_failed
        }
      } catch (_e) {
        clearGameSession();
      }
    }
  }
})();
