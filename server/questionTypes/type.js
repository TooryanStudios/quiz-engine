'use strict';

module.exports = function createTypeHandler({ calculateScore, isTypedAnswerCorrect }) {
  return {
    buildQuestionPayload: ({ q }) => ({ inputPlaceholder: q.inputPlaceholder || 'Type your answer' }),
    evaluateAnswer: ({ q, player, answer, timeTaken, duration }) => {
      const isCorrect = isTypedAnswerCorrect(answer, q.acceptedAnswers);
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
    buildCorrectReveal: ({ q }) => ({ acceptedAnswers: q.acceptedAnswers || [] }),
  };
};
