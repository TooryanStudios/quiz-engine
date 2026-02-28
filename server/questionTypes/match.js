'use strict';

const MATCH_PLUS_MODES = ['emoji-emoji', 'emoji-text', 'image-text', 'image-image', 'image-puzzle'];

function normalizeMatchPlusMode(value) {
  if (typeof value !== 'string') return 'image-image';
  const normalized = value.trim().toLowerCase();
  return MATCH_PLUS_MODES.includes(normalized) ? normalized : 'image-image';
}

function normalizeMatchPlusGridSize(value) {
  const next = Number(value);
  if (!Number.isInteger(next)) return 3;
  return Math.min(4, Math.max(2, next));
}

function buildPuzzlePairs(gridSize) {
  const count = gridSize * gridSize;
  return Array.from({ length: count }, (_, index) => {
    const piece = String(index + 1);
    return { left: piece, right: piece };
  });
}

module.exports = function createMatchHandler({ calculatePartialScore }) {
  return {
    buildQuestionPayload: ({ room, q }) => {
      const isMatchPlus = q.type === 'match_plus';
      const mode = isMatchPlus ? normalizeMatchPlusMode(q.matchPlusMode) : null;
      const gridSize = isMatchPlus ? normalizeMatchPlusGridSize(q.matchPlusGridSize) : null;
      const pairs = (isMatchPlus && mode === 'image-puzzle')
        ? buildPuzzlePairs(gridSize)
        : (Array.isArray(q.pairs) ? q.pairs : []);
      const safePairs = pairs.length > 0 ? pairs : [
        { left: 'A', right: '1' },
        { left: 'B', right: '2' },
        { left: 'C', right: '3' },
        { left: 'D', right: '4' },
      ];

      const n = safePairs.length;
      const rightOrder = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rightOrder[i], rightOrder[j]] = [rightOrder[j], rightOrder[i]];
      }
      room.currentQuestionMeta.rightOrder = rightOrder;
      if (isMatchPlus) {
        room.currentQuestionMeta.matchPlusMode = mode;
        room.currentQuestionMeta.matchPlusGridSize = gridSize;
      }

      return {
        lefts: safePairs.map((p) => p.left),
        rights: rightOrder.map((i) => safePairs[i].right),
        ...(isMatchPlus ? {
          matchPlusMode: mode,
          matchPlusImage: typeof q.matchPlusImage === 'string' ? q.matchPlusImage : '',
          matchPlusGridSize: gridSize,
        } : {}),
      };
    },
    evaluateAnswer: ({ room, q, player, answer, timeTaken, duration }) => {
      const submitted = answer?.matches || [];
      const rightOrder = room.currentQuestionMeta?.rightOrder || [];
      const expectedCount = rightOrder.length || (Array.isArray(q.pairs) ? q.pairs.length : 0);
      let correct = 0;
      for (let i = 0; i < expectedCount; i++) {
        if (submitted[i] !== undefined && rightOrder[submitted[i]] === i) correct++;
      }
      const fraction = expectedCount > 0 ? (correct / expectedCount) : 0;
      const isCorrect = fraction === 1;
      if (isCorrect) {
        player.streak++;
        player.maxStreak = Math.max(player.maxStreak, player.streak);
      } else {
        player.streak = 0;
      }
      return {
        isCorrect,
        roundScore: calculatePartialScore(timeTaken, fraction, player.streak, duration),
      };
    },
    buildCorrectReveal: ({ q }) => ({
      correctPairs: (q.type === 'match_plus' && normalizeMatchPlusMode(q.matchPlusMode) === 'image-puzzle')
        ? buildPuzzlePairs(normalizeMatchPlusGridSize(q.matchPlusGridSize))
        : q.pairs,
      ...(q.type === 'match_plus' ? {
        matchPlusMode: normalizeMatchPlusMode(q.matchPlusMode),
        matchPlusImage: typeof q.matchPlusImage === 'string' ? q.matchPlusImage : '',
        matchPlusGridSize: normalizeMatchPlusGridSize(q.matchPlusGridSize),
      } : {}),
    }),
  };
};
