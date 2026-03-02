'use strict';

const MATCH_PLUS_MODES = Object.freeze([
  'emoji-emoji',
  'emoji-text',
  'image-text',
  'image-image',
  'image-puzzle',
]);

function normalizeMode(value) {
  if (!value || typeof value !== 'string') return 'image-puzzle';
  const normalized = value.trim().toLowerCase();
  return MATCH_PLUS_MODES.includes(normalized) ? normalized : 'image-puzzle';
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
  // Salvage puzzle image from image-image pairs when matchPlusImage is not set
  const _salvagedImage = (() => {
    const pairsArr = Array.isArray(questionPayload.pairs) ? questionPayload.pairs : [];
    for (const p of pairsArr) {
      const l = typeof p?.left === 'string' ? p.left.trim() : '';
      if (l && (l.startsWith('http') || l.startsWith('/') || l.startsWith('data:image') || l.startsWith('blob:'))) {
        return l;
      }
    }
    return null;
  })();

  const configuredImage = (typeof room?.miniGameConfig?.defaultPuzzleImage === 'string' && room.miniGameConfig.defaultPuzzleImage.trim())
    ? room.miniGameConfig.defaultPuzzleImage.trim()
    : ((typeof questionPayload.matchPlusImage === 'string' && questionPayload.matchPlusImage.trim())
      ? questionPayload.matchPlusImage.trim()
      : (_salvagedImage || '/images/QYan_logo_300x164.jpg'));

  const configuredInstruction = typeof room?.miniGameConfig?.gameInstruction === 'string'
    ? room.miniGameConfig.gameInstruction.trim()
    : '';

  // Apply optional global duration override from miniGameConfig
  const configuredDuration = (() => {
    const d = Number(room?.miniGameConfig?.gameDurationSec ?? room?.miniGameConfig?.defaultDuration);
    return (Number.isInteger(d) && d >= 1) ? d : 0;
  })();

  if (questionPayload.type === 'match_plus') {
    questionPayload.matchPlusMode = configuredMode;
    questionPayload.matchPlusGridSize = safeGrid;
    questionPayload.matchPlusImage = configuredImage;
    questionPayload.matchPlusInstruction = configuredInstruction || (typeof questionPayload.matchPlusInstruction === 'string' ? questionPayload.matchPlusInstruction : '');
    if (configuredInstruction) questionPayload.text = configuredInstruction;
    if (configuredDuration) questionPayload.duration = configuredDuration;
    return questionPayload;
  }

  const sourceText = normalizeText(questionPayload.text, 'Match Plus Arena');
  const options = Array.isArray(questionPayload.options) ? questionPayload.options : [];

  let pairs = [];
  const isPuzzleMode = configuredMode === 'image-puzzle';

  if (isPuzzleMode) {
    // For image-puzzle mode: left = piece index (1-based), right = label text
    const labels = options.length >= 2
      ? options.slice(0, 9).map((opt, i) => (typeof opt === 'string' && opt.trim() ? opt.trim() : `${i + 1}`))
      : ['1', '2', '3', '4'];
    pairs = labels.map((label, index) => ({
      left: String(index + 1),
      right: label,
    }));
  } else if (options.length >= 2) {
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
    text: configuredInstruction || sourceText,
    pairs,
    matchPlusMode: configuredMode,
    matchPlusGridSize: safeGrid,
    matchPlusImage: configuredImage,
    matchPlusInstruction: configuredInstruction,
    ...(configuredDuration ? { duration: configuredDuration } : {}),
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
      if (room.questions.length > 1) {
        room.questions = [room.questions[0]];
      }
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
      const configuredInstruction = typeof room?.miniGameConfig?.gameInstruction === 'string'
        ? room.miniGameConfig.gameInstruction.trim()
        : '';
      questionPayload.matchPlusInstruction = configuredInstruction || (typeof questionPayload.matchPlusInstruction === 'string' ? questionPayload.matchPlusInstruction : '');
      if (configuredInstruction) questionPayload.text = configuredInstruction;
      return false;
    },

    onPlayerAnswer({ room, dispatchDefault }) {
      dispatchDefault();
      // In block mode, the dispatchDefault auto-end handles it;
      // but if somehow all pairs are matched before timeout, also signal via endBlock.
      // The dispatchDefault already calls endMiniGameBlock if all players answered,
      // so we just let it flow through.
      return true;
    },

    startBlock({ room, io, questionIndex, total, duration, players, blockConfig }) {
      // Build a synthetic match_plus question from the block config
      const syntheticQ = {
        type: 'match_plus',
        text: blockConfig?.instruction || '',
        matchPlusMode: blockConfig?.matchMode || 'image-puzzle',
        matchPlusGridSize: Number(blockConfig?.gridSize) || 3,
        matchPlusImage: blockConfig?.puzzleImage || '/images/QYan_logo_300x164.jpg',
        matchPlusInstruction: blockConfig?.instruction || '',
        pairs: [],
      };

      const questionPayload = transformLegacyQuestionToMatchPlus(syntheticQ, room);
      questionPayload.matchPlusPlugin = true;
      questionPayload.matchPlusModes = [...MATCH_PLUS_MODES];
      questionPayload.miniGameBlockId = 'match-plus-arena';

      room.currentQuestionPayload = { ...questionPayload };
      room.currentQuestionMeta = room.currentQuestionMeta || {};

      io.to(room.pin).emit('game:question', {
        questionIndex: questionIndex || 0,
        total: total || 1,
        question: questionPayload,
        duration: duration || 60,
        players: players || [],
      });

      return true;
    },
  };
}

module.exports = { createMatchPlusArenaRuntime };
