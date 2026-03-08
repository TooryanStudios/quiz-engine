const ISLAND_DICE_STYLE_ID = 'island-dice-runtime-style';
const islandDiceViewState = {
  host: { lastAnimatedSequence: -1 },
  player: { lastAnimatedSequence: -1 },
};

function ensureIslandDiceStyles() {
  if (document.getElementById(ISLAND_DICE_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = ISLAND_DICE_STYLE_ID;
  style.textContent = `
    .island-dice-shell {
      width: 100%;
      max-width: 980px;
      margin: 0 auto;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 12px;
      padding: 8px 10px 14px;
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(29, 48, 110, 0.86), rgba(12, 24, 65, 0.94));
      border: 1px solid rgba(147, 197, 253, 0.24);
      box-shadow: 0 20px 38px rgba(2, 6, 23, 0.32);
    }

    .island-dice-hud {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .island-dice-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 0.84rem;
      font-weight: 700;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.35);
      color: #dbeafe;
    }

    .island-dice-board-wrap {
      position: relative;
      min-height: 320px;
      border-radius: 14px;
      padding: 14px;
      background: radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.2), rgba(12, 24, 65, 0.14) 58%, rgba(12, 24, 65, 0.02) 78%);
    }

    .island-dice-board {
      position: relative;
      width: min(92vw, 680px);
      height: min(58vw, 420px);
      max-width: 680px;
      max-height: 420px;
      margin: 0 auto;
      transform: perspective(900px) rotateX(28deg);
      transform-style: preserve-3d;
    }

    .island-dice-tile {
      position: absolute;
      width: 58px;
      height: 58px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 700;
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.22);
      box-shadow: 0 8px 12px rgba(2, 6, 23, 0.32);
      transform: translateZ(0);
      user-select: none;
      pointer-events: none;
    }

    .island-dice-tile.reward { background: linear-gradient(180deg, #10b981, #047857); }
    .island-dice-tile.mystery { background: linear-gradient(180deg, #a855f7, #7e22ce); }
    .island-dice-tile.event { background: linear-gradient(180deg, #fb7185, #e11d48); }

    .island-dice-avatar {
      position: absolute;
      width: 52px;
      height: 52px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.55rem;
      border: 2px solid rgba(255,255,255,0.85);
      background: rgba(15, 23, 42, 0.75);
      box-shadow: 0 10px 16px rgba(2, 6, 23, 0.4);
      transition: left 0.5s ease, top 0.5s ease, transform 0.36s ease;
      transform: translate(-50%, -52%) translateZ(12px);
      z-index: 5;
      user-select: none;
      pointer-events: none;
    }

    .island-dice-avatar.is-turn {
      box-shadow: 0 0 0 3px rgba(253, 224, 71, 0.45), 0 12px 16px rgba(2, 6, 23, 0.42);
      animation: islandDicePulse 1.2s ease-in-out infinite;
    }

    .island-dice-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .island-dice-roll-btn {
      width: min(300px, 86vw);
      height: 84px;
      border: 0;
      border-radius: 24px;
      background: linear-gradient(180deg, #f59e0b, #ea580c);
      color: #fff;
      font-size: 1.2rem;
      font-weight: 900;
      letter-spacing: 0.3px;
      cursor: pointer;
      box-shadow: 0 16px 24px rgba(194, 65, 12, 0.35);
      transition: transform 0.12s ease, filter 0.18s ease, opacity 0.18s ease;
    }

    .island-dice-roll-btn:hover { filter: brightness(1.08); }
    .island-dice-roll-btn:active { transform: translateY(1px) scale(0.99); }
    .island-dice-roll-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .island-dice-auto {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 0.86rem;
      color: #dbeafe;
      font-weight: 700;
    }

    .island-dice-auto input { width: 16px; height: 16px; accent-color: #22c55e; }

    @keyframes islandDicePulse {
      0%, 100% { transform: translate(-50%, -52%) translateZ(12px) scale(1); }
      50% { transform: translate(-50%, -52%) translateZ(12px) scale(1.06); }
    }
  `;
  document.head.appendChild(style);
}

function getViewContext(state) {
  const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
  const viewPrefix = isHostOnly ? 'host' : 'player';
  return {
    isHostOnly,
    viewPrefix,
    optionsGridEl: document.getElementById(`${viewPrefix}-options-grid`),
    questionTextEl: document.getElementById(`${viewPrefix}-question-text`),
    answerMsgEl: document.getElementById(`${viewPrefix}-answered-msg`),
  };
}

function tileScreenPosition(index, total, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = width * 0.36;
  const radiusY = height * 0.27;
  const angle = ((index / total) * Math.PI * 2) - Math.PI / 2;
  return {
    left: centerX + Math.cos(angle) * radiusX,
    top: centerY + Math.sin(angle) * radiusY,
  };
}

function setAvatarToTile(avatarEl, tileIndex, boardSize, boardWidth, boardHeight) {
  const pos = tileScreenPosition(tileIndex, boardSize, boardWidth, boardHeight);
  avatarEl.style.left = `${pos.left}px`;
  avatarEl.style.top = `${pos.top}px`;
}

function animateHopPath({ avatarEl, fromTile, steps, boardSize, boardWidth, boardHeight }) {
  if (!avatarEl || !Number.isFinite(fromTile) || !Number.isFinite(steps) || steps <= 0) return;

  avatarEl.style.transition = 'none';
  setAvatarToTile(avatarEl, fromTile % boardSize, boardSize, boardWidth, boardHeight);

  for (let i = 1; i <= steps; i++) {
    const stepTile = (fromTile + i) % boardSize;
    const delay = i * 160;
    setTimeout(() => {
      avatarEl.style.transition = 'left 0.15s ease, top 0.15s ease, transform 0.15s ease';
      avatarEl.style.transform = 'translate(-50%, -56%) translateZ(16px) scale(1.04)';
      setAvatarToTile(avatarEl, stepTile, boardSize, boardWidth, boardHeight);
      setTimeout(() => {
        avatarEl.style.transform = 'translate(-50%, -52%) translateZ(12px) scale(1)';
      }, 120);
    }, delay);
  }
}

function renderIslandDiceView({ data, state, socket }) {
  const question = data?.question || {};
  const boardState = question.islandDice || {};
  const board = Array.isArray(boardState.board) ? boardState.board : [];
  const players = Array.isArray(boardState.players) ? boardState.players : [];
  const boardSize = Number(boardState.boardSize) || board.length || 24;
  const currentTurnId = boardState.turnPlayerId || null;
  const turnsTaken = Number(boardState.turnsTaken || 0);
  const totalTurns = Number(boardState.totalTurns || 0);
  const status = boardState.status || 'playing';
  const standings = Array.isArray(boardState.standings) ? boardState.standings : [];
  const winnerId = boardState.winnerId || null;
  const myPlayer = players.find((player) => player.id === socket.id) || null;
  const myCoins = myPlayer ? Number(myPlayer.coins || 0) : 0;

  const ctx = getViewContext(state);
  if (!ctx.optionsGridEl) return false;
  ensureIslandDiceStyles();

  if (ctx.questionTextEl) ctx.questionTextEl.textContent = 'Island Dice Adventure';

  const shell = document.createElement('div');
  shell.className = 'island-dice-shell';

  const hud = document.createElement('div');
  hud.className = 'island-dice-hud';
  const coinChip = document.createElement('div');
  coinChip.className = 'island-dice-chip';
  coinChip.textContent = `Coins: ${myCoins}`;
  const turnChip = document.createElement('div');
  turnChip.className = 'island-dice-chip';
  const turnPlayer = players.find((player) => player.id === currentTurnId);
  turnChip.textContent = status === 'finished'
    ? `Winner: ${standings[0]?.nickname || 'TBD'}`
    : (turnPlayer ? `Turn: ${turnPlayer.nickname}` : 'Turn: waiting');

  const progressChip = document.createElement('div');
  progressChip.className = 'island-dice-chip';
  progressChip.textContent = totalTurns > 0 ? `Turns: ${turnsTaken}/${totalTurns}` : 'Turns: --';
  hud.appendChild(coinChip);
  hud.appendChild(turnChip);
  hud.appendChild(progressChip);

  const boardWrap = document.createElement('div');
  boardWrap.className = 'island-dice-board-wrap';
  const boardEl = document.createElement('div');
  boardEl.className = 'island-dice-board';

  const boardWidth = 680;
  const boardHeight = 420;

  board.forEach((tile, index) => {
    const tileEl = document.createElement('div');
    const tileType = tile?.type || 'reward';
    tileEl.className = `island-dice-tile ${tileType}`;
    const pos = tileScreenPosition(index, boardSize, boardWidth, boardHeight);
    tileEl.style.left = `${pos.left - 29}px`;
    tileEl.style.top = `${pos.top - 29}px`;
    tileEl.textContent = tileType === 'reward' ? `+${Number(tile?.value || 0)}` : (tileType === 'mystery' ? '🎁' : '✨');
    boardEl.appendChild(tileEl);
  });

  const avatarByPlayerId = new Map();

  players.forEach((player) => {
    const avatarEl = document.createElement('div');
    avatarEl.className = 'island-dice-avatar';
    if (player.id === currentTurnId) avatarEl.classList.add('is-turn');
    avatarEl.textContent = player.avatar || '🎮';

    const tileIndex = Number(player.position || 0) % boardSize;
    const pos = tileScreenPosition(tileIndex, boardSize, boardWidth, boardHeight);
    avatarEl.style.left = `${pos.left}px`;
    avatarEl.style.top = `${pos.top}px`;
    avatarEl.title = `${player.nickname} • ${Number(player.coins || 0)} coins`;
    avatarByPlayerId.set(player.id, avatarEl);
    boardEl.appendChild(avatarEl);
  });

  const seq = Number(boardState.actionSequence || 0);
  const action = boardState.lastAction || null;
  const viewState = ctx.viewPrefix === 'host' ? islandDiceViewState.host : islandDiceViewState.player;
  if (
    action &&
    Number.isFinite(action.roll) &&
    Number(action.roll) > 0 &&
    Number.isFinite(action.fromTile) &&
    seq > Number(viewState.lastAnimatedSequence || -1)
  ) {
    const actorAvatar = avatarByPlayerId.get(action.actorId);
    if (actorAvatar) {
      animateHopPath({
        avatarEl: actorAvatar,
        fromTile: Number(action.fromTile),
        steps: Number(action.roll),
        boardSize,
        boardWidth,
        boardHeight,
      });
    }
  }
  viewState.lastAnimatedSequence = seq;

  boardWrap.appendChild(boardEl);

  const controls = document.createElement('div');
  controls.className = 'island-dice-controls';

  const rollBtn = document.createElement('button');
  rollBtn.className = 'island-dice-roll-btn';
  rollBtn.type = 'button';
  rollBtn.textContent = '🎲 Roll Dice';

  const canRoll = status === 'playing' && !!myPlayer && myPlayer.id === currentTurnId;
  rollBtn.disabled = !canRoll;

  rollBtn.onclick = () => {
    if (!canRoll) return;
    socket.emit('player:answer', {
      questionIndex: data?.questionIndex,
      answer: { type: 'island_roll' },
    });
  };

  const autoLabel = document.createElement('label');
  autoLabel.className = 'island-dice-auto';
  const autoCheckbox = document.createElement('input');
  autoCheckbox.type = 'checkbox';
  autoCheckbox.checked = !!myPlayer?.autoSpin;
  autoCheckbox.disabled = !myPlayer || status !== 'playing';
  autoCheckbox.onchange = () => {
    if (!myPlayer) return;
    socket.emit('player:answer', {
      questionIndex: data?.questionIndex,
      answer: {
        type: 'island_auto_toggle',
        enabled: !!autoCheckbox.checked,
      },
    });
  };
  const autoText = document.createElement('span');
  autoText.textContent = 'Auto-spin';
  autoLabel.appendChild(autoCheckbox);
  autoLabel.appendChild(autoText);

  controls.appendChild(rollBtn);
  controls.appendChild(autoLabel);

  if (status === 'finished' && standings.length > 0) {
    const summary = document.createElement('div');
    summary.className = 'island-dice-chip';
    const top = standings.slice(0, 3).map((entry) => {
      const mark = entry.id === winnerId ? '🏆' : '•';
      return `${mark} ${entry.nickname} ${entry.coins}`;
    });
    summary.textContent = top.join('  |  ');
    controls.appendChild(summary);
  }

  shell.appendChild(hud);
  shell.appendChild(boardWrap);
  shell.appendChild(controls);

  ctx.optionsGridEl.innerHTML = '';
  ctx.optionsGridEl.appendChild(shell);

  if (ctx.answerMsgEl) {
    const action = boardState.lastAction;
    ctx.answerMsgEl.textContent = action?.message || 'Roll the dice and collect coins.';
  }

  return true;
}

export const islandDiceAdventureRuntime = {
  id: 'island-dice-adventure',

  onGameStart({ state }) {
    const msgEl = document.getElementById('player-answered-msg');
    if (state.role !== 'host' && msgEl) {
      msgEl.textContent = 'Island Dice Adventure is ready.';
    }
    return false;
  },

  onGameQuestion({ data, state, socket, showView }) {
    const question = data?.question;
    if (!question || (question.type !== 'island_dice' && !question.islandDice)) return false;

    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    showView(isHostOnly ? 'view-host-question' : 'view-player-question');
    return renderIslandDiceView({ data, state, socket });
  },
};
