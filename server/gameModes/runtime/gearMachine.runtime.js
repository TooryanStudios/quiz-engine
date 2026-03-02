'use strict';

function createGearMachineRuntime() {
  // Duration and gear count are read from room.miniGameConfig — no hardcoded defaults
  function getGameDurationSec(room) {
    const d = Number(room?.miniGameConfig?.gameDurationSec ?? room?.miniGameConfig?.defaultDuration);
    return (Number.isFinite(d) && d >= 1) ? d : 900;
  }

  function getGearsCount(room) {
    const n = Number(room?.miniGameConfig?.gearsCount);
    return (Number.isInteger(n) && n >= 1) ? Math.min(n, 12) : 4;
  }

  function getConnectedPlayers(room) {
    return Array.from(room.players.values()).filter((player) => !player.disconnected);
  }

  function normalizeAngle(value) {
    const n = Number(value || 0);
    const normalized = ((Math.round(n) % 360) + 360) % 360;
    return normalized;
  }

  function pickRandomTargetAngle(step) {
    const normalizedStep = Number(step) > 0 ? Number(step) : 30;
    const slots = Math.max(1, Math.floor(360 / normalizedStep));
    const slotIndex = Math.floor(Math.random() * slots);
    return normalizeAngle(slotIndex * normalizedStep);
  }

  function createGearTemplate(count) {
    const n = (Number.isInteger(count) && count >= 1) ? Math.min(count, 12) : 4;
    const sizePattern = ['large', 'small'];
    return Array.from({ length: n }, (_, i) => ({
      id: `g${i + 1}`,
      size: sizePattern[i % 2],
      step: 30,
      targetAngle: pickRandomTargetAngle(30),
    }));
  }

  function initializeMachine(room) {
    room.gearMachine = {
      startedAt: Date.now(),
      phase: 'play',
      gears: createGearTemplate(getGearsCount(room)),
      winnerId: null,
      winnerNickname: null,
      winnerTimeMs: null,
      attempts: {},
    };
  }

  function getMachinePayload(room) {
    const machine = room.gearMachine;
    return {
      phase: machine.phase,
      gears: machine.gears.map((gear) => ({
        id: gear.id,
        size: gear.size,
        step: gear.step,
      })),
      winnerId: machine.winnerId,
      winnerNickname: machine.winnerNickname,
      winnerTimeMs: machine.winnerTimeMs,
      startedAt: machine.startedAt,
    };
  }

  function emitMachineQuestion(room, io) {
    const questionPayload = {
      type: 'gear_machine',
      text: 'Gear Machine',
      gearMachine: getMachinePayload(room),
    };

    room.currentQuestionPayload = questionPayload;
    room.currentQuestionMeta = room.currentQuestionMeta || {};

    const blockQIndex = room._blockState ? (room.questionIndex || 0) : 0;
    const blockTotal = room._blockState ? (Array.isArray(room.questions) ? room.questions.length : 1) : 1;

    io.to(room.pin).emit('game:question', {
      questionIndex: blockQIndex,
      total: blockTotal,
      duration: getGameDurationSec(room),
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

  function buildFinalLeaderboard(room) {
    const winnerId = room.gearMachine?.winnerId;
    if (winnerId && room.players.get(winnerId)) {
      room.players.get(winnerId).score = Number(room.players.get(winnerId).score || 0) + 1;
    }

    return Array.from(room.players.values())
      .filter((player) => !player.disconnected)
      .map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar || '🎮',
        totalScore: Number(player.score || 0),
        streak: Number(player.streak || 0),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  function isSolved(machine, angles) {
    if (!Array.isArray(angles) || angles.length !== machine.gears.length) return false;
    return machine.gears.every((gear, index) => normalizeAngle(angles[index]) === normalizeAngle(gear.targetAngle));
  }

  return {
    id: 'gear-machine',

    onGameStart({ room, io, socket }) {
      const connected = getConnectedPlayers(room);
      if (connected.length < 1) {
        socket.emit('room:error', {
          message: 'Gear Machine يحتاج لاعب واحد متصل على الأقل.',
          code: 'GEAR_MACHINE_NOT_ENOUGH_PLAYERS',
        });
        return false;
      }

      initializeMachine(room);

      room.questionIndex = 0;
      room.questions = [{ type: 'gear_machine', text: 'Gear Machine' }];
      room.questionDuration = getGameDurationSec(room);
      room.questionStartTime = Date.now();
      room.answerOpenAt = Date.now();
      room.paused = false;
      room.pausedTimeRemaining = 0;
      room.state = 'question';

      io.to(room.pin).emit('game:start', {
        totalQuestions: 1,
      });

      emitMachineQuestion(room, io);
      return true;
    },

    onQuestionDispatch() {
      return true;
    },

    onPlayerAnswer({ room, io, socket, player, answer }) {
      const machine = room?.gearMachine;
      if (!machine || room.state !== 'question') return true;

      if (machine.phase === 'finished') {
        socket.emit('room:error', {
          message: 'تم حسم الفائز بالفعل في Gear Machine.',
          code: 'GEAR_MACHINE_FINISHED',
        });
        return true;
      }

      if (answer?.action !== 'test') {
        socket.emit('room:error', {
          message: 'استخدم زر تشغيل الآلة للتحقق من الترسيم.',
          code: 'GEAR_MACHINE_INVALID_ACTION',
        });
        return true;
      }

      const solved = isSolved(machine, answer?.angles || []);
      const playerId = player?.id;
      machine.attempts[playerId] = Number(machine.attempts[playerId] || 0) + 1;

      if (!solved) {
        socket.emit('gear:test_result', {
          ok: false,
          attempts: machine.attempts[playerId],
          message: 'الترتيب غير صحيح بعد. عدّل التروس ثم جرّب مرة أخرى.',
        });
        return true;
      }

      machine.phase = 'finished';
      machine.winnerId = playerId;
      machine.winnerNickname = player.nickname || 'Winner';
      machine.winnerTimeMs = Date.now() - machine.startedAt;

      io.to(room.pin).emit('gear:test_result', {
        ok: true,
        winnerId: machine.winnerId,
        winnerNickname: machine.winnerNickname,
        winnerTimeMs: machine.winnerTimeMs,
      });

      // In block mode: advance to next question instead of ending the game
      if (room._blockState) {
        // Use optional chaining — _blockState might be gone if block timer fired first
        setTimeout(() => room._blockState?.endBlock?.(), 2000);
        return true;
      }

      const leaderboard = buildFinalLeaderboard(room);
      room.state = 'finished';

      io.to(room.pin).emit('game:over', {
        leaderboard,
        gearMachine: {
          winnerId: machine.winnerId,
          winnerNickname: machine.winnerNickname,
          winnerTimeMs: machine.winnerTimeMs,
        },
      });

      return true;
    },

    onQuestionEnd() {
      return true;
    },

    onGameOver({ room, io, endedByHost, dispatchDefault }) {
      // In block mode, suppress game:over
      if (room?._blockState) return true;

      if (room?.gearMachine) {
        if (room.state !== 'finished') {
          room.state = 'finished';
          io.to(room.pin).emit('game:over', {
            leaderboard: buildFinalLeaderboard(room),
            endedByHost: !!endedByHost,
            gearMachine: {
              winnerId: room.gearMachine.winnerId,
              winnerNickname: room.gearMachine.winnerNickname,
              winnerTimeMs: room.gearMachine.winnerTimeMs,
            },
          });
        }
        return true;
      }

      if (typeof dispatchDefault === 'function') dispatchDefault();
      return true;
    },
    startBlock({ room, io, questionIndex, total, duration, blockConfig }) {
      const connected = getConnectedPlayers(room);
      if (connected.length < 1) return false;

      // Apply block-specific config
      if (blockConfig?.gearsCount) {
        room.miniGameConfig = { ...(room.miniGameConfig || {}), gearsCount: blockConfig.gearsCount };
      }
      if (blockConfig?.maxTurns) {
        room.miniGameConfig = { ...(room.miniGameConfig || {}), maxTurns: blockConfig.maxTurns };
      }
      if (blockConfig?.gameDurationSec || blockConfig?.defaultDuration) {
        room.miniGameConfig = {
          ...(room.miniGameConfig || {}),
          gameDurationSec: blockConfig.gameDurationSec || blockConfig.defaultDuration,
        };
      }

      initializeMachine(room);
      emitMachineQuestion(room, io);
      return true;
    },
  };
}

module.exports = { createGearMachineRuntime };
