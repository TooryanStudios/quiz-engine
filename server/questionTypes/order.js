'use strict';

module.exports = function createOrderHandler({ calculatePartialScore }) {
  return {
    buildQuestionPayload: ({ q }) => ({ items: q.items }),
    evaluateAnswer: ({ q, player, answer, timeTaken, duration }) => {
      const submitted = answer?.order || [];
      let correct = 0;
      q.correctOrder.forEach((itemIdx, pos) => {
        if (submitted[pos] === itemIdx) correct++;
      });
      const fraction = correct / q.items.length;
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
      items: q.items,
      correctOrder: q.correctOrder,
    }),
  };
};
