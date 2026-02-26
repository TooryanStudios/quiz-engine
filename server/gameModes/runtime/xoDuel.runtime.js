'use strict';

function createXoDuelRuntime() {
  const ROUND_RESULT_DELAY_MS = 3600;
  const WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  function getConnectedPlayers(room) {
    return Array.from(room.players.values()).filter((player) => !player.disconnected);
  }

  function hasConnectedPlayer(room, playerId) {
    if (!playerId) return false;
    const player = room.players.get(playerId);
    return !!player && !player.disconnected;
  }

  function pickRandom(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)] || null;
  }

  function pickRandomTurnIndex(playersLength) {
    if (!Number.isInteger(playersLength) || playersLength <= 1) return 0;
    return Math.random() < 0.5 ? 0 : 1;
  }

  function clearRoundTransitionTimer(room) {
    if (room?.xo?.transitionTimer) {
      clearTimeout(room.xo.transitionTimer);
      room.xo.transitionTimer = null;
    }
  }

  function ensureScoreboard(room) {
    if (!room.xo.scoreboard || typeof room.xo.scoreboard !== 'object') {
      room.xo.scoreboard = {};
    }

    getConnectedPlayers(room).forEach((player) => {
      if (!room.xo.scoreboard[player.id]) {
        room.xo.scoreboard[player.id] = {
          id: player.id,
          nickname: player.nickname,
          score: 0,
          cooldownRounds: 0,
        };
      } else {
        room.xo.scoreboard[player.id].nickname = player.nickname;
      }
    });
  }

  function getScoreEntry(room, playerId) {
    if (!playerId) return null;
    ensureScoreboard(room);
    return room.xo.scoreboard[playerId] || null;
  }

  function getSortedScoreboard(room) {
    ensureScoreboard(room);
    return Object.values(room.xo.scoreboard)
      .map((entry) => ({
        id: entry.id,
        nickname: entry.nickname,
        score: Number(entry.score || 0),
        cooldownRounds: Number(entry.cooldownRounds || 0),
      }))
      .sort((a, b) => b.score - a.score);
  }

  function getDuelPlayers(room) {
    const connectedPlayers = getConnectedPlayers(room);
    if (connectedPlayers.length < 2) return [];

    const connectedIds = new Set(connectedPlayers.map((player) => player.id));
    const preferredIds = Array.isArray(room?.xo?.duelPlayerIds) ? room.xo.duelPlayerIds : [];
    const resolvedIds = preferredIds.filter((id) => connectedIds.has(id));

    if (resolvedIds.length < 2) {
      connectedPlayers.forEach((player) => {
        if (resolvedIds.length >= 2) return;
        if (!resolvedIds.includes(player.id)) resolvedIds.push(player.id);
      });
    }

    if (room?.xo) {
      room.xo.duelPlayerIds = resolvedIds.slice(0, 2);
      return room.xo.duelPlayerIds.map((id) => room.players.get(id)).filter(Boolean);
    }

    return resolvedIds.slice(0, 2).map((id) => room.players.get(id)).filter(Boolean);
  }

  function createInitialDuelState(room) {
    const duelPlayers = getDuelPlayers(room);
    const p1 = duelPlayers[0] || null;
    const p2 = duelPlayers[1] || null;

    return {
      board: Array(9).fill(null),
      scoreboard: {},
      duelPlayerIds: [p1?.id, p2?.id].filter(Boolean),
      players: [
        p1 ? { id: p1.id, nickname: p1.nickname, symbol: 'X', score: 0 } : null,
        p2 ? { id: p2.id, nickname: p2.nickname, symbol: 'O', score: 0 } : null,
      ].filter(Boolean),
      activeTurnIndex: pickRandomTurnIndex(2),
      turnSequence: 1,
      round: 1,
      maxRounds: 999,
      finished: false,
      phase: 'play',
      winnerId: null,
      loserId: null,
      draw: false,
      winningLine: null,
      transitionTimer: null,
      roundResultDelayMs: ROUND_RESULT_DELAY_MS,
      startedAt: Date.now(),
    };
  }

  function getPlayerById(room, playerId) {
    return room.xo?.players?.find((player) => player.id === playerId) || null;
  }

  function getActivePlayer(room) {
    const players = room.xo?.players || [];
    if (!players.length) return null;
    const idx = Number.isInteger(room.xo.activeTurnIndex) ? room.xo.activeTurnIndex : 0;
    return players[idx] || players[0] || null;
  }

  function hydrateDuelPlayers(room) {
    const duelPlayers = getDuelPlayers(room);
    room.xo.players = duelPlayers.map((player, index) => {
      const scoreEntry = getScoreEntry(room, player.id);
      return {
        id: player.id,
        nickname: player.nickname,
        symbol: index === 0 ? 'X' : 'O',
        score: Number(scoreEntry?.score || 0),
      };
    });
  }

  function findWinner(board) {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { symbol: board[a], line: [a, b, c] };
      }
    }
    return null;
  }

  function emitXoQuestion(room, io, phase = 'play', options = {}) {
    ensureScoreboard(room);
    hydrateDuelPlayers(room);

    const activePlayer = phase === 'play' ? getActivePlayer(room) : null;
    const waitingPlayers = getSortedScoreboard(room)
      .filter((entry) => !(room.xo.players || []).some((player) => player.id === entry.id))
      .map((entry) => ({
        id: entry.id,
        nickname: entry.nickname,
        score: entry.score,
        cooldownRounds: entry.cooldownRounds,
      }));

    const payloadPlayers = (room.xo.players || []).map((player) => ({
      id: player.id,
      nickname: player.nickname,
      symbol: player.symbol,
      score: player.score || 0,
    }));

    const questionPayload = {
      type: 'xo_duel',
      text: 'X O Duel',
      xo: {
        phase,
        board: [...room.xo.board],
        players: payloadPlayers,
        waitingPlayers,
        turnSequence: Number(room.xo.turnSequence || 1),
        activePlayerId: activePlayer?.id || null,
        activeNickname: activePlayer?.nickname || null,
        activeSymbol: activePlayer?.symbol || null,
        round: room.xo.round || 1,
        maxRounds: room.xo.maxRounds || 1,
        winnerId: room.xo.winnerId || null,
        loserId: room.xo.loserId || null,
        draw: !!room.xo.draw,
        winningLine: room.xo.winningLine || null,
        ...options,
      },
    };

    room.currentQuestionPayload = questionPayload;
    room.currentQuestionMeta = room.currentQuestionMeta || {};
    room.currentQuestionMeta.xoActivePlayerId = activePlayer?.id || null;
    room.xo.phase = phase;

    io.to(room.pin).emit('game:question', {
      questionIndex: 0,
      total: 1,
      duration: phase === 'round-result' ? Math.ceil((options.nextRoundInMs || ROUND_RESULT_DELAY_MS) / 1000) : 600,
      question: questionPayload,
      players: getConnectedPlayers(room).map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar || '🎮',
        score: player.score || 0,
        streak: player.streak || 0,
        isHost: !!player.isHostPlayer,
      })),
    });
  }

  function emitXoGameOver(room, io, reason) {
    clearRoundTransitionTimer(room);
    room.state = 'finished';
    room.xo.finished = true;

    const leaderboard = getSortedScoreboard(room)
      .map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: room.players.get(player.id)?.avatar || '🎮',
        totalScore: player.score,
        streak: 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    io.to(room.pin).emit('game:over', {
      leaderboard,
      xo: {
        reason: reason || 'completed',
        board: [...room.xo.board],
        winnerId: room.xo.winnerId || null,
        loserId: room.xo.loserId || null,
        draw: !!room.xo.draw,
        round: room.xo.round || 1,
      },
    });
  }

  function chooseNextDuel(room) {
    const connected = getConnectedPlayers(room);
    if (connected.length < 2) return null;

    const winnerId = room.xo.winnerId;
    const loserId = room.xo.loserId;
    const wasDraw = !!room.xo.draw;

    if (wasDraw) {
      const currentIds = (room.xo.duelPlayerIds || []).filter((id) => hasConnectedPlayer(room, id));
      if (currentIds.length === 2) return currentIds;
    }

    if (winnerId && hasConnectedPlayer(room, winnerId)) {
      const loserEntry = getScoreEntry(room, loserId);
      if (loserEntry) loserEntry.cooldownRounds = Math.max(Number(loserEntry.cooldownRounds || 0), 1);

      const candidatePool = connected.filter((player) => {
        if (player.id === winnerId) return false;
        const entry = getScoreEntry(room, player.id);
        return Number(entry?.cooldownRounds || 0) === 0;
      });

      const challenger = pickRandom(candidatePool.length ? candidatePool : connected.filter((player) => player.id !== winnerId));
      if (challenger) return [winnerId, challenger.id];
    }

    const shuffled = [...connected].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2).map((player) => player.id);
  }

  function decrementCooldowns(room) {
    ensureScoreboard(room);
    Object.values(room.xo.scoreboard).forEach((entry) => {
      if (entry.cooldownRounds > 0) entry.cooldownRounds -= 1;
    });
  }

  function startNextRound(room, io) {
    if (!room?.xo || room.xo.finished || room.state === 'finished') return;

    const nextDuelIds = chooseNextDuel(room);
    if (!nextDuelIds || nextDuelIds.length < 2) {
      emitXoGameOver(room, io, 'not_enough_players');
      return;
    }

    room.xo.duelPlayerIds = nextDuelIds;
    decrementCooldowns(room);
    room.xo.board = Array(9).fill(null);
    room.xo.activeTurnIndex = pickRandomTurnIndex(2);
    room.xo.turnSequence = 1;
    room.xo.winnerId = null;
    room.xo.loserId = null;
    room.xo.draw = false;
    room.xo.winningLine = null;
    room.xo.phase = 'play';
    room.xo.round = Number(room.xo.round || 1) + 1;

    emitXoQuestion(room, io, 'play');
  }

  function emitRoundResultAndSchedule(room, io) {
    const winner = room.xo.winnerId ? getScoreEntry(room, room.xo.winnerId) : null;
    const loser = room.xo.loserId ? getScoreEntry(room, room.xo.loserId) : null;
    const nextRoundInMs = Number(room.xo.roundResultDelayMs || ROUND_RESULT_DELAY_MS);

    emitXoQuestion(room, io, 'round-result', {
      result: {
        winnerId: room.xo.winnerId || null,
        winnerNickname: winner?.nickname || null,
        loserId: room.xo.loserId || null,
        loserNickname: loser?.nickname || null,
        draw: !!room.xo.draw,
        winningLine: room.xo.winningLine || null,
      },
      nextRoundInMs,
    });

    clearRoundTransitionTimer(room);
    room.xo.transitionTimer = setTimeout(() => {
      startNextRound(room, io);
    }, nextRoundInMs);
  }

  return {
    id: 'xo-duel',

    onGameStart({ room, io, socket }) {
      const duelPlayers = getDuelPlayers(room);
      if (duelPlayers.length < 2) {
        room.state = 'lobby';
        socket.emit('room:error', {
          message: 'X O Duel يحتاج لاعبين متصلين على الأقل. يمكن للمضيف الانضمام كلاعب.',
          code: 'XO_DUEL_NEEDS_TWO_PLAYERS',
        });
        return true;
      }

      room.xo = createInitialDuelState(room);
      ensureScoreboard(room);
      hydrateDuelPlayers(room);
      room.questionIndex = 0;
      room.questions = [{ type: 'xo_duel', text: 'X O Duel' }];
      room.questionDuration = 600;
      room.questionStartTime = Date.now();
      room.answerOpenAt = Date.now();
      room.paused = false;
      room.pausedTimeRemaining = 0;
      room.state = 'question';

      io.to(room.pin).emit('game:start', {
        totalQuestions: 1,
      });

      emitXoQuestion(room, io, 'play');
      return true;
    },

    onQuestionDispatch() {
      return true;
    },

    onPlayerAnswer({ room, io, socket, player, answer }) {
      if (!room?.xo || room.xo.finished) return true;
      if (room.xo.phase !== 'play') {
        socket.emit('room:error', {
          message: 'انتظر انتهاء نتيجة الجولة الحالية.',
          code: 'XO_DUEL_ROUND_TRANSITION',
        });
        return true;
      }

      const contender = getPlayerById(room, player.id);
      if (!contender) {
        socket.emit('room:error', {
          message: 'هذه المواجهة مخصصة للاعبين فقط في X O Duel.',
          code: 'XO_DUEL_SPECTATOR',
        });
        return true;
      }

      const active = getActivePlayer(room);
      if (!active || active.id !== contender.id) {
        socket.emit('room:error', {
          message: 'ليس دورك الآن في X O Duel.',
          code: 'XO_DUEL_NOT_YOUR_TURN',
        });
        return true;
      }

      const cellIndex = Number(answer?.cellIndex);
      if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) {
        socket.emit('room:error', {
          message: 'اختيار الخانة غير صالح.',
          code: 'XO_DUEL_INVALID_CELL',
        });
        return true;
      }

      if (room.xo.board[cellIndex]) {
        socket.emit('room:error', {
          message: 'هذه الخانة مستخدمة بالفعل.',
          code: 'XO_DUEL_CELL_TAKEN',
        });
        return true;
      }

      room.xo.board[cellIndex] = contender.symbol;
      socket.emit('answer:received', { answer });

      const winner = findWinner(room.xo.board);
      if (winner) {
        const rival = (room.xo.players || []).find((p) => p.id !== contender.id) || null;
        room.xo.winnerId = contender.id;
        room.xo.loserId = rival?.id || null;
        room.xo.winningLine = winner.line;
        room.xo.draw = false;

        const winnerScore = getScoreEntry(room, contender.id);
        if (winnerScore) winnerScore.score = Number(winnerScore.score || 0) + 1;
        contender.score = Number(winnerScore?.score || (contender.score || 0));

        const roomPlayer = room.players.get(contender.id);
        if (roomPlayer) roomPlayer.score = contender.score;

        emitRoundResultAndSchedule(room, io);
        return true;
      }

      const isDraw = room.xo.board.every((cell) => !!cell);
      if (isDraw) {
        room.xo.winnerId = null;
        room.xo.loserId = null;
        room.xo.draw = true;
        room.xo.winningLine = null;
        emitRoundResultAndSchedule(room, io);
        return true;
      }

      room.xo.activeTurnIndex = room.xo.activeTurnIndex === 0 ? 1 : 0;
      room.xo.turnSequence = Number(room.xo.turnSequence || 1) + 1;
      emitXoQuestion(room, io, 'play');
      return true;
    },

    onQuestionEnd({ room, io }) {
      if (room?.xo && !room.xo.finished) {
        emitXoGameOver(room, io, 'ended');
      }
      return true;
    },

    onGameOver({ room, io, endedByHost, dispatchDefault }) {
      if (room?.xo) {
        emitXoGameOver(room, io, endedByHost ? 'ended_by_host' : 'completed');
        return true;
      }
      if (typeof dispatchDefault === 'function') dispatchDefault();
      return true;
    },
  };
}

module.exports = { createXoDuelRuntime };
