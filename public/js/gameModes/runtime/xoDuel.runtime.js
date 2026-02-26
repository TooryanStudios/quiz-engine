function renderXoBoardHTML(board, interactive, activeSymbol) {
  const cells = board.map((cell, index) => {
    const value = cell || '·';
    const disabled = !interactive || !!cell;
    const bg = cell === 'X' ? 'rgba(59, 130, 246, 0.2)' : cell === 'O' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(15, 23, 42, 0.4)';
    const border = cell === 'X' ? '#3b82f6' : cell === 'O' ? '#ec4899' : 'var(--border-strong)';
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
  const hostProgress = document.getElementById('host-q-progress');
  const playerProgress = document.getElementById('player-q-progress');
  const progressText = `Round ${qIndex + 1} / ${total}`;
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
    hostGrid.innerHTML = renderXoBoardHTML(board, false, activeSymbol);
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

  playerGrid.innerHTML = renderXoBoardHTML(board, isYourTurn, activeSymbol);

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

export const xoDuelRuntime = {
  id: 'xo-duel',

  onGameQuestion({ data, state, socket, showView }) {
    applyXoHeader({ state, data });

    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    showView(isHostOnly ? 'view-host-question' : 'view-player-question');

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
