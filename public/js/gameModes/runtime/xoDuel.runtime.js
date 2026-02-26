import { triggerScreenShake } from '../../utils/effects.js?v=121';
import { Sounds } from '../../utils/sounds.js?v=121';

// ── SVG symbol helpers ──────────────────────────────────────────────────────
function svgX(size = '2rem') {
  return `<svg viewBox="0 0 44 44" width="${size}" height="${size}" fill="none" style="display:block;filter:drop-shadow(0 0 8px rgba(59,130,246,0.65))"><line x1="9" y1="9" x2="35" y2="35" stroke="#3b82f6" stroke-width="7" stroke-linecap="round"/><line x1="35" y1="9" x2="9" y2="35" stroke="#3b82f6" stroke-width="7" stroke-linecap="round"/></svg>`;
}
function svgO(size = '2rem') {
  return `<svg viewBox="0 0 44 44" width="${size}" height="${size}" fill="none" style="display:block;filter:drop-shadow(0 0 8px rgba(168,85,247,0.55))"><rect x="9" y="9" width="26" height="26" rx="8" stroke="#a855f7" stroke-width="6"/><rect x="15.5" y="15.5" width="13" height="13" rx="4" stroke="#c084fc" stroke-width="2.2" opacity="0.9"/></svg>`;
}
function svgSymbol(symbol, size = '2rem') {
  return symbol === 'O' ? svgO(size) : svgX(size);
}

function renderXoBoardHTML(board, interactive, activeSymbol, options = {}) {
  const winningLine = Array.isArray(options.winningLine) ? new Set(options.winningLine) : null;
  const cells = board.map((cell, index) => {
    const disabled = !interactive || !!cell;
    const isWinningCell = !!winningLine && winningLine.has(index);
    const bg = cell === 'X' ? 'rgba(59,130,246,0.18)' : cell === 'O' ? 'rgba(249,115,22,0.18)' : 'rgba(15,23,42,0.4)';
    const border = isWinningCell
      ? '#22d3ee'
      : (cell === 'X' ? '#3b82f6' : cell === 'O' ? '#f97316' : 'rgba(100,116,139,0.38)');
    const glow = isWinningCell ? '0 0 0 2px rgba(34,211,238,0.35),0 0 20px rgba(34,211,238,0.28)' : 'none';
    const innerContent = cell === 'X'
      ? svgX('1.85rem')
      : cell === 'O'
        ? svgO('1.85rem')
        : `<span style="width:6px;height:6px;border-radius:50%;background:rgba(148,163,184,0.2);display:block;"></span>`;
    return `
      <button
        type="button"
        class="xo-cell"
        data-xo-cell="${index}"
        ${disabled ? 'disabled' : ''}
        style="
          aspect-ratio:1/1;
          border-radius:12px;
          border:2px solid ${border};
          background:${bg};
          display:flex;align-items:center;justify-content:center;
          box-shadow:${glow};
          cursor:${disabled ? 'not-allowed' : 'pointer'};
          opacity:${cell ? 1 : disabled ? 0.45 : 1};
          transition:background 0.15s,border-color 0.15s,transform 0.12s;
        "
        title="${disabled ? '' : `اختر (${activeSymbol})`}"
      >${innerContent}</button>
    `;
  }).join('');

  return `<div class="xo-board-wrap"><div style="display:grid;grid-template-columns:repeat(3,minmax(76px,1fr));gap:0.55rem;max-width:330px;margin:0.35rem auto 0;">${cells}</div></div>`;
}

let lastTurnOverlayKey = '';
let lastLoseShakeKey = '';
let lastResultSoundKey = '';
let lastWinOverlayKey = '';
let lastRoundStartSoundKey = '';
let lastVersusOverlayKey = '';

function buildTurnLines(xo = {}) {
  const players = Array.isArray(xo.players) ? xo.players : [];
  const activePlayerId = xo.activePlayerId || null;
  const activeNickname = xo.activeNickname || '...';
  const activeSymbol = xo.activeSymbol || 'X';

  const playersLine = players
    .map((player) => `${player.id === activePlayerId ? '👉 ' : ''}${player.symbol}: ${player.nickname} (${player.score || 0})`)
    .join(' • ');

  const turnLine = `🎯 الدور الآن: ${activeNickname} (${activeSymbol})`;
  return { turnLine, playersLine };
}

