'use strict';

const DEFAULT_BOARD_SIZE = 24;
const MIN_BOARD_SIZE = 12;
const MAX_BOARD_SIZE = 36;
const MIN_ROLL = 1;
const MAX_ROLL = 6;
const DEFAULT_TARGET_COINS = 140;
const DEFAULT_ROUNDS = 10;
const FINISH_DELAY_MS = 2200;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampInt(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const normalized = Math.trunc(num);
  return Math.max(min, Math.min(max, normalized));
}

function getConnectedPlayers(room) {
  return Array.from(room.players.values()).filter((player) => !player.disconnected);
}

function createBoardTile(index) {
  if (index % 8 === 0) {
    return { index, type: 'event', label: 'Event' };
  }
  if (index % 3 === 0) {
    return { index, type: 'mystery', label: 'Mystery' };
  }
  const rewardValues = [8, 10, 12, 15, 18, 20, 25];
  return {
    index,
    type: 'reward',
    value: rewardValues[index % rewardValues.length],
    label: `+${rewardValues[index % rewardValues.length]}`,
  };
}

function createBoard(boardSize) {
  return Array.from({ length: boardSize }, (_, index) => createBoardTile(index));
}

function ensureRuntimeState(room) {
  if (!room.islandDice || typeof room.islandDice !== 'object') {
    room.islandDice = {
      boardSize: DEFAULT_BOARD_SIZE,
      board: createBoard(DEFAULT_BOARD_SIZE),
      players: {},
      turnPlayerId: null,
      turnIndex: 0,
      actionSequence: 0,
      lastAction: null,
      targetCoins: DEFAULT_TARGET_COINS,
      roundsLimit: DEFAULT_ROUNDS,
      totalTurns: DEFAULT_ROUNDS,
      turnsTaken: 0,
      status: 'playing',
      winnerId: null,
      autoTimer: null,
      finishTimer: null,
    };
  }
  return room.islandDice;
}

function clearFinishTimer(room) {
  const runtimeState = ensureRuntimeState(room);
  if (runtimeState.finishTimer) {
    clearTimeout(runtimeState.finishTimer);
    runtimeState.finishTimer = null;
  }
}

function getSortedStandings(runtimeState) {
  return Object.values(runtimeState.players)
    .sort((a, b) => {
      if ((b.coins || 0) !== (a.coins || 0)) return (b.coins || 0) - (a.coins || 0);
      return (a.position || 0) - (b.position || 0);
    })
    .map((player, index) => ({
      rank: index + 1,
      id: player.id,
      nickname: player.nickname,
      avatar: player.avatar || '🎮',
      coins: Number(player.coins || 0),
      position: Number(player.position || 0),
    }));
}

function syncPlayers(room) {
  const runtimeState = ensureRuntimeState(room);
  const connected = getConnectedPlayers(room);

  for (const player of connected) {
    if (!runtimeState.players[player.id]) {
      runtimeState.players[player.id] = {
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar || '🎮',
        position: 0,
        coins: 0,
        autoSpin: false,
      };
    } else {
      runtimeState.players[player.id].nickname = player.nickname;
      runtimeState.players[player.id].avatar = player.avatar || '🎮';
    }
  }

  const connectedIds = new Set(connected.map((player) => player.id));
  Object.keys(runtimeState.players).forEach((playerId) => {
    if (!connectedIds.has(playerId)) {
      delete runtimeState.players[playerId];
    }
  });

  const orderedIds = connected.map((player) => player.id).filter((id) => runtimeState.players[id]);
  if (!orderedIds.length) {
    runtimeState.turnPlayerId = null;
    runtimeState.turnIndex = 0;
    return { orderedIds, connected };
  }

  if (!runtimeState.turnPlayerId || !runtimeState.players[runtimeState.turnPlayerId]) {
    runtimeState.turnIndex = 0;
    runtimeState.turnPlayerId = orderedIds[0];
  } else {
    const currentIndex = orderedIds.indexOf(runtimeState.turnPlayerId);
    runtimeState.turnIndex = currentIndex >= 0 ? currentIndex : 0;
    runtimeState.turnPlayerId = orderedIds[runtimeState.turnIndex];
  }

  return { orderedIds, connected };
}

