import { triggerScreenShake } from '../../utils/effects.js?v=121';

function renderXoBoardHTML(board, interactive, activeSymbol, options = {}) {
  const winningLine = Array.isArray(options.winningLine) ? new Set(options.winningLine) : null;
  const cells = board.map((cell, index) => {
    const value = cell || '·';
    const disabled = !interactive || !!cell;
    const isWinningCell = !!winningLine && winningLine.has(index);
    const bg = cell === 'X' ? 'rgba(59, 130, 246, 0.2)' : cell === 'O' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(15, 23, 42, 0.4)';
    const border = isWinningCell
      ? '#22d3ee'
      : (cell === 'X' ? '#3b82f6' : cell === 'O' ? '#ec4899' : 'var(--border-strong)');
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
          color:${cell === 'O' ? '#f9a8d4' : '#bfdbfe'};
          font-size:2rem;
          font-weight:900;
          box-shadow:${isWinningCell ? '0 0 0 2px rgba(34,211,238,0.35), 0 0 18px rgba(34,211,238,0.25)' : 'none'};
          cursor:${disabled ? 'not-allowed' : 'pointer'};
          opacity:${disabled ? 0.85 : 1};
        "
        title="${disabled ? 'غير متاح' : `اختر الخانة (${activeSymbol})`}"
      >${value}</button>
    `;
  }).join('');

  return `<div style="display:grid;grid-template-columns:repeat(3,minmax(76px,1fr));gap:0.55rem;max-width:330px;margin:0.35rem auto 0;">${cells}</div>`;
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
      <div class="xo-role-pill ${isActive ? 'is-active' : ''}" style="background:${tint};border-color:${border}">
        <span class="xo-role-symbol">${player.symbol}</span>
        <span class="xo-role-name">${player.nickname}</span>
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

function maybeShowTurnOverlay(xo, socketId, isYourTurn, challenger) {
  if (!socketId || !challenger || !isYourTurn) return;
  const turnSequence = Number(xo?.turnSequence || 0);
  if (!turnSequence) return;
  const board = Array.isArray(xo?.board) ? xo.board : [];
  const boardFilled = board.filter(Boolean).length;
  const key = `${xo.round || 0}:${turnSequence || 'na'}:${xo.activePlayerId || ''}:${boardFilled}:${socketId}`;
  if (key === lastTurnOverlayKey) return;
  lastTurnOverlayKey = key;

  const overlay = ensureTurnOverlay();
  const text = overlay.querySelector('.xo-turn-text');
  if (text) text.textContent = '🔥 دورك الآن!';

  overlay.classList.remove('is-showing');
  void overlay.offsetWidth;
  overlay.classList.add('is-showing');

  setTimeout(() => {
    overlay.classList.remove('is-showing');
  }, 1400);
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
  const title = data?.question?.text || 'X O Duel';
  if (hostText) hostText.textContent = title;
  if (playerText) playerText.textContent = title;

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
    hostGrid.innerHTML = `${renderXoBoardHTML(board, false, activeSymbol, { winningLine: xo.winningLine })}${buildRoleLegendHTML(xo, xo.activePlayerId || null)}`;
  }

  const hostAnswerCounter = document.getElementById('host-answer-counter');
  if (hostAnswerCounter) {
    const { turnLine, playersLine } = buildTurnLines(xo);
    setCompactTwoLineNote(hostAnswerCounter, turnLine, playersLine);
  }
}

function renderPlayerBoard({ data, socket, state }) {
  const xo = data?.question?.xo || {};
  const board = Array.isArray(xo.board) ? xo.board : Array(9).fill(null);
  const activePlayerId = xo.activePlayerId;
  const activeNickname = xo.activeNickname || 'Player';
  const activeSymbol = xo.activeSymbol || 'X';
  const challenger = (xo.players || []).find((player) => player?.id === socket.id) || null;
  const isYourTurn = !!challenger && !!activePlayerId && activePlayerId === socket.id;

  const playerGrid = document.getElementById('player-options-grid');
  if (!playerGrid) return;

  playerGrid.innerHTML = `${renderXoBoardHTML(board, isYourTurn, activeSymbol, { winningLine: xo.winningLine })}${buildRoleLegendHTML(xo, activePlayerId || null)}`;

  const answerMsg = document.getElementById('player-answered-msg');
  const { turnLine, playersLine } = buildTurnLines(xo);
  maybeShowTurnOverlay(xo, socket?.id, isYourTurn, challenger);
  updateChallengerBadge({ isYourTurn, challenger, activeNickname });

  if (answerMsg) {
    if (!challenger) {
      setCompactTwoLineNote(answerMsg, `👀 أنت متفرج • ${turnLine}`, playersLine);
    } else if (isYourTurn) {
      setCompactTwoLineNote(answerMsg, `⭕ دورك الآن (${challenger.symbol || activeSymbol}) • ${turnLine}`, playersLine);
    } else {
      setCompactTwoLineNote(answerMsg, `⌛ انتظر ${activeNickname} (${activeSymbol}) • ${turnLine}`, playersLine);
    }
  }

  playerGrid.querySelectorAll('[data-xo-cell]').forEach((cellButton) => {
    cellButton.addEventListener('click', () => {
      if (!isYourTurn || state.hasAnswered) return;
      const cellIndex = Number(cellButton.getAttribute('data-xo-cell'));
      if (!Number.isInteger(cellIndex)) return;
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

  if (answerMsg) {
    const { playersLine } = buildTurnLines(xo);
    setCompactTwoLineNote(answerMsg, title, playersLine || subtitle);
  }

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
