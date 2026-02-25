'use strict';

module.exports = function createSingleHandler({ calculateScore }) {
  return {
    buildQuestionPayload: ({ q }) => ({ options: q.options }),
    evaluateAnswer: ({ q, player, answer, timeTaken, duration }) => {
      const isCorrect = Boolean(answer && answer.answerIndex === q.correctIndex);
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
      correctIndex: q.correctIndex,
      correctOption: q.options[q.correctIndex],
    }),
  };
};