function resolveTileEffect({ room, runtimeState, tile, playerState }) {
  if (!tile) return { deltaCoins: 0, message: 'Nothing happened.' };

  if (tile.type === 'reward') {
    const value = Number(tile.value) || 10;
    return {
      deltaCoins: value,
      message: `Reward tile! +${value} coins.`,
      effectType: 'reward',
    };
  }

  if (tile.type === 'mystery') {
    const outcomes = [
      { deltaCoins: 12, message: 'Mystery gift: +12 coins!' },
      { deltaCoins: 18, message: 'Golden gift: +18 coins!' },
      { deltaCoins: 25, message: 'Jackpot box! +25 coins!' },
      { deltaCoins: -6, message: 'Tiny trap: -6 coins.' },
      { deltaCoins: -12, message: 'Cursed chest: -12 coins.' },
      { deltaCoins: 0, message: 'Empty box. Better luck next turn.' },
    ];
    const pick = outcomes[randomInt(0, outcomes.length - 1)];
    return { ...pick, effectType: 'mystery' };
  }

  const allPlayers = Object.values(runtimeState.players);
  const others = allPlayers.filter((entry) => entry.id !== playerState.id);

  const coinRain = () => {
    const bonus = 10;
    return { deltaCoins: bonus, message: `Coin rain! +${bonus} coins.`, effectType: 'event' };
  };

  const stealFromLeader = () => {
    if (!others.length) return { deltaCoins: 7, message: 'No rivals nearby. +7 coins instead.', effectType: 'event' };
    const leader = [...others].sort((a, b) => (b.coins || 0) - (a.coins || 0))[0];
    const steal = Math.min(12, Math.max(0, Number(leader.coins || 0)));
    leader.coins = Math.max(0, Number(leader.coins || 0) - steal);
    return {
      deltaCoins: steal,
      message: `Pirate event: stole ${steal} coins from ${leader.nickname}!`,
      effectType: 'event',
    };
  };

  const teleport = () => {
    const boardSize = Number(runtimeState.boardSize || DEFAULT_BOARD_SIZE);
    const nextPos = randomInt(0, Math.max(0, boardSize - 1));
    playerState.position = nextPos;
    return {
      deltaCoins: 0,
      message: `Whirlpool! Teleported to tile ${nextPos + 1}.`,
      effectType: 'event',
      teleportedTo: nextPos,
    };
  };

  const eventRoll = randomInt(1, 100);
  if (eventRoll <= 35) return coinRain();
  if (eventRoll <= 70) return stealFromLeader();
  return teleport();
}

function nextTurn(room) {
  const runtimeState = ensureRuntimeState(room);
  const { orderedIds } = syncPlayers(room);
  if (!orderedIds.length) {
    runtimeState.turnPlayerId = null;
    runtimeState.turnIndex = 0;
    return;
  }

  const currentIndex = orderedIds.indexOf(runtimeState.turnPlayerId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + 1) % orderedIds.length;
  runtimeState.turnIndex = nextIndex;
  runtimeState.turnPlayerId = orderedIds[nextIndex];
}

function getPublicState(room, questionIndex = 0, total = 1, duration = 60) {
  const runtimeState = ensureRuntimeState(room);
  const { orderedIds, connected } = syncPlayers(room);

  const players = orderedIds.map((playerId) => runtimeState.players[playerId]).filter(Boolean);

  const standings = getSortedStandings(runtimeState);

  return {
    questionIndex,
    total,
    duration,
    players: connected.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      avatar: player.avatar || '🎮',
      score: player.score || 0,
      streak: player.streak || 0,
      isHost: !!player.isHostPlayer,
    })),
    question: {
      type: 'island_dice',
      text: 'Island Dice Adventure',
      miniGameBlockId: 'island-dice-adventure',
      islandDice: {
        boardSize: Number(runtimeState.boardSize || DEFAULT_BOARD_SIZE),
        board: runtimeState.board,
        players,
        turnPlayerId: runtimeState.turnPlayerId,
        actionSequence: runtimeState.actionSequence,
        lastAction: runtimeState.lastAction,
        targetCoins: Number(runtimeState.targetCoins || DEFAULT_TARGET_COINS),
        roundsLimit: Number(runtimeState.roundsLimit || DEFAULT_ROUNDS),
        turnsTaken: Number(runtimeState.turnsTaken || 0),
        totalTurns: Number(runtimeState.totalTurns || DEFAULT_ROUNDS),
        status: runtimeState.status || 'playing',
        winnerId: runtimeState.winnerId || null,
        standings,
      },
    },
  };
}

