import { triggerScreenShake } from '../../utils/effects.js?v=121';

// ── SVG symbol helpers ──────────────────────────────────────────────────────
function svgX(size = '2rem') {
  return `<svg viewBox="0 0 44 44" width="${size}" height="${size}" fill="none" style="display:block;filter:drop-shadow(0 0 8px rgba(59,130,246,0.65))"><line x1="9" y1="9" x2="35" y2="35" stroke="#3b82f6" stroke-width="7" stroke-linecap="round"/><line x1="35" y1="9" x2="9" y2="35" stroke="#3b82f6" stroke-width="7" stroke-linecap="round"/></svg>`;
}
function svgO(size = '2rem') {
  return `<svg viewBox="0 0 44 44" width="${size}" height="${size}" fill="none" style="display:block;filter:drop-shadow(0 0 8px rgba(236,72,153,0.65))"><circle cx="22" cy="22" r="13" stroke="#ec4899" stroke-width="7"/></svg>`;
}
function svgSymbol(symbol, size = '2rem') {
  return symbol === 'O' ? svgO(size) : svgX(size);
}

function renderXoBoardHTML(board, interactive, activeSymbol, options = {}) {
  const winningLine = Array.isArray(options.winningLine) ? new Set(options.winningLine) : null;
  const cells = board.map((cell, index) => {
    const disabled = !interactive || !!cell;
    const isWinningCell = !!winningLine && winningLine.has(index);
    const bg = cell === 'X' ? 'rgba(59,130,246,0.18)' : cell === 'O' ? 'rgba(236,72,153,0.18)' : 'rgba(15,23,42,0.4)';
    const border = isWinningCell
      ? '#22d3ee'
      : (cell === 'X' ? '#3b82f6' : cell === 'O' ? '#ec4899' : 'rgba(100,116,139,0.38)');
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

  const boardWrapClass = `xo-board-wrap${interactive && activeSymbol ? ` is-${activeSymbol}-turn` : ''}`;
  return `<div class="${boardWrapClass}"><div style="display:grid;grid-template-columns:repeat(3,minmax(76px,1fr));gap:0.55rem;max-width:330px;margin:0.35rem auto 0;">${cells}</div></div>`;
}

let lastTurnOverlayKey = '';
let lastLoseShakeKey = '';

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

function buildRoleLegendHTML(xo = {}, activePlayerId = null) {
  const players = Array.isArray(xo.players) ? xo.players : [];
  if (!players.length) return '';

  const items = players.map((player) => {
    const isActive = player.id === activePlayerId;
    const tint = player.symbol === 'X' ? 'rgba(59,130,246,0.16)' : 'rgba(236,72,153,0.16)';
    const border = player.symbol === 'X' ? 'rgba(59,130,246,0.62)' : 'rgba(236,72,153,0.62)';
    return `
      <div class="xo-role-pill ${isActive ? 'is-active' : ''} symbol-${player.symbol}" style="background:${tint};border-color:${border}">
        <span class="xo-role-symbol">${svgSymbol(player.symbol, '0.9rem')}</span>
        <span class="xo-role-name">${player.nickname}${player.score ? ` · ${player.score}` : ''}</span>
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
      0% { transform: translateY(18px) scale(0.92); opacity: 0; }
      25% { transform: translateY(0) scale(1.02); opacity: 1; }
      70% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-8px) scale(0.98); opacity: 0; }
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
      background: rgba(15,23,42,0.74);
      border: 2px solid rgba(34,211,238,0.55);
      border-radius: 18px;
      color: #e2e8f0;
      font-size: clamp(1.5rem, 5vw, 2.4rem);
      font-weight: 900;
      padding: 0.75rem 1.25rem;
      text-align: center;
      letter-spacing: 0.02em;
      text-shadow: 0 0 12px rgba(34,211,238,0.22);
      animation: xo-turn-pop 1.35s ease-out both;
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
    }
    .xo-role-pill.is-active {
      box-shadow: 0 0 0 2px rgba(34,211,238,0.22);
      transform: translateY(-1px);
    }
    .xo-role-symbol {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.2rem;
      height: 1.2rem;
      border-radius: 999px;
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
    /* ── Persistent turn pulse animations ────────────────────────── */
    @keyframes xo-pulse-blue {
      0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); border-color: rgba(59,130,246,0.45); }
      50% { box-shadow: 0 0 0 5px rgba(59,130,246,0.18), 0 0 22px rgba(59,130,246,0.22); border-color: rgba(59,130,246,0.95); }
    }
    @keyframes xo-pulse-pink {
      0%, 100% { box-shadow: 0 0 0 0 rgba(236,72,153,0); border-color: rgba(236,72,153,0.45); }
      50% { box-shadow: 0 0 0 5px rgba(236,72,153,0.18), 0 0 22px rgba(236,72,153,0.22); border-color: rgba(236,72,153,0.95); }
    }
    @keyframes xo-board-glow-blue {
      0%, 100% { box-shadow: none; }
      50% { box-shadow: 0 0 0 3px rgba(59,130,246,0.22), 0 0 32px rgba(59,130,246,0.14); }
    }
    @keyframes xo-board-glow-pink {
      0%, 100% { box-shadow: none; }
      50% { box-shadow: 0 0 0 3px rgba(236,72,153,0.22), 0 0 32px rgba(236,72,153,0.14); }
    }
    @keyframes xo-tb-in {
      from { opacity: 0; transform: translateY(6px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }
    /* Board wrap glow */
    .xo-board-wrap { border-radius: 14px; }
    .xo-board-wrap.is-X-turn { animation: xo-board-glow-blue 1.8s ease-in-out infinite; }
    .xo-board-wrap.is-O-turn { animation: xo-board-glow-pink 1.8s ease-in-out infinite; }
    /* Active role pill pulse */
    .xo-role-pill.is-active.symbol-X { animation: xo-pulse-blue 1.6s ease-in-out infinite; }
    .xo-role-pill.is-active.symbol-O { animation: xo-pulse-pink 1.6s ease-in-out infinite; }
    /* Persistent turn banner */
    .xo-turn-banner {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      max-width: 330px;
      margin: 0.55rem auto 0;
      border-radius: 14px;
      border: 2px solid rgba(148,163,184,0.2);
      background: rgba(15,23,42,0.55);
      padding: 0.58rem 0.9rem;
      animation: xo-tb-in 0.32s ease-out both;
      backdrop-filter: blur(4px);
    }
    .xo-turn-banner.is-yours { background: rgba(15,23,42,0.78); }
    .xo-turn-banner.is-yours.symbol-X { animation: xo-tb-in 0.32s ease-out both, xo-pulse-blue 1.7s ease-in-out infinite; }
    .xo-turn-banner.is-yours.symbol-O { animation: xo-tb-in 0.32s ease-out both, xo-pulse-pink 1.7s ease-in-out infinite; }
    .xo-turn-banner.is-host.symbol-X  { animation: xo-tb-in 0.32s ease-out both, xo-pulse-blue 2s  ease-in-out infinite; opacity: 0.88; }
    .xo-turn-banner.is-host.symbol-O  { animation: xo-tb-in 0.32s ease-out both, xo-pulse-pink 2s  ease-in-out infinite; opacity: 0.88; }
    .xo-turn-banner.is-theirs { opacity: 0.52; }
    .xo-tb-symbol { flex-shrink:0; display:flex; align-items:center; justify-content:center; width:2.4rem; height:2.4rem; }
    .xo-tb-text   { display:flex; flex-direction:column; gap:0.08rem; min-width:0; }
    .xo-tb-main   { font-size:1rem; font-weight:900; color:#e2e8f0; line-height:1.25; }
    .xo-tb-sub    { font-size:0.72rem; color:rgba(148,163,184,0.75); font-weight:500; }
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

function maybeShowTurnOverlay(xo, socketId, isYourTurn) {
  if (!socketId || !isYourTurn) return;
  const turnSequence = Number(xo?.turnSequence || 0);
  if (!turnSequence) return;
  const key = `${xo.round || 0}:${turnSequence}:${xo.activePlayerId || ''}:${socketId}`;
  if (key === lastTurnOverlayKey) return;
  lastTurnOverlayKey = key;

  const overlay = ensureTurnOverlay();
  const text = overlay.querySelector('.xo-turn-text');
  if (text) text.textContent = '🔥 دورك الآن!';

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
  }, 1500);
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

function renderTurnBanner(containerId, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  ensureOutcomeStyles();
  const { isYours = false, isSpectator = false, activeSymbol = 'X', activeNickname = '', mySymbol = null } = opts;
  const symbol = isYours ? (mySymbol || activeSymbol) : activeSymbol;
  const mainText = isYours
    ? 'دورك الآن!'
    : isSpectator
      ? `${activeNickname} يلعب`
      : `دور ${activeNickname}`;
  const subText = isYours
    ? '⬇️ اختر خانة'
    : isSpectator
      ? 'المباراة جارية'
      : '⌛ انتظر...';
  const stateClass = isYours
    ? `is-yours symbol-${symbol}`
    : isSpectator
      ? `is-host symbol-${symbol}`
      : `is-theirs symbol-${symbol}`;
  const banner = document.createElement('div');
  banner.className = `xo-turn-banner ${stateClass}`;
  banner.innerHTML = `
    <div class="xo-tb-symbol">${svgSymbol(symbol, '1.9rem')}</div>
    <div class="xo-tb-text">
      <span class="xo-tb-main">${mainText}</span>
      <span class="xo-tb-sub">${subText}</span>
    </div>
  `;
  container.appendChild(banner);
}

function renderSpectatorBoard({ data }) {
  const board = Array.isArray(data?.question?.xo?.board) ? data.question.xo.board : Array(9).fill(null);
  const xo = data?.question?.xo || {};
  const activeSymbol = data?.question?.xo?.activeSymbol || 'X';
  const hostGrid = document.getElementById('host-options-grid');
  if (hostGrid) {
    hostGrid.innerHTML = `${renderXoBoardHTML(board, false, activeSymbol, { winningLine: xo.winningLine })}${buildRoleLegendHTML(xo, xo.activePlayerId || null)}`;
  }

  const hostAnswerCounter = document.getElementById('host-answer-counter');
  if (hostAnswerCounter) hostAnswerCounter.textContent = '';

  // Persistent animated turn banner for host
  renderTurnBanner('host-options-grid', {
    isSpectator: true,
    activeSymbol: xo.activeSymbol || 'X',
    activeNickname: xo.activeNickname || 'Player',
  });
}

function renderPlayerBoard({ data, socket, state }) {
  const xo = data?.question?.xo || {};
  const board = Array.isArray(xo.board) ? xo.board : Array(9).fill(null);
  const activePlayerId = xo.activePlayerId;
  const activeNickname = xo.activeNickname || 'Player';
  const activeSymbol = xo.activeSymbol || 'X';
  const challenger = (xo.players || []).find((player) => player?.id === socket.id) || null;
  const isYourTurn = !!challenger && !!activePlayerId && activePlayerId === socket.id;
  const turnInputKey = `${xo.round || 0}:${xo.turnSequence || 0}:${activePlayerId || ''}:${socket?.id || ''}`;

  if (isYourTurn && state.__xoTurnInputKey !== turnInputKey) {
    state.__xoTurnInputKey = turnInputKey;
    state.hasAnswered = false;
  }

  const playerGrid = document.getElementById('player-options-grid');
  if (!playerGrid) return;

  playerGrid.innerHTML = `${renderXoBoardHTML(board, isYourTurn, activeSymbol, { winningLine: xo.winningLine })}${buildRoleLegendHTML(xo, activePlayerId || null)}`;

  // Replace the question title with this player's own symbol SVG
  const titleEl = document.getElementById('player-question-text');
  if (titleEl) {
    const mySymbol = challenger?.symbol || null;
    if (mySymbol) {
      titleEl.innerHTML = svgSymbol(mySymbol, '2.6rem');
      titleEl.style.display = 'flex';
      titleEl.style.justifyContent = 'center';
      titleEl.style.alignItems = 'center';
    } else {
      // Spectator: show both symbols side by side
      titleEl.innerHTML = `<span style="display:inline-flex;gap:0.5rem;align-items:center;">${svgX('1.75rem')}${svgO('1.75rem')}</span>`;
      titleEl.style.display = 'flex';
      titleEl.style.justifyContent = 'center';
    }
  }

  // Hide bottom status text
  const answerMsg = document.getElementById('player-answered-msg');
  if (answerMsg) { answerMsg.style.display = 'none'; answerMsg.textContent = ''; }

  // Persistent animated turn banner — stays until this player clicks
  renderTurnBanner('player-options-grid', {
    isYours: isYourTurn,
    isSpectator: !challenger,
    activeSymbol,
    activeNickname,
    mySymbol: challenger?.symbol || null,
  });

  maybeShowTurnOverlay(xo, socket?.id, isYourTurn);
  updateChallengerBadge({ isYourTurn, challenger, activeNickname });

  playerGrid.querySelectorAll('[data-xo-cell]').forEach((cellButton) => {
    cellButton.addEventListener('click', () => {
      if (!isYourTurn || state.hasAnswered) return;
      const cellIndex = Number(cellButton.getAttribute('data-xo-cell'));
      if (!Number.isInteger(cellIndex)) return;
      state.hasAnswered = true;
      socket.emit('player:answer', {
        questionIndex: data.questionIndex,
        answer: { cellIndex },
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
  const isWinner = !!winnerId && socket.id === winnerId;
  const isLoser = !!loserId && socket.id === loserId;

  let title = '🎮 New Round Incoming';
  let subtitle = `Next duel starts in ${nextRoundSec}s`;
  let kind = 'neutral';

  if (isDraw) {
    title = '🤝 Draw!';
    subtitle = `No one lost this round • Restarting in ${nextRoundSec}s`;
  } else if (isWinner) {
    title = '🏆 You Win!';
    subtitle = `Great move! Get ready for your next challenger in ${nextRoundSec}s`;
    kind = 'win';
  } else if (isLoser) {
    title = '💥 You Lost';
    subtitle = `You sit out this round, then rejoin next round • ${nextRoundSec}s`;
    kind = 'lose';

    const shakeKey = `${xo.round || 0}:${winnerId || ''}:${loserId || ''}:${socket.id}`;
    if (shakeKey !== lastLoseShakeKey) {
      lastLoseShakeKey = shakeKey;
      triggerScreenShake({ axis: 'both', distancePx: 11, durationMs: 520 });
    }
  } else {
    title = '👀 Spectating Round Result';
    subtitle = `Winner keeps playing against a random challenger in ${nextRoundSec}s`;
  }

  if (answerMsg) { answerMsg.style.display = 'none'; answerMsg.textContent = ''; }

  showOutcomeBanner({
    layoutId: 'player-question-layout',
    kind,
    title,
    subtitle,
  });
}

export const xoDuelRuntime = {
  id: 'xo-duel',

  onGameQuestion({ data, state, socket, showView }) {
    applyXoHeader({ state, data });

    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    showView(isHostOnly ? 'view-host-question' : 'view-player-question');

    const xo = data?.question?.xo || {};
    if (xo.phase === 'round-result') {
      renderRoundResultPhase({ data, state, socket, isHostOnly });
      return true;
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
