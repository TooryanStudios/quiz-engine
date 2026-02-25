'use strict';

module.exports = function createMultiHandler({ calculateScore }) {
  return {
    buildQuestionPayload: ({ q }) => ({ options: q.options }),
    evaluateAnswer: ({ q, player, answer, timeTaken, duration }) => {
      const submitted = [...(answer?.answerIndices || [])].sort((a, b) => a - b);
      const correct = [...(q.correctIndices || [])].sort((a, b) => a - b);
      const isCorrect = submitted.length === correct.length && submitted.every((v, i) => v === correct[i]);
      if (isCorrect) {
        player.streak++;
        player.maxStreak = Math.max(player.maxStreak, player.streak);
      } else {
        player.streak = 0;
      }
      return {
        isCorrect,
        roundScore: calculateScore(timeTaken, isCorrect, player.streak, duration),
      };
    },
    buildCorrectReveal: ({ q }) => ({
      correctIndices: q.correctIndices,
      correctOptions: (q.correctIndices || []).map((i) => q.options[i]),
    }),
  };
};
