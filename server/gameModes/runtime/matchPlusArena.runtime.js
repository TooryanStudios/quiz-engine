'use strict';

const MATCH_PLUS_MODES = Object.freeze([
  'emoji-emoji',
  'emoji-text',
  'image-text',
  'image-image',
  'image-puzzle',
]);

function normalizeMode(value) {
  if (!value || typeof value !== 'string') return 'image-image';
  const normalized = value.trim().toLowerCase();
  return MATCH_PLUS_MODES.includes(normalized) ? normalized : 'image-image';
}

function createMatchPlusArenaRuntime() {
  return {
    id: 'match-plus-arena',

    onQuestionDispatch({ questionPayload, room }) {
      if (!questionPayload || questionPayload.type !== 'match_plus') return false;
      questionPayload.matchPlusPlugin = true;
      questionPayload.matchPlusModes = [...MATCH_PLUS_MODES];
      questionPayload.matchPlusMode = normalizeMode(questionPayload.matchPlusMode || room?.matchPlusMode);
      return false;
    },

    onPlayerAnswer({ dispatchDefault }) {
      dispatchDefault();
      return true;
    },
  };
}

module.exports = { createMatchPlusArenaRuntime };