function setCompactTwoLineNote(el, line1, line2) {
  if (!el) return;
  el.style.whiteSpace = 'pre-line';
  el.style.lineHeight = '1.25';
  el.style.fontSize = '0.92rem';
  el.textContent = line2 ? `${line1}\n${line2}` : line1;
}

function buildRoleLegendHTML(xo = {}, activePlayerId = null, currentSocketId = null) {
  const players = Array.isArray(xo.players) ? xo.players : [];

  if (xo.needsPlayers) {
    return `
      <div style="font-size:0.82rem; color:#f87171; text-align:center; padding:1rem; background:rgba(239, 68, 68, 0.08); border:1px dashed rgba(248, 113, 113, 0.4); border-radius:14px; margin:1.2rem auto; max-width:300px; font-weight:700; line-height:1.4;">
        ⚠️ X O Duel يحتاج لاعبين متصلين على الأقل.
        <div style="font-size:0.75rem; opacity:0.8; margin-top:0.3rem; font-weight:500;">يمكن للمضيف الانضمام كلاعب لبدء التحدي.</div>
      </div>
    `;
  }

  if (!players.length) return '';

  const items = players.map((player) => {
    const isActive = player.id === activePlayerId;
    // Pulse only if it's the other player's turn (from current viewer perspective)
    const shouldPulse = isActive && (player.id !== currentSocketId);
    
    const tint = player.symbol === 'X' ? 'rgba(59,130,246,0.16)' : 'rgba(249,115,22,0.16)';
    const border = player.symbol === 'X' ? 'rgba(59,130,246,0.62)' : 'rgba(249,115,22,0.62)';
    const scoreVal = Number(player.score || 0);
    return `
      <div class="xo-role-pill ${isActive ? 'is-active' : ''} ${shouldPulse ? `is-pulsing symbol-${player.symbol}` : ''}" style="background:${tint};border-color:${border}">
        <span class="xo-role-symbol">${svgSymbol(player.symbol, '0.9rem')}</span>
        <span class="xo-role-name">${player.nickname} · ${scoreVal}</span>
      </div>
    `;
  }).join('');

  return `<div class="xo-role-legend">${items}</div>`;
}