function emitQuestionState(room, io, meta = {}) {
  const payload = getPublicState(
    room,
    Number(meta.questionIndex ?? room.questionIndex ?? 0),
    Number(meta.total ?? (Array.isArray(room.questions) ? room.questions.length : 1)),
    Number(meta.duration ?? room.questionDuration ?? 60),
  );

  room.currentQuestionPayload = { ...payload.question };
  io.to(room.pin).emit('game:question', payload);
}

function clearAutoTimer(room) {
  const runtimeState = ensureRuntimeState(room);
  if (runtimeState.autoTimer) {
    clearTimeout(runtimeState.autoTimer);
    runtimeState.autoTimer = null;
  }
}

function scheduleAutoSpin(room, io) {
  clearAutoTimer(room);

  const runtimeState = ensureRuntimeState(room);
  if (runtimeState.status !== 'playing') return;
  const turnPlayer = runtimeState.players[runtimeState.turnPlayerId || ''];
  if (!turnPlayer || !turnPlayer.autoSpin) return;

  runtimeState.autoTimer = setTimeout(() => {
    runtimeState.autoTimer = null;
    performRoll(room, io, turnPlayer.id, 'auto');
  }, 900);
}

function finalizeBlockWithSummary(room, io, reason) {
  const runtimeState = ensureRuntimeState(room);
  if (runtimeState.status === 'finished') return;

  runtimeState.status = 'finished';
  clearAutoTimer(room);

  const standings = getSortedStandings(runtimeState);
  runtimeState.winnerId = standings[0]?.id || null;
  const winnerName = standings[0]?.nickname || 'Unknown';
  const winnerCoins = Number(standings[0]?.coins || 0);

  runtimeState.actionSequence = Number(runtimeState.actionSequence || 0) + 1;
  runtimeState.lastAction = {
    actorId: runtimeState.winnerId,
    actorNickname: winnerName,
    source: 'summary',
    roll: null,
    fromTile: null,
    toTile: null,
    tileType: null,
    deltaCoins: 0,
    totalCoins: winnerCoins,
    message: `Round finished (${reason}). Winner: ${winnerName} with ${winnerCoins} coins.`,
    effectType: 'summary',
    at: Date.now(),
  };

  runtimeState.turnPlayerId = null;
  emitQuestionState(room, io);

  clearFinishTimer(room);
  runtimeState.finishTimer = setTimeout(() => {
    runtimeState.finishTimer = null;
    if (room._blockState && typeof room._blockState.endBlock === 'function') {
      room._blockState.endBlock();
    }
  }, FINISH_DELAY_MS);
}

function performRoll(room, io, actorId, source = 'manual') {
  const runtimeState = ensureRuntimeState(room);
  if (runtimeState.status !== 'playing') return;

  const { orderedIds } = syncPlayers(room);
  if (!orderedIds.length) return;

  if (!runtimeState.turnPlayerId) {
    runtimeState.turnPlayerId = orderedIds[0];
    runtimeState.turnIndex = 0;
  }

  if (actorId !== runtimeState.turnPlayerId) return;

  const playerState = runtimeState.players[actorId];
  if (!playerState) return;

  const rollValue = randomInt(MIN_ROLL, MAX_ROLL);
  const fromTile = Number(playerState.position || 0);
  const boardSize = Number(runtimeState.boardSize || DEFAULT_BOARD_SIZE);
  const toTile = (fromTile + rollValue) % boardSize;
  playerState.position = toTile;

  const tile = runtimeState.board[toTile];
  const effect = resolveTileEffect({ room, runtimeState, tile, playerState });
  const nextCoins = Math.max(0, Number(playerState.coins || 0) + Number(effect.deltaCoins || 0));
  playerState.coins = nextCoins;
  const finalTile = Number(playerState.position || toTile);

  runtimeState.turnsTaken = Number(runtimeState.turnsTaken || 0) + 1;

  runtimeState.actionSequence = Number(runtimeState.actionSequence || 0) + 1;
  runtimeState.lastAction = {
    actorId,
    actorNickname: playerState.nickname,
    source,
    roll: rollValue,
    fromTile,
    toTile: finalTile,
    tileType: tile?.type || 'reward',
    deltaCoins: Number(effect.deltaCoins || 0),
    totalCoins: nextCoins,
    message: effect.message,
    effectType: effect.effectType || tile?.type || 'reward',
    turnsTaken: runtimeState.turnsTaken,
    at: Date.now(),
  };

  const reachedTarget = nextCoins >= Number(runtimeState.targetCoins || DEFAULT_TARGET_COINS);
  const reachedTurnLimit = Number(runtimeState.turnsTaken || 0) >= Number(runtimeState.totalTurns || DEFAULT_ROUNDS);

  if (reachedTarget || reachedTurnLimit) {
    finalizeBlockWithSummary(room, io, reachedTarget ? 'target_coins' : 'turn_limit');
    return;
  }

  nextTurn(room);
  emitQuestionState(room, io);
  scheduleAutoSpin(room, io);
}

