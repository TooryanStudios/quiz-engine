'use strict';

function createLightsSkillGameRuntime() {
  return {
    id: 'lights-skill-game',

    onGameStart({ room, io }) {
      room.questionIndex = 0;
      room.questions = [{ type: 'lights-skill-game', text: 'Lights Skill Game' }];
      room.questionDuration = Number(room?.miniGameConfig?.gameDurationSec) || 90;
      room.questionStartTime = Date.now();
      room.answerOpenAt = Date.now();
      room.paused = false;
      room.pausedTimeRemaining = 0;
      room.state = 'question';

      io.to(room.pin).emit('game:start', {
        totalQuestions: 1,
      });

      const questionPayload = {
        type: 'lights-skill-game',
        text: 'Lights Skill Game',
        config: room?.miniGameConfig || {},
      };

      room.currentQuestionPayload = questionPayload;

      io.to(room.pin).emit('game:question', {
        questionIndex: 0,
        total: 1,
        duration: room.questionDuration,
        question: questionPayload,
        players: Array.from(room.players.values())
          .filter((p) => !p.disconnected)
          .map((player) => ({
            id: player.id,
            nickname: player.nickname,
            avatar: player.avatar || '🎮',
            score: player.score || 0,
            streak: player.streak || 0,
            isHost: !!player.isHostPlayer,
          })),
      });

      return true;
    },

    onQuestionDispatch() {
      return true;
    },

    onPlayerAnswer({ room, socket, player, answer }) {
      if (!room || room.state === 'finished') return true;

      if (answer?.action === 'level_complete' && typeof answer.score === 'number') {
        player.score = (player.score || 0) + answer.score;
        socket.emit('answer:received', { answer });
        return true;
      }

      return true;
    },

    onQuestionEnd({ room, io }) {
      if (room && room.state !== 'finished') {
        room.state = 'finished';
        const leaderboard = Array.from(room.players.values())
          .filter((p) => !p.disconnected)
          .map((player) => ({
            id: player.id,
            nickname: player.nickname,
            avatar: player.avatar || '🎮',
            totalScore: player.score || 0,
            streak: player.streak || 0,
          }))
          .sort((a, b) => b.totalScore - a.totalScore);

        io.to(room.pin).emit('game:over', {
          leaderboard,
          reason: 'completed',
        });
      }
      return true;
    },

    onGameOver({ room, io, endedByHost, dispatchDefault }) {
      if (room && room.state !== 'finished') {
        room.state = 'finished';
        const leaderboard = Array.from(room.players.values())
          .filter((p) => !p.disconnected)
          .map((player) => ({
            id: player.id,
            nickname: player.nickname,
            avatar: player.avatar || '🎮',
            totalScore: player.score || 0,
            streak: player.streak || 0,
          }))
          .sort((a, b) => b.totalScore - a.totalScore);

        io.to(room.pin).emit('game:over', {
          leaderboard,
          reason: endedByHost ? 'ended_by_host' : 'completed',
        });
        return true;
      }
      if (typeof dispatchDefault === 'function') dispatchDefault();
      return true;
    },
  };
}

module.exports = { createLightsSkillGameRuntime };
