'use strict';

function createXoDuelRuntime() {
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

  function getDuelPlayers(room) {
    const players = getConnectedPlayers(room);
    return players.slice(0, 2);
  }

  function createInitialDuelState(room) {
    const duelPlayers = getDuelPlayers(room);
    const p1 = duelPlayers[0] || null;
    const p2 = duelPlayers[1] || null;

    return {
      board: Array(9).fill(null),
      players: [
        p1 ? { id: p1.id, nickname: p1.nickname, symbol: 'X', score: 0 } : null,
        p2 ? { id: p2.id, nickname: p2.nickname, symbol: 'O', score: 0 } : null,
      ].filter(Boolean),
      activeTurnIndex: 0,
      round: 1,
      maxRounds: 1,
      finished: false,
      winnerId: null,
      draw: false,
      winningLine: null,
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

  function findWinner(board) {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { symbol: board[a], line: [a, b, c] };
      }
    }
    return null;
  }

  function emitXoQuestion(room, io) {
    const activePlayer = getActivePlayer(room);
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
        board: [...room.xo.board],
        players: payloadPlayers,
        activePlayerId: activePlayer?.id || null,
        activeNickname: activePlayer?.nickname || null,
        activeSymbol: activePlayer?.symbol || null,
        round: room.xo.round || 1,
        maxRounds: room.xo.maxRounds || 1,
      },
    };

    room.currentQuestionPayload = questionPayload;
    room.currentQuestionMeta = room.currentQuestionMeta || {};
    room.currentQuestionMeta.xoActivePlayerId = activePlayer?.id || null;

    io.to(room.pin).emit('game:question', {
      questionIndex: 0,
      total: 1,
      duration: 600,
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
    room.state = 'finished';
    room.xo.finished = true;

    const leaderboard = (room.xo.players || [])
      .map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: room.players.get(player.id)?.avatar || '🎮',
        totalScore: player.score || 0,
        streak: 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    io.to(room.pin).emit('game:over', {
      leaderboard,
      xo: {
        reason: reason || 'completed',
        board: [...room.xo.board],
        winnerId: room.xo.winnerId || null,
        draw: !!room.xo.draw,
      },
    });
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

      emitXoQuestion(room, io);
      return true;
    },

    onQuestionDispatch() {
      return true;
    },

    onPlayerAnswer({ room, io, socket, player, answer }) {
      if (!room?.xo || room.xo.finished) return true;

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
        room.xo.winnerId = contender.id;
        room.xo.winningLine = winner.line;
        contender.score = (contender.score || 0) + 1;
        emitXoGameOver(room, io, 'win');
        return true;
      }

      const isDraw = room.xo.board.every((cell) => !!cell);
      if (isDraw) {
        room.xo.draw = true;
        emitXoGameOver(room, io, 'draw');
        return true;
      }

      room.xo.activeTurnIndex = room.xo.activeTurnIndex === 0 ? 1 : 0;
      emitXoQuestion(room, io);
      return true;
    },

    onQuestionEnd() {
      return true;
    },

    onGameOver({ dispatchDefault }) {
      if (typeof dispatchDefault === 'function') dispatchDefault();
      return true;
    },
  };
}

module.exports = { createXoDuelRuntime };