function ensureOutcomeStyles() {
  if (document.getElementById('xo-outcome-styles')) return;
  const style = document.createElement('style');
  style.id = 'xo-outcome-styles';
  style.textContent = `
    @keyframes xo-pop {
      0% { transform: translateY(12px) scale(0.95); opacity: 0; }
      45% { transform: translateY(-2px) scale(1.02); opacity: 1; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes xo-glow-win {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.0); }
      50% { box-shadow: 0 0 22px 6px rgba(16,185,129,0.28); }
    }
    @keyframes xo-glow-lose {
      0%, 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.0); }
      50% { box-shadow: 0 0 22px 6px rgba(244,63,94,0.25); }
    }
    @keyframes xo-turn-pop {
      0% { transform: translateY(18px) scale(0.92); opacity: 0; filter: blur(7px); }
      24% { transform: translateY(0) scale(1.02); opacity: 1; filter: blur(0); }
      74% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
      100% { transform: translateY(-8px) scale(0.98); opacity: 0; filter: blur(5px); }
    }
    @keyframes xo-win-pop {
      0% { transform: scale(0.6) rotate(-8deg); opacity: 0; filter: blur(8px); }
      25% { transform: scale(1.1) rotate(3deg); opacity: 1; filter: blur(0); }
      35% { transform: scale(1) rotate(0); }
      85% { transform: scale(1) rotate(0); opacity: 1; }
      100% { transform: scale(1.2); opacity: 0; filter: blur(12px); }
    }
    @keyframes xo-versus-pop {
      0% { transform: translateY(20px) scale(0.88); opacity: 0; filter: blur(10px); }
      20% { transform: translateY(0) scale(1.02); opacity: 1; filter: blur(0); }
      80% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
      100% { transform: translateY(-8px) scale(0.97); opacity: 0; filter: blur(6px); }
    }
    @keyframes xo-focus-pulse {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-2px) scale(1.03); }
    }
    @keyframes xo-pulse-blue {
      0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); border-color: rgba(59,130,246,0.3); }
      50% { box-shadow: 0 0 16px rgba(59,130,246,0.25); border-color: rgba(59,130,246,0.95); }
    }
    @keyframes xo-pulse-orange {
      0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); border-color: rgba(249,115,22,0.3); }
      50% { box-shadow: 0 0 16px rgba(249,115,22,0.25); border-color: rgba(249,115,22,0.95); }
    }
    .xo-round-banner {
      margin: 0.65rem auto 0;
      max-width: 420px;
      border-radius: 14px;
      border: 1px solid rgba(148,163,184,0.35);
      background: rgba(15,23,42,0.68);
      color: #e2e8f0;
      padding: 0.7rem 0.9rem;
      text-align: center;
      animation: xo-pop 0.4s ease-out both;
    }
    .xo-round-banner .xo-round-title {
      font-size: 1.05rem;
      font-weight: 900;
      margin-bottom: 0.2rem;
    }
    .xo-round-banner .xo-round-sub {
      font-size: 0.86rem;
      opacity: 0.9;
      line-height: 1.35;
    }
    .xo-round-banner.is-win { border-color: rgba(16,185,129,0.45); animation: xo-pop 0.4s ease-out both, xo-glow-win 1.35s ease-in-out infinite; }
    .xo-round-banner.is-lose { border-color: rgba(244,63,94,0.45); animation: xo-pop 0.4s ease-out both, xo-glow-lose 1.35s ease-in-out infinite; }
    .xo-turn-overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 1200;
      opacity: 0;
    }
    .xo-turn-overlay.is-showing {
      opacity: 1;
    }
    .xo-turn-overlay .xo-turn-text {
      background: linear-gradient(135deg, rgba(15,23,42,0.86), rgba(30,41,59,0.82));
      border: 1px solid rgba(56,189,248,0.45);
      border-radius: 16px;
      color: #f8fafc;
      font-size: clamp(1.25rem, 4.2vw, 2rem);
      font-weight: 900;
      padding: 0.8rem 1.3rem;
      min-width: min(92vw, 360px);
      text-align: center;
      letter-spacing: 0.015em;
      box-shadow: 0 12px 30px rgba(2,6,23,0.45), inset 0 1px 0 rgba(148,163,184,0.18);
      text-shadow: 0 0 8px rgba(56,189,248,0.2);
      backdrop-filter: blur(4px);
      animation: xo-turn-pop 1.75s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .xo-challenger-badge {
      position: absolute;
      top: 0.6rem;
      right: 0.75rem;
      z-index: 20;
      border-radius: 999px;
      border: 1px solid rgba(34,211,238,0.45);
      background: rgba(15,23,42,0.74);
      color: #e2e8f0;
      font-size: 0.78rem;
      font-weight: 800;
      padding: 0.28rem 0.58rem;
      display: none;
      align-items: center;
      gap: 0.28rem;
      box-shadow: 0 6px 14px rgba(2, 6, 23, 0.26);
    }
    .xo-challenger-badge.is-visible {
      display: inline-flex;
    }
    .xo-role-legend {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
      max-width: 330px;
      margin: 0.45rem auto 0;
    }
    .xo-role-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.38rem;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.3);
      padding: 0.28rem 0.56rem;
      color: #dbeafe;
      font-size: 0.8rem;
      font-weight: 800;
      line-height: 1;
      transition: all 0.2s;
    }
    .xo-role-pill.is-active.is-pulsing.symbol-X { animation: xo-pulse-blue 1.8s ease-in-out infinite; }
    .xo-role-pill.is-active.is-pulsing.symbol-O { animation: xo-pulse-orange 1.8s ease-in-out infinite; }
    .xo-role-symbol {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.2rem;
      height: 1.2rem;
      border-radius: 8px;
      background: rgba(15,23,42,0.45);
      font-size: 0.78rem;
    }
    .xo-role-name {
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .xo-cell:not([disabled]):hover {
      transform: scale(1.07);
      border-color: rgba(34,211,238,0.6) !important;
      background: rgba(34,211,238,0.08) !important;
    }
    .xo-cell:not([disabled]):active {
      transform: scale(0.95);
    }
    .xo-role-avatar {
      width: 4rem;
      height: 4rem;
      border-radius: 16px;
      background: rgba(15,23,42,0.65);
      border: 3px solid rgba(255,255,255,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      backdrop-filter: blur(8px);
      transition: all 0.3s;
    }
    .xo-role-avatar.is-active {
      animation: xo-focus-pulse 1.2s ease-in-out infinite;
    }
    .xo-role-avatar.symbol-X.is-active { border-color: #3b82f6; box-shadow: 0 0 20px rgba(59,130,246,0.3); }
    .xo-role-avatar.symbol-O.is-active { border-color: #f97316; box-shadow: 0 0 20px rgba(249,115,22,0.3); }

    .xo-mini-turn-banner {
      font-size: 0.95rem;
      font-weight: 900;
      color: #e2e8f0;
      text-align: center;
      margin-top: 0.5rem;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      opacity: 0.8;
    }
    .xo-mini-turn-banner.is-active {
      color: #22d3ee;
      opacity: 1;
      animation: xo-pop 0.3s ease-out both;
    }
  `;
  document.head.appendChild(style);
}

