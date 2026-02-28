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

function normalizeText(value, fallback) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

function toPairStrings(option, fallbackLeft, fallbackRight) {
  if (typeof option === 'string' && option.trim()) {
    return { left: option.trim(), right: option.trim() };
  }
  return { left: fallbackLeft, right: fallbackRight };
}

function transformLegacyQuestionToMatchPlus(questionPayload, room) {
  if (!questionPayload || typeof questionPayload !== 'object') return questionPayload;

  const configuredMode = normalizeMode(room?.miniGameConfig?.defaultMatchPlusMode || room?.matchPlusMode || questionPayload.matchPlusMode);
  const configuredGrid = Number(room?.miniGameConfig?.defaultPuzzleGridSize || questionPayload.matchPlusGridSize || 3);
  const safeGrid = Number.isInteger(configuredGrid) ? Math.max(2, Math.min(4, configuredGrid)) : 3;
  const configuredImage = typeof room?.miniGameConfig?.defaultPuzzleImage === 'string' && room.miniGameConfig.defaultPuzzleImage.trim()
    ? room.miniGameConfig.defaultPuzzleImage.trim()
    : (typeof questionPayload.matchPlusImage === 'string' ? questionPayload.matchPlusImage : '');

  if (questionPayload.type === 'match_plus') {
    questionPayload.matchPlusMode = configuredMode;
    questionPayload.matchPlusGridSize = safeGrid;
    questionPayload.matchPlusImage = configuredImage;
    return questionPayload;
  }

  const sourceText = normalizeText(questionPayload.text, 'Match Plus Arena');
  const options = Array.isArray(questionPayload.options) ? questionPayload.options : [];

  let pairs = [];

  if (options.length >= 2) {
    pairs = options.slice(0, 6).map((option, index) => {
      const fallback = `Item ${index + 1}`;
      const pair = toPairStrings(option, fallback, fallback);
      return {
        left: pair.left,
        right: pair.right,
      };
    });
  } else {
    pairs = [
      { left: sourceText, right: sourceText },
      { left: 'Option 1', right: 'Option 1' },
      { left: 'Option 2', right: 'Option 2' },
      { left: 'Option 3', right: 'Option 3' },
    ];
  }

  return {
    ...questionPayload,
    type: 'match_plus',
    text: sourceText,
    pairs,
    matchPlusMode: configuredMode,
    matchPlusGridSize: safeGrid,
    matchPlusImage: configuredImage,
    correctIndex: undefined,
    correctIndices: undefined,
    options: undefined,
  };
}

function createMatchPlusArenaRuntime() {
  return {
    id: 'match-plus-arena',

    onGameStart({ room }) {
      if (!room || !Array.isArray(room.questions)) return false;
      room.questions = room.questions.map((question) => transformLegacyQuestionToMatchPlus(question, room));
      return false;
    },

    onQuestionDispatch({ questionPayload, room }) {
      if (!questionPayload || typeof questionPayload !== 'object') return false;
      if (questionPayload.type !== 'match_plus') {
        const transformed = transformLegacyQuestionToMatchPlus(questionPayload, room);
        Object.keys(questionPayload).forEach((key) => {
          delete questionPayload[key];
        });
        Object.assign(questionPayload, transformed);
      }
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
