'use strict';

module.exports = function createBossHandler({ calculateScore, calculateBossDamage, BOSS_TEAM_BONUS }) {
  return {
    buildQuestionPayload: ({ room, q }) => {
      const bossHp = Math.max(1, Number(q.bossHp) || 100);
      room.currentQuestionMeta.bossName = q.bossName || 'Tooryan Boss';
      room.currentQuestionMeta.bossMaxHp = bossHp;
      room.currentQuestionMeta.bossRemainingHp = bossHp;
      room.currentQuestionMeta.bossDefeated = false;
      room.currentQuestionMeta.totalDamage = 0;
      return {
        options: q.options,
        boss: {
          name: room.currentQuestionMeta.bossName,
          maxHp: room.currentQuestionMeta.bossMaxHp,
          remainingHp: room.currentQuestionMeta.bossRemainingHp,
        },
      };
    },
    evaluateAnswer: ({ room, q, player, answer, timeTaken, duration, challengeSettings }) => {
      const isCorrect = Boolean(answer && answer.answerIndex === q.correctIndex);
      if (isCorrect) {
        player.streak++;
        player.maxStreak = Math.max(player.maxStreak, player.streak);
      } else {
        player.streak = 0;
      }
      const roundScore = calculateScore(timeTaken, isCorrect, player.streak, duration);
      if (isCorrect && room.currentQuestionMeta) {
        const damage = calculateBossDamage(timeTaken, duration, challengeSettings);
        room.currentQuestionMeta.totalDamage += damage;
      }
      return { isCorrect, roundScore };
    },
    applyPostRound: ({ room, roundScores, challengeSettings }) => {
      if (!room.currentQuestionMeta) return;
      const remainingHp = Math.max(0, room.currentQuestionMeta.bossMaxHp - room.currentQuestionMeta.totalDamage);
      room.currentQuestionMeta.bossRemainingHp = remainingHp;
      room.currentQuestionMeta.bossDefeated = remainingHp <= 0;
      if (room.currentQuestionMeta.bossDefeated) {
        const teamBonus = Number(challengeSettings.bossTeamBonus || BOSS_TEAM_BONUS);
        roundScores.forEach((entry) => {
          const p = room.players.get(entry.id);
          if (!p) return;
          p.score += teamBonus;
          entry.roundScore += teamBonus;
          entry.totalScore = p.score;
        });
      }
    },
    buildCorrectReveal: ({ room, q, challengeSettings }) => ({
      correctIndex: q.correctIndex,
      correctOption: q.options[q.correctIndex],
      boss: {
        name: room.currentQuestionMeta?.bossName || q.bossName || 'Tooryan Boss',
        maxHp: room.currentQuestionMeta?.bossMaxHp || Math.max(1, Number(q.bossHp) || 100),
        remainingHp: room.currentQuestionMeta?.bossRemainingHp || 0,
        totalDamage: room.currentQuestionMeta?.totalDamage || 0,
        teamBonus: room.currentQuestionMeta?.bossDefeated ? Number(challengeSettings.bossTeamBonus || BOSS_TEAM_BONUS) : 0,
        defeated: Boolean(room.currentQuestionMeta?.bossDefeated),
      },
    }),
  };
};