function clearOutcomeBanner() {
  document.querySelectorAll('.xo-round-banner').forEach((el) => el.remove());
}

function showOutcomeBanner({ layoutId, kind, title, subtitle }) {
  const layout = document.getElementById(layoutId);
  if (!layout) return;

  ensureOutcomeStyles();
  clearOutcomeBanner();

  const banner = document.createElement('div');
  banner.className = `xo-round-banner ${kind === 'win' ? 'is-win' : ''}${kind === 'lose' ? ' is-lose' : ''}`;
  banner.innerHTML = `
    <div class="xo-round-title">${title}</div>
    <div class="xo-round-sub">${subtitle}</div>
  `;
  layout.appendChild(banner);
}

function ensureTurnOverlay() {
  ensureOutcomeStyles();
  let overlay = document.getElementById('xo-turn-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'xo-turn-overlay';
  overlay.className = 'xo-turn-overlay';
  overlay.innerHTML = '<div class="xo-turn-text">🔥 YOUR TURN</div>';
  document.body.appendChild(overlay);
  return overlay;
}

function showWinnerOverlay(text, sub, durationMs = 4200) {
  const overlay = ensureTurnOverlay();
  const textEl = overlay.querySelector('.xo-turn-text');
  if (textEl) {
    textEl.innerHTML = `<div style="font-size:0.7em;opacity:0.85;margin-bottom:0.25rem;font-weight:700;">${sub}</div><div style="font-size:1.1em;border-top:1px solid rgba(255,255,255,0.15);padding-top:0.25rem;">${text}</div>`;
    textEl.style.borderColor = '#10b981';
    textEl.style.textShadow = '0 0 15px rgba(16,185,129,0.35)';
    textEl.style.animation = 'none';
    void textEl.offsetWidth; 
    textEl.style.animation = `xo-win-pop ${Math.max(2.8, durationMs / 1000)}s ease-out both`;
  }
  overlay.classList.add('is-showing');
  setTimeout(() => overlay.classList.remove('is-showing'), Math.max(3200, durationMs));
}

function showVersusOverlay({ playerA, playerB, subtitle = '', durationMs = 3600 }) {
  const overlay = ensureTurnOverlay();
  const textEl = overlay.querySelector('.xo-turn-text');
  if (!textEl) return;

  textEl.innerHTML = `
    <div style="font-size:0.64em;opacity:0.84;margin-bottom:0.3rem;font-weight:700;letter-spacing:0.06em;">⚔️ المواجهة القادمة</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:0.55rem;font-size:1.18em;font-weight:900;line-height:1.2;">
      <span style="color:#38bdf8;max-width:40vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${playerA || 'Player A'}</span>
      <span style="opacity:0.75;font-size:0.88em;">VS</span>
      <span style="color:#f59e0b;max-width:40vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${playerB || 'Player B'}</span>
    </div>
    ${subtitle ? `<div style="font-size:0.64em;opacity:0.78;margin-top:0.34rem;">${subtitle}</div>` : ''}
  `;
  textEl.style.borderColor = 'rgba(245,158,11,0.72)';
  textEl.style.textShadow = '0 0 14px rgba(245,158,11,0.3)';
  textEl.style.animation = 'none';
  void textEl.offsetWidth;
  textEl.style.animation = `xo-versus-pop ${Math.max(2.8, durationMs / 1000)}s cubic-bezier(0.22, 1, 0.36, 1) both`;

  overlay.classList.add('is-showing');
  setTimeout(() => overlay.classList.remove('is-showing'), Math.max(2600, durationMs));
}

function maybeShowTurnOverlay(xo, socketId, isYourTurn) {
  if (!socketId || !isYourTurn) return;
  const turnSequence = Number(xo?.turnSequence || 0);
  if (!turnSequence) return;
  const key = `${xo.round || 0}:${turnSequence}:${xo.activePlayerId || ''}:${socketId}`;
  if (key === lastTurnOverlayKey) return;
  lastTurnOverlayKey = key;

  const overlay = ensureTurnOverlay();
  const text = overlay.querySelector('.xo-turn-text');
  if (text) {
    text.textContent = '🎯 دورك الآن';
    if (typeof Sounds.xoTurn === 'function') Sounds.xoTurn();
    else Sounds.start();
  }

  overlay.classList.remove('is-showing');

  // Force animation restart on the child element (not just the parent).
  // animation-fill-mode:both keeps it frozen at opacity:0 after first play —
  // clearing inline animation and triggering a reflow on the text node itself is required.
  if (text) {
    text.style.animation = 'none';
    void text.offsetWidth; // reflow on the animated element
    text.style.animation = '';
  }

  overlay.classList.add('is-showing');

  setTimeout(() => {
    overlay.classList.remove('is-showing');
  }, 1900);
}

function updateChallengerBadge({ isYourTurn, challenger, activeNickname }) {
  const layout = document.getElementById('player-question-layout');
  if (!layout) return;

  if (!layout.style.position) layout.style.position = 'relative';

  let badge = document.getElementById('xo-challenger-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'xo-challenger-badge';
    badge.className = 'xo-challenger-badge';
    layout.appendChild(badge);
  }

  if (!isYourTurn && activeNickname) {
    const label = challenger
      ? `${activeNickname} turn`
      : `Challenger: ${activeNickname}`;
    badge.innerHTML = `⚔️ <span>${label}</span>`;
    badge.classList.add('is-visible');
    return;
  }

  badge.classList.remove('is-visible');
}

function applyXoHeader({ state, data }) {
  const hostModeBadge = document.getElementById('host-q-difficulty');
  if (hostModeBadge) hostModeBadge.textContent = 'X O DUEL';
  const playerModeBadge = document.getElementById('player-q-difficulty');
  if (playerModeBadge) playerModeBadge.textContent = 'X O DUEL';

  const hostText = document.getElementById('host-question-text');
  const playerText = document.getElementById('player-question-text');
  if (hostText) hostText.textContent = 'X O Duel';
  // Player title is replaced with the player's own symbol SVG inside renderPlayerBoard
  if (playerText) { playerText.innerHTML = ''; playerText.style.lineHeight = '1'; }

  const total = Number(data?.total || 1);
  const qIndex = Number(data?.questionIndex || 0);
  const xoRound = Number(data?.question?.xo?.round || (qIndex + 1));
  const hostProgress = document.getElementById('host-q-progress');
  const playerProgress = document.getElementById('player-q-progress');
  const progressText = `Round ${xoRound} / ${total}`;
  if (hostProgress) hostProgress.textContent = progressText;
  if (playerProgress) playerProgress.textContent = progressText;

  if (state.role === 'host' && !state.hostIsPlayer) {
    const hostGrid = document.getElementById('host-options-grid');
    if (hostGrid) hostGrid.style.display = 'block';
    const playerGrid = document.getElementById('player-options-grid');
    if (playerGrid) playerGrid.style.display = 'none';
  } else {
    const playerGrid = document.getElementById('player-options-grid');
    if (playerGrid) playerGrid.style.display = 'block';
  }

  ['player-type-container', 'player-match-container', 'player-order-container'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const submitBtn = document.getElementById('btn-submit-answer');
  if (submitBtn) submitBtn.style.display = 'none';
}

function renderSpectatorBoard({ data }) {
  const board = Array.isArray(data?.question?.xo?.board) ? data.question.xo.board : Array(9).fill(null);
  const xo = data?.question?.xo || {};
  const activeSymbol = data?.question?.xo?.activeSymbol || 'X';
  const hostGrid = document.getElementById('host-options-grid');
  if (hostGrid) {
    hostGrid.innerHTML = `${renderXoBoardHTML(board, false, activeSymbol, { winningLine: xo.winningLine })}${buildRoleLegendHTML(xo, xo.activePlayerId || null, null)}`;
  }

  const hostAnswerCounter = document.getElementById('host-answer-counter');
  if (hostAnswerCounter) hostAnswerCounter.textContent = '';
}

function renderPlayerBoard({ data, socket, state }) {
  const xo = data?.question?.xo || {};
  const board = Array.isArray(xo.board) ? xo.board : Array(9).fill(null);
  const activePlayerId = xo.activePlayerId;
  const activeNickname = xo.activeNickname || 'Player';
  const activeSymbol = xo.activeSymbol || 'X';
  const turnSequence = Number(xo.turnSequence || 0);
  const challenger = (xo.players || []).find((player) => player?.id === socket.id) || null;
  const isYourTurn = !!challenger && !!activePlayerId && activePlayerId === socket.id;
  const turnInputKey = `${xo.round || 0}:${xo.turnSequence || 0}:${activePlayerId || ''}:${socket?.id || ''}`;

  if (isYourTurn && state.__xoTurnInputKey !== turnInputKey) {
    state.__xoTurnInputKey = turnInputKey;
    state.hasAnswered = false;
  }

  const playerGrid = document.getElementById('player-options-grid');
  if (!playerGrid) return;

  playerGrid.innerHTML = `${renderXoBoardHTML(board, isYourTurn, activeSymbol, { winningLine: xo.winningLine })}${buildRoleLegendHTML(xo, activePlayerId || null, socket?.id)}`;

  const titleEl = document.getElementById('player-question-text');
  if (titleEl) {
    if (xo.needsPlayers) {
      titleEl.style.display = 'none';
    } else {
      ensureOutcomeStyles();
      const mySymbol = challenger?.symbol || activeSymbol;
      const bannerText = !challenger
        ? `🎥 مواجهة جارية: ${activeNickname}`
        : isYourTurn
          ? '🔥 دورك الآن!'
          : `دور ${activeNickname}`;
      titleEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="xo-role-avatar symbol-${mySymbol} ${isYourTurn ? 'is-active' : ''}">
            ${svgSymbol(mySymbol, '2.8rem')}
          </div>
          <div class="xo-mini-turn-banner ${isYourTurn ? 'is-active' : ''}">
            ${bannerText}
          </div>
        </div>
      `;
      titleEl.style.display = 'block';
    }
  }

  const answerMsg = document.getElementById('player-answered-msg');
  if (answerMsg) { answerMsg.style.display = 'none'; answerMsg.textContent = ''; }

  maybeShowTurnOverlay(xo, socket?.id, isYourTurn);
  updateChallengerBadge({ isYourTurn, challenger, activeNickname });

  playerGrid.querySelectorAll('[data-xo-cell]').forEach((cellButton) => {
    cellButton.addEventListener('click', () => {
      if (!isYourTurn || state.hasAnswered) return;
      const cellIndex = Number(cellButton.getAttribute('data-xo-cell'));
      if (!Number.isInteger(cellIndex)) return;
      
      Sounds.click(); // Sound when clicking a box
      state.hasAnswered = true;
      socket.emit('player:answer', {
        questionIndex: data.questionIndex,
        answer: { cellIndex, turnSequence },
      });
    });
  });
}

function renderRoundResultPhase({ data, state, socket, isHostOnly }) {
  const xo = data?.question?.xo || {};
  const board = Array.isArray(xo.board) ? xo.board : Array(9).fill(null);
  const winnerId = xo.winnerId || xo.result?.winnerId || null;
  const loserId = xo.loserId || xo.result?.loserId || null;
  const isDraw = !!(xo.draw || xo.result?.draw);
  const nextRoundSec = Math.max(1, Math.round(Number(xo.nextRoundInMs || 3000) / 1000));
  const nextRoundInMs = Math.max(1500, Number(xo.nextRoundInMs || 3000));
  const resultOverlayMs = Math.min(6200, Math.max(3600, nextRoundInMs + 1400));

  if (isHostOnly) {
    const hostGrid = document.getElementById('host-options-grid');
    if (hostGrid) {
      hostGrid.innerHTML = `${renderXoBoardHTML(board, false, xo.activeSymbol || 'X', { winningLine: xo.winningLine || xo.result?.winningLine })}${buildRoleLegendHTML(xo, winnerId || null)}`;
    }
    const hostAnswerCounter = document.getElementById('host-answer-counter');
    if (hostAnswerCounter) {
      hostAnswerCounter.textContent = isDraw
        ? `🤝 تعادل! جولة جديدة بعد ${nextRoundSec} ثوانٍ.`
        : `🏁 الفائز: ${(xo.result?.winnerNickname || xo.activeNickname || 'Player')} • جولة جديدة بعد ${nextRoundSec} ثوانٍ.`;
    }
    showOutcomeBanner({
      layoutId: 'host-question-layout',
      kind: isDraw ? 'neutral' : 'win',
      title: isDraw ? '🤝 Draw Round' : '🏁 Round Winner!',
      subtitle: isDraw
        ? `No loser this round • Next board in ${nextRoundSec}s`
        : `${xo.result?.winnerNickname || 'Winner'} defeated ${xo.result?.loserNickname || 'Opponent'} • Next board in ${nextRoundSec}s`,
    });
    return;
  }

  updateChallengerBadge({ isYourTurn: false, challenger: null, activeNickname: '' });

  const playerGrid = document.getElementById('player-options-grid');
  if (playerGrid) {
    playerGrid.innerHTML = `${renderXoBoardHTML(board, false, xo.activeSymbol || 'X', { winningLine: xo.winningLine || xo.result?.winningLine })}${buildRoleLegendHTML(xo, winnerId || null)}`;
  }

  const answerMsg = document.getElementById('player-answered-msg');
  const isWinner = !!winnerId && String(socket.id) === String(winnerId);
  const isLoser = !!loserId && socket.id === loserId;

  // Prevent duplicate sounds on every update of this phase
  const resSoundKey = `${xo.round || 0}:${winnerId || 'n'}:${loserId || 'n'}:${isWinner ? 'w' : isLoser ? 'l' : isDraw ? 'd' : 's'}:${socket.id}`;
  const playSfx = resSoundKey !== lastResultSoundKey;
  if (playSfx) lastResultSoundKey = resSoundKey;

  const winOverlayKey = `${xo.round || 0}:${winnerId || ''}:${loserId || ''}:${isDraw ? 'draw' : ''}`;
  const shouldShowOverlay = (winOverlayKey !== lastWinOverlayKey);

  let title = '🏁 انتهت الجولة';
  let subtitle = `الجولة القادمة ستبدأ خلال ${nextRoundSec} ثوانٍ`;
  let kind = 'neutral';

  if (isDraw) {
    title = '🤝 تعـادل!';
    subtitle = `استعد للجولة القادمة خلال ${nextRoundSec} ثوانٍ`;
    if (playSfx) {
      if (typeof Sounds.xoRoundStart === 'function') Sounds.xoRoundStart();
      else Sounds.resume();
    }
    if (shouldShowOverlay) {
      lastWinOverlayKey = winOverlayKey;
      showWinnerOverlay(title, 'لا يوجد خاسر هذه المرة', resultOverlayMs);
    }
  } else if (isWinner) {
    title = '🎉 أنت الفائز!';
    subtitle = `أحسنت! فزت على ${(xo.result?.loserNickname || 'خصمك')} • الجولة التالية خلال ${nextRoundSec} ثوانٍ`;
    kind = 'win';
    if (playSfx) {
      if (typeof Sounds.xoWin === 'function') Sounds.xoWin();
      else Sounds.fanfare();
    }
    if (shouldShowOverlay) {
      lastWinOverlayKey = winOverlayKey;
      showWinnerOverlay(title, `الفائز: ${xo.result?.winnerNickname || 'أنت'}`, resultOverlayMs);
    }
  } else if (isLoser) {
    title = '💥 خسـارة';
    subtitle = `الفائز: ${(xo.result?.winnerNickname || 'الخصم')} • ستعود خلال ${nextRoundSec} ثوانٍ`;
    kind = 'lose';

    const shakeKey = `${xo.round || 0}:${winnerId || ''}:${loserId || ''}:${socket.id}`;
    if (shakeKey !== lastLoseShakeKey) {
      lastLoseShakeKey = shakeKey;
      if (playSfx) {
        if (typeof Sounds.xoLose === 'function') Sounds.xoLose();
        else Sounds.wrong();
      }
      triggerScreenShake({ axis: 'both', distancePx: 11, durationMs: 520 });
    }
    if (shouldShowOverlay) {
      lastWinOverlayKey = winOverlayKey;
      showWinnerOverlay(title, `الفائز: ${xo.result?.winnerNickname || 'الخصم'}`, resultOverlayMs);
    }
  } else {
    title = '👀 نتيجـة الجولة';
    const winnerName = xo.result?.winnerNickname || 'Player';
    subtitle = `الفائز (${winnerName}) يكمل اللعب ضد خصم جديد بعد ${nextRoundSec} ثوانٍ`;
    if (shouldShowOverlay) {
      lastWinOverlayKey = winOverlayKey;
      showWinnerOverlay(title, `فاز ${winnerName} في هذه الجولة`, resultOverlayMs);
    }
  }

  if (answerMsg) { answerMsg.style.display = 'none'; answerMsg.textContent = ''; }

  showOutcomeBanner({
    layoutId: 'player-question-layout',
    kind,
    title,
    subtitle,
  });

  state.__xoLastResultWinnerId = winnerId || null;
  state.__xoLastResultWinnerName = xo.result?.winnerNickname || null;
}

export const xoDuelRuntime = {
  id: 'xo-duel',

  onGameQuestion({ data, state, socket, showView }) {
    applyXoHeader({ state, data });

    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    showView(isHostOnly ? 'view-host-question' : 'view-player-question');

    const xo = data?.question?.xo || {};
    const duelPlayers = Array.isArray(xo.players) ? xo.players : [];
    const waitingPlayers = Array.isArray(xo.waitingPlayers) ? xo.waitingPlayers : [];

    if (xo.phase !== 'round-result') {
      const roundStartKey = `${xo.round || 0}:${xo.turnSequence || 0}:${xo.activePlayerId || ''}`;
      if (roundStartKey !== lastRoundStartSoundKey) {
        lastRoundStartSoundKey = roundStartKey;
        if (typeof Sounds.xoRoundStart === 'function') Sounds.xoRoundStart();
      }
    }

    if (xo.phase === 'round-result') {
      renderRoundResultPhase({ data, state, socket, isHostOnly });
      return true;
    }

    const duelPairKey = `${xo.round || 0}:${duelPlayers.map((p) => p?.id || '').join('|')}`;
    const hasRotationPool = waitingPlayers.length > 0;
    const winnerStillPlaying = !!state.__xoLastResultWinnerId
      && duelPlayers.some((player) => String(player?.id) === String(state.__xoLastResultWinnerId));
    if (hasRotationPool && winnerStillPlaying && duelPlayers.length === 2 && duelPairKey !== lastVersusOverlayKey) {
      lastVersusOverlayKey = duelPairKey;
      const playerA = duelPlayers[0]?.nickname || 'Player A';
      const playerB = duelPlayers[1]?.nickname || 'Player B';
      showVersusOverlay({
        playerA,
        playerB,
        subtitle: 'الفائز يتحدى منافساً جديداً',
        durationMs: 3800,
      });
      if (typeof Sounds.xoVersus === 'function') Sounds.xoVersus();
      else if (typeof Sounds.xoRoundStart === 'function') Sounds.xoRoundStart();
    }

    clearOutcomeBanner();

    if (isHostOnly) {
      renderSpectatorBoard({ data });
      return true;
    }

    renderPlayerBoard({ data, socket, state });
    return true;
  },

  onQuestionEnd() {
    return true;
  },

  onLeaderboard() {
    return true;
  },
};
