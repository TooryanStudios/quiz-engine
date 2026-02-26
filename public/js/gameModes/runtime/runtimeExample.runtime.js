function getQuestionTypeBadge(questionType) {
  if (!questionType) return 'Question';
  return String(questionType).replace(/_/g, ' ').toUpperCase();
}

export const runtimeExampleRuntime = {
  id: 'runtime-example',

  onGameStart({ totalQuestions, state }) {
    if (state?.role === 'player') {
      const msgEl = document.getElementById('player-answered-msg');
      if (msgEl) msgEl.textContent = `🧩 Runtime Example active • ${totalQuestions} questions`;
    }
    return false;
  },

  onGameQuestion({ data, state, renderQuestion }) {
    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    renderQuestion(data, isHostOnly);

    if (state.role !== 'host') {
      const msgEl = document.getElementById('player-answered-msg');
      if (msgEl) {
        const badge = getQuestionTypeBadge(data?.question?.type);
        msgEl.textContent = `🧩 Runtime Example • ${badge}`;
      }
    }

    return true;
  },

  onQuestionEnd(_ctx) {
    return false;
  },

  onLeaderboard(_ctx) {
    return false;
  },

  onGameOver(_ctx) {
    return false;
  },
};