function createIslandDiceAdventureRuntime() {
  return {
    id: 'island-dice-adventure',

    startBlock({ room, io, questionIndex, total, duration, blockConfig }) {
      const connected = getConnectedPlayers(room);
      if (!connected.length) return false;

      const boardSize = clampInt(
        blockConfig?.boardSize ?? room?.miniGameConfig?.islandBoardSize,
        MIN_BOARD_SIZE,
        MAX_BOARD_SIZE,
        DEFAULT_BOARD_SIZE,
      );
      const targetCoins = clampInt(
        blockConfig?.targetCoins ?? room?.miniGameConfig?.islandTargetCoins,
        40,
        500,
        DEFAULT_TARGET_COINS,
      );
      const roundsLimit = clampInt(
        blockConfig?.roundLimit ?? room?.miniGameConfig?.islandRoundLimit,
        3,
        50,
        DEFAULT_ROUNDS,
      );
      const autoSpinDefault = !!(blockConfig?.autoSpinDefault ?? room?.miniGameConfig?.islandAutoSpinDefault);

      const totalTurns = Math.max(1, roundsLimit * connected.length);

      room.islandDice = {
        boardSize,
        board: createBoard(boardSize),
        players: {},
        turnPlayerId: null,
        turnIndex: 0,
        actionSequence: 0,
        targetCoins,
        roundsLimit,
        totalTurns,
        turnsTaken: 0,
        status: 'playing',
        winnerId: null,
        lastAction: {
          actorId: null,
          roll: null,
          message: `Welcome to Island Dice Adventure! First to ${targetCoins} coins wins.`,
          at: Date.now(),
        },
        autoTimer: null,
        finishTimer: null,
      };

      syncPlayers(room);
      const runtimeState = ensureRuntimeState(room);
      Object.values(runtimeState.players).forEach((player) => {
        player.autoSpin = autoSpinDefault;
      });

      emitQuestionState(room, io, { questionIndex, total, duration });
      scheduleAutoSpin(room, io);
      return true;
    },

    onPlayerAnswer({ room, io, player, answer }) {
      if (!room?.islandDice) return false;

      const actionType = answer && typeof answer === 'object' ? answer.type : null;
      if (actionType === 'island_auto_toggle') {
        const runtimeState = ensureRuntimeState(room);
        if (runtimeState.status !== 'playing') return true;
        const playerState = runtimeState.players[player.id];
        if (!playerState) return true;

        playerState.autoSpin = !!answer.enabled;
        runtimeState.actionSequence = Number(runtimeState.actionSequence || 0) + 1;
        runtimeState.lastAction = {
          actorId: player.id,
          actorNickname: playerState.nickname,
          source: 'toggle',
          roll: null,
          fromTile: playerState.position,
          toTile: playerState.position,
          tileType: null,
          deltaCoins: 0,
          totalCoins: playerState.coins,
          message: playerState.autoSpin ? 'Auto-spin enabled.' : 'Auto-spin disabled.',
          effectType: 'toggle',
          at: Date.now(),
        };

        emitQuestionState(room, io);
        scheduleAutoSpin(room, io);
        return true;
      }

      if (actionType === 'island_roll') {
        performRoll(room, io, player.id, 'manual');
        return true;
      }

      return true;
    },

    onQuestionEnd({ room }) {
      if (!room?.islandDice) return false;
      clearAutoTimer(room);
      clearFinishTimer(room);
      delete room.islandDice;
      return false;
    },

    onGameOver({ room, dispatchDefault }) {
      clearAutoTimer(room);
      clearFinishTimer(room);
      if (typeof dispatchDefault === 'function') dispatchDefault();
      return true;
    },
  };
}

module.exports = { createIslandDiceAdventureRuntime };
