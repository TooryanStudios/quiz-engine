const ISLAND_DICE_STYLE_ID = 'island-dice-runtime-style';
const islandDiceViewState = {
  host: { lastAnimatedSequence: -1, lastDiceSequence: -1 },
  player: { lastAnimatedSequence: -1, lastDiceSequence: -1 },
};

function ensureIslandDiceStyles() {
  if (document.getElementById(ISLAND_DICE_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = ISLAND_DICE_STYLE_ID;
  style.textContent = `
    .island-dice-shell {
      width: 100%;
      max-width: min(920px, 100%);
      grid-column: 1 / -1;
      margin: 0 auto;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 10px;
      padding: 8px 8px 10px;
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(29, 48, 110, 0.86), rgba(12, 24, 65, 0.94));
      border: 1px solid rgba(147, 197, 253, 0.24);
      box-shadow: 0 20px 38px rgba(2, 6, 23, 0.32);
      overflow: hidden;
    }

    .island-dice-hud {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .island-dice-turn-order {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: thin;
    }

    .island-dice-turn-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(30, 41, 59, 0.64);
      border: 1px solid rgba(148, 163, 184, 0.32);
      color: #cbd5e1;
      font-size: 0.78rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .island-dice-turn-pill.is-active {
      background: rgba(251, 191, 36, 0.24);
      border-color: rgba(251, 191, 36, 0.62);
      color: #fef9c3;
    }

    .island-dice-progress-list {
      display: grid;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: rgba(15, 23, 42, 0.34);
    }

    .island-dice-progress-row {
      display: grid;
      grid-template-columns: minmax(110px, 1fr) minmax(120px, 3fr) auto;
      align-items: center;
      gap: 8px;
      font-size: 0.74rem;
      color: #dbeafe;
    }

    .island-dice-progress-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 700;
    }

    .island-dice-progress-track {
      position: relative;
      height: 8px;
      border-radius: 999px;
      background: rgba(30, 41, 59, 0.92);
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .island-dice-progress-fill {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      border-radius: inherit;
      background: linear-gradient(90deg, #22c55e, #eab308);
      min-width: 2px;
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
      min-height: 270px;
      border-radius: 14px;
      padding: 10px;
      background: radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.2), rgba(12, 24, 65, 0.14) 58%, rgba(12, 24, 65, 0.02) 78%);
    }

    .island-dice-board {
      position: relative;
      width: min(86vw, 560px);
      height: min(46vw, 330px);
      max-width: 560px;
      max-height: 330px;
      margin: 0 auto;
      transform: perspective(900px) rotateX(28deg);
      transform-style: preserve-3d;
    }

    .island-dice-tile {
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 12px;
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
      width: 46px;
      height: 46px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
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
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .island-dice-dice-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .island-die-cube {
      width: 58px;
      height: 58px;
      border-radius: 14px;
      background: linear-gradient(145deg, #fff 0%, #f1f5f9 100%);
      border: 2px solid rgba(15, 23, 42, 0.14);
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.55rem;
      font-weight: 900;
      box-shadow: 0 8px 18px rgba(2, 6, 23, 0.24);
      transform-style: preserve-3d;
      transition: transform 0.2s ease;
    }

    .island-die-cube.rolling {
      animation: islandDiceCubeRoll 0.78s cubic-bezier(.2,.82,.25,1);
    }

    .island-dice-sum-chip {
      min-width: 58px;
      height: 32px;
      padding: 0 12px;
      border-radius: 999px;
      background: rgba(249, 115, 22, 0.22);
      border: 1px solid rgba(251, 146, 60, 0.55);
      color: #ffedd5;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 800;
    }

    .island-dice-roll-btn {
      width: min(320px, 84vw);
      height: 86px;
      border: 0;
      border-radius: 999px;
      background: radial-gradient(circle at 50% 35%, #65e058, #20a13d 72%);
      color: #fff;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 0.2px;
      cursor: pointer;
      box-shadow: inset 0 -8px 18px rgba(21, 128, 61, 0.5), 0 10px 24px rgba(5, 46, 22, 0.42);
      transition: transform 0.12s ease, filter 0.18s ease, opacity 0.18s ease;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .island-dice-roll-btn::before {
      content: '';
      position: absolute;
      inset: 8px;
      border-radius: 999px;
      border: 2px solid rgba(255, 255, 255, 0.22);
      pointer-events: none;
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

    @keyframes islandDiceCubeRoll {
      0% { transform: rotateX(0deg) rotateY(0deg) scale(1); }
      30% { transform: rotateX(180deg) rotateY(120deg) scale(1.08); }
      65% { transform: rotateX(320deg) rotateY(255deg) scale(1.02); }
      100% { transform: rotateX(360deg) rotateY(360deg) scale(1); }
    }

    @media (max-height: 860px) {
      .island-dice-board-wrap { min-height: 230px; }
      .island-dice-board {
        width: min(82vw, 500px);
        height: min(42vw, 280px);
      }
      .island-dice-roll-btn { height: 60px; }
    }

    @media (max-width: 680px) {
      .island-dice-hud { gap: 8px; }
      .island-dice-chip { font-size: 0.76rem; padding: 5px 8px; }
      .island-dice-board {
        width: min(92vw, 460px);
        height: min(48vw, 250px);
      }
      .island-dice-tile {
        width: 42px;
        height: 42px;
        font-size: 0.64rem;
      }
      .island-dice-avatar {
        width: 38px;
        height: 38px;
        font-size: 1.15rem;
      }
      .island-dice-roll-btn {
        width: min(260px, 84vw);
        height: 66px;
        border-radius: 18px;
        font-size: 0.95rem;
      }

      .island-die-cube {
        width: 48px;
        height: 48px;
        font-size: 1.2rem;
      }

      .island-dice-progress-row {
        grid-template-columns: 1fr;
        gap: 4px;
      }
    }

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
  const targetCoins = Number(boardState.targetCoins || 0);
  const lastRollByPlayer = (boardState.lastRollByPlayer && typeof boardState.lastRollByPlayer === 'object')
    ? boardState.lastRollByPlayer
    : {};
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
  const targetChip = document.createElement('div');
  targetChip.className = 'island-dice-chip';
  targetChip.textContent = targetCoins > 0 ? `Target: ${targetCoins} coins` : 'Target: --';
  hud.appendChild(coinChip);
  hud.appendChild(turnChip);
  hud.appendChild(progressChip);
  hud.appendChild(targetChip);

  const boardWrap = document.createElement('div');
  boardWrap.className = 'island-dice-board-wrap';
  const boardEl = document.createElement('div');
  boardEl.className = 'island-dice-board';

  const turnOrderRow = document.createElement('div');
  turnOrderRow.className = 'island-dice-turn-order';
  players.forEach((player) => {
    const pill = document.createElement('div');
    pill.className = `island-dice-turn-pill${player.id === currentTurnId ? ' is-active' : ''}`;
    const botTag = player.isBot ? ' (CPU)' : '';
    pill.textContent = `${player.avatar || '🎮'} ${player.nickname}${botTag}`;
    turnOrderRow.appendChild(pill);
  });

  const progressList = document.createElement('div');
  progressList.className = 'island-dice-progress-list';
  const standingsByCoins = [...players].sort((a, b) => Number(b.coins || 0) - Number(a.coins || 0));
  standingsByCoins.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'island-dice-progress-row';

    const name = document.createElement('div');
    name.className = 'island-dice-progress-name';
    name.textContent = `${entry.avatar || '🎮'} ${entry.nickname}`;

    const track = document.createElement('div');
    track.className = 'island-dice-progress-track';
    const fill = document.createElement('div');
    fill.className = 'island-dice-progress-fill';
    const ratio = targetCoins > 0 ? Math.min(100, Math.max(0, (Number(entry.coins || 0) / targetCoins) * 100)) : 0;
    fill.style.width = `${ratio}%`;
    track.appendChild(fill);

    const value = document.createElement('div');
    value.textContent = `${Number(entry.coins || 0)} / ${targetCoins || '--'}`;

    row.appendChild(name);
    row.appendChild(track);
    row.appendChild(value);
    progressList.appendChild(row);
  });

  const boardWidth = 560;
  const boardHeight = 330;

  board.forEach((tile, index) => {
    const tileEl = document.createElement('div');
    const tileType = tile?.type || 'reward';
    tileEl.className = `island-dice-tile ${tileType}`;
    const pos = tileScreenPosition(index, boardSize, boardWidth, boardHeight);
    tileEl.style.left = `${pos.left - 25}px`;
    tileEl.style.top = `${pos.top - 25}px`;
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
  const actionRoll = Number(action?.roll || 0);
  const viewState = ctx.viewPrefix === 'host' ? islandDiceViewState.host : islandDiceViewState.player;
  const isFreshMoveSequence = seq > Number(viewState.lastAnimatedSequence || -1);
  const isFreshDiceSequence = seq > Number(viewState.lastDiceSequence || -1);

  boardWrap.appendChild(boardEl);

  const controls = document.createElement('div');
  controls.className = 'island-dice-controls';

  const diceRow = document.createElement('div');
  diceRow.className = 'island-dice-dice-row';

  const diceOwners = players.slice(0, 2);
  const dieByPlayerId = new Map();
  const ensureOwner = (fallbackLabel, fallbackAvatar) => ({
    id: fallbackLabel,
    nickname: fallbackLabel,
    avatar: fallbackAvatar,
  });
  while (diceOwners.length < 2) {
    const label = diceOwners.length === 0 ? 'P1' : 'P2';
    const avatar = diceOwners.length === 0 ? '🎮' : '🧠';
    diceOwners.push(ensureOwner(label, avatar));
  }

  diceOwners.forEach((owner) => {
    const dieWrap = document.createElement('div');
    dieWrap.style.display = 'grid';
    dieWrap.style.justifyItems = 'center';
    dieWrap.style.gap = '4px';

    const dieLabel = document.createElement('div');
    dieLabel.style.fontSize = '0.7rem';
    dieLabel.style.color = 'rgba(219, 234, 254, 0.92)';
    dieLabel.style.fontWeight = '700';
    dieLabel.textContent = `${owner.avatar || '🎲'} ${owner.nickname}`;

    const dieEl = document.createElement('div');
    dieEl.className = 'island-die-cube';
    const persisted = Number(lastRollByPlayer[owner.id] || 1);
    dieEl.textContent = String(Math.max(1, Math.min(6, persisted)));

    dieByPlayerId.set(owner.id, dieEl);
    dieWrap.appendChild(dieLabel);
    dieWrap.appendChild(dieEl);
    diceRow.appendChild(dieWrap);
  });

  const sumChip = document.createElement('div');
  sumChip.className = 'island-dice-sum-chip';
  sumChip.textContent = `Rolled: ${actionRoll > 0 ? actionRoll : '--'}`;
  diceRow.appendChild(sumChip);

  const rollBtn = document.createElement('button');
  rollBtn.className = 'island-dice-roll-btn';
  rollBtn.type = 'button';
  const currentTurnPlayer = players.find((player) => player.id === currentTurnId);
  const isCpuTurn = !!currentTurnPlayer?.isBot;
  rollBtn.textContent = isCpuTurn ? 'CPU Rolling...' : '🎲 Roll Dice';

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

  controls.appendChild(diceRow);
  controls.appendChild(rollBtn);
  controls.appendChild(autoLabel);

  const actionDieEl = action?.actorId ? dieByPlayerId.get(action.actorId) : null;
  if (action && actionRoll > 0 && actionDieEl && isFreshDiceSequence) {
    actionDieEl.classList.add('rolling');
    setTimeout(() => {
      actionDieEl.textContent = String(Math.max(1, Math.min(6, actionRoll)));
      sumChip.textContent = `Rolled: ${actionRoll}`;
      actionDieEl.classList.remove('rolling');
    }, 760);
    viewState.lastDiceSequence = seq;
  }

  if (
    action &&
    Number.isFinite(action.roll) &&
    Number(action.roll) > 0 &&
    Number.isFinite(action.fromTile) &&
    isFreshMoveSequence
  ) {
    const actorAvatar = avatarByPlayerId.get(action.actorId);
    if (actorAvatar) {
      const moveDelayMs = isFreshDiceSequence ? 980 : 120;
      setTimeout(() => {
        animateHopPath({
          avatarEl: actorAvatar,
          fromTile: Number(action.fromTile),
          steps: Number(action.roll),
          boardSize,
          boardWidth,
          boardHeight,
        });
      }, moveDelayMs);
    }
    viewState.lastAnimatedSequence = seq;
  }

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
  shell.appendChild(turnOrderRow);
  shell.appendChild(progressList);
  shell.appendChild(boardWrap);
  shell.appendChild(controls);

  ctx.optionsGridEl.innerHTML = '';
  ctx.optionsGridEl.appendChild(shell);

  if (ctx.answerMsgEl) {
    const action = boardState.lastAction;
    const objective = targetCoins > 0 && totalTurns > 0
      ? `Goal: first to ${targetCoins} coins, or highest after ${totalTurns} turns.`
      : 'Goal: roll dice and collect coins.';
    ctx.answerMsgEl.textContent = action?.message || objective;
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
