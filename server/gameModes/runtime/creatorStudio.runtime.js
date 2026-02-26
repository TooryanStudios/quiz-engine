'use strict';

function createCreatorStudioRuntime() {
  const DEFAULT_CREATE_DURATION_SEC = 45;
  const RATING_DURATION_SEC = 20;
  const RESULT_DURATION_SEC = 4;

  function getConnectedPlayers(room) {
    return Array.from(room.players.values()).filter((player) => !player.disconnected);
  }

  function clearPhaseTimer(room) {
    if (room?.creatorStudio?.phaseTimer) {
      clearTimeout(room.creatorStudio.phaseTimer);
      room.creatorStudio.phaseTimer = null;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function ensureScoreboard(room) {
    const studio = room.creatorStudio;
    if (!studio.scoreboard || typeof studio.scoreboard !== 'object') {
      studio.scoreboard = {};
    }

    getConnectedPlayers(room).forEach((player) => {
      if (!studio.scoreboard[player.id]) {
        studio.scoreboard[player.id] = {
          id: player.id,
          nickname: player.nickname,
          score: 0,
        };
      } else {
        studio.scoreboard[player.id].nickname = player.nickname;
      }
    });
  }

  function getSortedScoreboard(room) {
    ensureScoreboard(room);
    return Object.values(room.creatorStudio.scoreboard)
      .map((entry) => ({
        id: entry.id,
        nickname: entry.nickname,
        score: Number(entry.score || 0),
      }))
      .sort((a, b) => b.score - a.score);
  }

  function toRoundLeaderboard(room) {
    return getSortedScoreboard(room)
      .map((entry) => ({
        id: entry.id,
        nickname: entry.nickname,
        avatar: room.players.get(entry.id)?.avatar || '🎮',
        totalScore: Number(entry.score.toFixed(1)),
        streak: 0,
      }));
  }

  function buildPrompts(quizData) {
    const source = Array.isArray(quizData?.questions) ? quizData.questions : [];
    const prompts = [];

    source.forEach((question, index) => {
      const text = typeof question?.text === 'string' ? question.text.trim() : '';
      const duration = Number.isFinite(question?.duration)
        ? clamp(Number(question.duration), 15, 120)
        : DEFAULT_CREATE_DURATION_SEC;

      if (question?.type === 'order' || question?.type === 'order_plus') {
        const elements = Array.isArray(question?.items)
          ? question.items.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 7)
          : [];

        if (elements.length >= 2) {
          prompts.push({
            id: `p-${index + 1}`,
            kind: 'arrange',
            text: text || 'Arrange the elements creatively.',
            elements,
            createDurationSec: duration,
          });
          return;
        }
      }

      prompts.push({
        id: `p-${index + 1}`,
        kind: 'draw',
        text: text || 'Draw something creative.',
        elements: [],
        createDurationSec: duration,
      });
    });

    if (!prompts.length) {
      prompts.push({
        id: 'p-1',
        kind: 'draw',
        text: 'Draw an apple.',
        elements: [],
        createDurationSec: DEFAULT_CREATE_DURATION_SEC,
      });
    }

    return prompts;
  }

  function chooseCreator(room) {
    const studio = room.creatorStudio;
    const connected = getConnectedPlayers(room);
    if (connected.length < 2) return null;

    const pool = connected.filter((player) => player.id !== studio.lastCreatorId);
    const candidates = pool.length ? pool : connected;
    const selected = candidates[Math.floor(Math.random() * candidates.length)] || null;
    return selected;
  }

  function normalizeDrawSubmission(creation) {
    const strokes = Array.isArray(creation?.strokes)
      ? creation.strokes
          .map((stroke) => ({
            points: Array.isArray(stroke?.points)
              ? stroke.points
                  .slice(0, 260)
                  .map((point) => ({
                    x: clamp(Number(point?.x || 0), 0, 1),
                    y: clamp(Number(point?.y || 0), 0, 1),
                  }))
                  .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
              : [],
          }))
          .filter((stroke) => stroke.points.length >= 2)
          .slice(0, 80)
      : [];

    return {
      kind: 'draw',
      strokes,
    };
  }

  function normalizeArrangeSubmission(prompt, creation) {
    const allowed = new Set((prompt?.elements || []).map((item) => String(item)));
    const layout = Array.isArray(creation?.layout)
      ? creation.layout
          .map((item) => ({
            text: String(item?.text || ''),
            x: clamp(Number(item?.x || 50), 0, 100),
            y: clamp(Number(item?.y || 50), 0, 100),
          }))
          .filter((item) => allowed.has(item.text))
      : [];

    const seen = new Set();
    const uniqueLayout = [];
    layout.forEach((item) => {
      if (seen.has(item.text)) return;
      seen.add(item.text);
      uniqueLayout.push(item);
    });

    (prompt?.elements || []).forEach((element, index) => {
      if (seen.has(element)) return;
      uniqueLayout.push({
        text: element,
        x: 18 + ((index % 3) * 30),
        y: 22 + (Math.floor(index / 3) * 28),
      });
    });

    return {
      kind: 'arrange',
      layout: uniqueLayout,
      elements: [...(prompt?.elements || [])],
    };
  }

  function getCurrentPrompt(studio) {
    return studio.prompts[studio.roundIndex] || studio.prompts[0];
  }

  function emitStudioQuestion(room, io, phase, options = {}) {
    const studio = room.creatorStudio;
    const prompt = getCurrentPrompt(studio);
    const creator = studio.creatorId ? room.players.get(studio.creatorId) : null;
    const connected = getConnectedPlayers(room);

    ensureScoreboard(room);

    const payload = {
      type: 'creator_studio',
      text: 'Creator Studio',
      creatorStudio: {
        phase,
        round: studio.roundIndex + 1,
        totalRounds: studio.totalRounds,
        creatorId: studio.creatorId || null,
        creatorNickname: creator?.nickname || null,
        prompt: {
          id: prompt.id,
          kind: prompt.kind,
          text: prompt.text,
          elements: [...(prompt.elements || [])],
        },
        submission: phase === 'create' ? null : studio.submission,
        ratedCount: Number(studio.ratedCount || 0),
        eligibleRaters: Number(studio.eligibleRaters || 0),
        averageRating: Number(studio.averageRating || 0),
        ratings: Array.isArray(studio.lastRatings) ? studio.lastRatings : [],
        scoreboard: getSortedScoreboard(room),
        nextRoundInSec: Number(options.nextRoundInSec || 0),
      },
    };

    const duration = Number(options.durationSec || DEFAULT_CREATE_DURATION_SEC);

    room.questionIndex = studio.roundIndex;
    room.questionDuration = duration;
    room.questionStartTime = Date.now();
    room.answerOpenAt = Date.now();
    room.currentQuestionPayload = payload;
    room.currentQuestionMeta = room.currentQuestionMeta || {};
    room.currentQuestionMeta.creatorStudioPhase = phase;

    io.to(room.pin).emit('game:question', {
      questionIndex: studio.roundIndex,
      total: studio.totalRounds,
      duration,
      question: payload,
      players: connected.map((player) => ({
        id: player.id,
        nickname: player.nickname,
        avatar: player.avatar || '🎮',
        score: Number(room.creatorStudio.scoreboard?.[player.id]?.score || 0),
        streak: 0,
        isHost: !!player.isHostPlayer,
      })),
    });
  }

  function emitRatingUpdate(room, io) {
    const studio = room.creatorStudio;
    const values = Object.values(studio.ratings || {});
    const ratedCount = values.length;
    const average = ratedCount ? values.reduce((sum, value) => sum + Number(value || 0), 0) / ratedCount : 0;

    studio.ratedCount = ratedCount;
    studio.averageRating = average;

    io.to(room.pin).emit('creator:rating_update', {
      ratedCount,
      eligibleRaters: Number(studio.eligibleRaters || 0),
      averageRating: Number(average.toFixed(2)),
    });
  }

  function finalizeRound(room, io) {
    const studio = room.creatorStudio;
    if (!studio || studio.phase !== 'rating') return;

    clearPhaseTimer(room);

    const ratingEntries = Object.entries(studio.ratings || {}).map(([playerId, rating]) => {
      const p = room.players.get(playerId);
      return {
        playerId,
        nickname: p?.nickname || 'Player',
        rating: Number(rating || 0),
      };
    });

    const count = ratingEntries.length;
    const average = count
      ? ratingEntries.reduce((sum, item) => sum + item.rating, 0) / count
      : 0;

    studio.averageRating = average;
    studio.lastRatings = ratingEntries
      .slice()
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);

    if (studio.creatorId && studio.scoreboard?.[studio.creatorId]) {
      studio.scoreboard[studio.creatorId].score = Number(studio.scoreboard[studio.creatorId].score || 0) + average;
    }

    const isLastRound = studio.roundIndex >= studio.totalRounds - 1;
    studio.phase = 'result';

    emitStudioQuestion(room, io, 'result', {
      durationSec: RESULT_DURATION_SEC,
      nextRoundInSec: isLastRound ? 0 : RESULT_DURATION_SEC,
    });

    studio.phaseTimer = setTimeout(() => {
      if (isLastRound) {
        room.state = 'finished';
        io.to(room.pin).emit('game:over', {
          leaderboard: toRoundLeaderboard(room),
          creatorStudio: {
            totalRounds: studio.totalRounds,
            scoreboard: getSortedScoreboard(room),
          },
        });
        return;
      }

      studio.roundIndex += 1;
      startCreatePhase(room, io);
    }, RESULT_DURATION_SEC * 1000);
  }

  function beginRatingPhase(room, io) {
    const studio = room.creatorStudio;
    if (!studio || studio.phase !== 'create') return;

    clearPhaseTimer(room);

    const prompt = getCurrentPrompt(studio);
    if (!studio.submission) {
      studio.submission = prompt.kind === 'arrange'
        ? normalizeArrangeSubmission(prompt, { layout: [] })
        : normalizeDrawSubmission({ strokes: [] });
    }

    const connected = getConnectedPlayers(room);
    studio.phase = 'rating';
    studio.ratings = {};
    studio.lastRatings = [];
    studio.ratedCount = 0;
    studio.averageRating = 0;
    studio.eligibleRaters = Math.max(0, connected.filter((player) => player.id !== studio.creatorId).length);

    emitStudioQuestion(room, io, 'rating', { durationSec: RATING_DURATION_SEC });
    emitRatingUpdate(room, io);

    studio.phaseTimer = setTimeout(() => {
      finalizeRound(room, io);
    }, RATING_DURATION_SEC * 1000);
  }

  function startCreatePhase(room, io) {
    const studio = room.creatorStudio;
    if (!studio || room.state === 'finished') return;

    clearPhaseTimer(room);

    const creator = chooseCreator(room);
    if (!creator) {
      room.state = 'finished';
      io.to(room.pin).emit('game:over', {
        leaderboard: toRoundLeaderboard(room),
        creatorStudio: {
          reason: 'not_enough_players',
          totalRounds: studio.totalRounds,
          scoreboard: getSortedScoreboard(room),
        },
      });
      return;
    }

    const prompt = getCurrentPrompt(studio);
    ensureScoreboard(room);

    studio.phase = 'create';
    studio.creatorId = creator.id;
    studio.lastCreatorId = creator.id;
    studio.submission = null;
    studio.ratings = {};
    studio.lastRatings = [];
    studio.ratedCount = 0;
    studio.eligibleRaters = 0;
    studio.averageRating = 0;

    emitStudioQuestion(room, io, 'create', {
      durationSec: Number(prompt.createDurationSec || DEFAULT_CREATE_DURATION_SEC),
    });

    studio.phaseTimer = setTimeout(() => {
      beginRatingPhase(room, io);
    }, Number(prompt.createDurationSec || DEFAULT_CREATE_DURATION_SEC) * 1000);
  }

  return {
    id: 'creator-studio',

    onGameStart({ room, io, socket, quizData }) {
      const connected = getConnectedPlayers(room);
      if (connected.length < 2) {
        socket.emit('room:error', {
          message: 'Creator Studio يحتاج لاعبين متصلين على الأقل.',
          code: 'CREATOR_STUDIO_NOT_ENOUGH_PLAYERS',
        });
        return false;
      }

      const prompts = buildPrompts(quizData);

      room.creatorStudio = {
        prompts,
        roundIndex: 0,
        totalRounds: prompts.length,
        creatorId: null,
        lastCreatorId: null,
        phase: 'create',
        submission: null,
        ratings: {},
        lastRatings: [],
        ratedCount: 0,
        eligibleRaters: 0,
        averageRating: 0,
        scoreboard: {},
        phaseTimer: null,
      };

      room.questionIndex = 0;
      room.questions = prompts.map(() => ({ type: 'creator_studio', text: 'Creator Studio' }));
      room.questionDuration = DEFAULT_CREATE_DURATION_SEC;
      room.questionStartTime = Date.now();
      room.answerOpenAt = Date.now();
      room.paused = false;
      room.pausedTimeRemaining = 0;
      room.state = 'question';

      io.to(room.pin).emit('game:start', {
        totalQuestions: prompts.length,
      });

      startCreatePhase(room, io);
      return true;
    },

    onQuestionDispatch() {
      return true;
    },

    onPlayerAnswer({ room, io, socket, player, answer }) {
      const studio = room?.creatorStudio;
      if (!studio || room.state !== 'question') return true;

      if (answer?.action === 'submit_creation') {
        if (studio.phase !== 'create') return true;
        if (!player || player.id !== studio.creatorId) {
          socket.emit('room:error', {
            message: 'Only the selected creator can submit this round.',
            code: 'CREATOR_STUDIO_CREATOR_ONLY',
          });
          return true;
        }

        const prompt = getCurrentPrompt(studio);
        studio.submission = prompt.kind === 'arrange'
          ? normalizeArrangeSubmission(prompt, answer?.creation || {})
          : normalizeDrawSubmission(answer?.creation || {});

        socket.emit('creator:submission_saved', { ok: true });
        beginRatingPhase(room, io);
        return true;
      }

      if (answer?.action === 'rate') {
        if (studio.phase !== 'rating') return true;
        if (!player || player.id === studio.creatorId) return true;

        const rating = clamp(Math.round(Number(answer?.rating || 0)), 1, 10);
        studio.ratings[player.id] = rating;
        emitRatingUpdate(room, io);

        if (studio.ratedCount >= studio.eligibleRaters && studio.eligibleRaters > 0) {
          finalizeRound(room, io);
        }
        return true;
      }

      return true;
    },

    onQuestionEnd() {
      return true;
    },

    onGameOver({ room, io, endedByHost }) {
      if (!room?.creatorStudio) return true;
      clearPhaseTimer(room);

      if (room.state !== 'finished') {
        room.state = 'finished';
        io.to(room.pin).emit('game:over', {
          leaderboard: toRoundLeaderboard(room),
          endedByHost: !!endedByHost,
          creatorStudio: {
            totalRounds: room.creatorStudio.totalRounds,
            scoreboard: getSortedScoreboard(room),
          },
        });
      }

      return true;
    },
  };
}

module.exports = { createCreatorStudioRuntime };
