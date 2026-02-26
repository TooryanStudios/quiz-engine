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

function buildTurnNote(xo = {}) {
  const players = Array.isArray(xo.players) ? xo.players : [];
  const activePlayerId = xo.activePlayerId || null;
  const activeNickname = xo.activeNickname || '...';
  const activeSymbol = xo.activeSymbol || 'X';

  const playersLine = players
    .map((player) => `${player.id === activePlayerId ? '👉 ' : ''}${player.symbol}: ${player.nickname} (${player.score || 0})`)
    .join(' • ');

  const turnLine = `🎯 الدور الآن: ${activeNickname} (${activeSymbol})`;
  return playersLine ? `${turnLine} • ${playersLine}` : turnLine;
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
    hostGrid.innerHTML = renderXoBoardHTML(board, false, activeSymbol, { winningLine: xo.winningLine });
  }

  const hostAnswerCounter = document.getElementById('host-answer-counter');
  if (hostAnswerCounter) {
    hostAnswerCounter.textContent = buildTurnNote(xo);
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

  playerGrid.innerHTML = renderXoBoardHTML(board, isYourTurn, activeSymbol, { winningLine: xo.winningLine });

  const answerMsg = document.getElementById('player-answered-msg');
  const turnNote = buildTurnNote(xo);
  if (answerMsg) {
    if (!challenger) {
      answerMsg.textContent = `👀 أنت متفرج • ${turnNote}`;
    } else if (isYourTurn) {
      answerMsg.textContent = `⭕ دورك الآن (${challenger.symbol || activeSymbol}) • ${turnNote}`;
    } else {
      answerMsg.textContent = `⌛ انتظر ${activeNickname} (${activeSymbol}) • ${turnNote}`;
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
      hostGrid.innerHTML = renderXoBoardHTML(board, false, xo.activeSymbol || 'X', { winningLine: xo.winningLine || xo.result?.winningLine });
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

  const playerGrid = document.getElementById('player-options-grid');
  if (playerGrid) {
    playerGrid.innerHTML = renderXoBoardHTML(board, false, xo.activeSymbol || 'X', { winningLine: xo.winningLine || xo.result?.winningLine });
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
  } else {
    title = '👀 Spectating Round Result';
    subtitle = `Winner keeps playing against a random challenger in ${nextRoundSec}s`;
  }

  if (answerMsg) {
    answerMsg.textContent = `${title} • ${buildTurnNote(xo)}`;
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
