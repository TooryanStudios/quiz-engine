'use strict';

module.exports = function createMatchHandler({ calculatePartialScore }) {
  return {
    buildQuestionPayload: ({ room, q }) => {
      const n = q.pairs.length;
      const rightOrder = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rightOrder[i], rightOrder[j]] = [rightOrder[j], rightOrder[i]];
      }
      room.currentQuestionMeta.rightOrder = rightOrder;
      return {
        lefts: q.pairs.map((p) => p.left),
        rights: rightOrder.map((i) => q.pairs[i].right),
      };
    },
    evaluateAnswer: ({ room, q, player, answer, timeTaken, duration }) => {
      const submitted = answer?.matches || [];
      const rightOrder = room.currentQuestionMeta?.rightOrder || [];
      let correct = 0;
      for (let i = 0; i < q.pairs.length; i++) {
        if (submitted[i] !== undefined && rightOrder[submitted[i]] === i) correct++;
      }
      const fraction = correct / q.pairs.length;
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
    buildCorrectReveal: ({ q }) => ({ correctPairs: q.pairs }),
  };
};
