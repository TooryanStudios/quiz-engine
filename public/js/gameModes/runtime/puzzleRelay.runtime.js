export const puzzleRelayRuntime = {
  id: 'puzzle-relay',

  onGameStart(_ctx) {
    return false;
  },

  onGameQuestion(_ctx) {
    return false;
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
