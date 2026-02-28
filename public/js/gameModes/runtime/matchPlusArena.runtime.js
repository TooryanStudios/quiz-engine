const MATCH_PLUS_MODES = [
  'emoji-emoji',
  'emoji-text',
  'image-text',
  'image-image',
  'image-puzzle',
];

function normalizeMode(value) {
  if (!value || typeof value !== 'string') return 'image-image';
  const normalized = value.trim().toLowerCase();
  return MATCH_PLUS_MODES.includes(normalized) ? normalized : 'image-image';
}

function modeLabel(mode) {
  if (mode === 'emoji-emoji') return 'Emoji ↔ Emoji';
  if (mode === 'emoji-text') return 'Emoji ↔ Text';
  if (mode === 'image-text') return 'Image ↔ Text';
  if (mode === 'image-puzzle') return 'Image Puzzle';
  return 'Image ↔ Image';
}

export const matchPlusArenaRuntime = {
  id: 'match-plus-arena',

  onGameStart({ state }) {
    if (state?.role !== 'player') return false;
    const msgEl = document.getElementById('player-answered-msg');
    if (msgEl) msgEl.textContent = '🧩 Match Plus Arena ready';
    return false;
  },

  onGameQuestion({ data, state, renderQuestion }) {
    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    renderQuestion(data, isHostOnly);

    if (state.role !== 'host') {
      const mode = normalizeMode(data?.question?.matchPlusMode);
      const msgEl = document.getElementById('player-answered-msg');
      if (msgEl) msgEl.textContent = `🧩 Match Plus Arena • ${modeLabel(mode)}`;
    }

    return true;
  },

  onQuestionEnd() {
    return false;
  },

  onLeaderboard() {
    return false;
  },

  onGameOver() {
    return false;
  },
};
