const MATCH_PLUS_MODES = [
  'emoji-emoji',
  'emoji-text',
  'image-text',
  'image-image',
  'image-puzzle',
];

const FALLBACK_PUZZLE_IMAGE = '/images/QYan_logo_300x164.jpg';
const MATCH_PLUS_ARENA_BUILD_MARKER = 'Match+ Build: 2026-03-01 • grid-lines • v128';

function ensureBuildMarker() {
  if (typeof document === 'undefined') return;
  let badge = document.getElementById('match-plus-build-marker');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'match-plus-build-marker';
    badge.style.position = 'fixed';
    badge.style.right = '10px';
    badge.style.bottom = '10px';
    badge.style.zIndex = '9999';
    badge.style.padding = '6px 10px';
    badge.style.borderRadius = '8px';
    badge.style.background = 'rgba(3, 7, 18, 0.78)';
    badge.style.color = '#dbeafe';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = '700';
    badge.style.letterSpacing = '0.2px';
    badge.style.pointerEvents = 'none';
    document.body.appendChild(badge);
  }
  badge.textContent = MATCH_PLUS_ARENA_BUILD_MARKER;
}

function normalizeMode(value) {
  if (!value || typeof value !== 'string') return 'image-puzzle';
  const normalized = value.trim().toLowerCase();
  return MATCH_PLUS_MODES.includes(normalized) ? normalized : 'image-puzzle';
}

function modeLabel(mode) {
  if (mode === 'emoji-emoji') return 'Emoji ↔ Emoji';
  if (mode === 'emoji-text') return 'Emoji ↔ Text';
  if (mode === 'image-text') return 'Image ↔ Text';
  if (mode === 'image-puzzle') return 'Image Puzzle';
  return 'Image ↔ Image';
}

/** Returns true if value looks like an image URL (not a numeric piece index) */
function looksLikeImageUrl(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return v.startsWith('/') || v.startsWith('http') || v.startsWith('data:image') || v.startsWith('blob:');
}

/**
 * Enforce puzzle mode on the question before rendering.
 * Works even when the server sent old/incorrect matchPlusMode or image-based pairs.
 */
function normalizePuzzleQuestion(question) {
  if (!question || question.type !== 'match_plus') return;

  // Always force image-puzzle in match-plus-arena
  question.matchPlusMode = 'image-puzzle';

  // Ensure a puzzle image is set
  if (!question.matchPlusImage || !question.matchPlusImage.trim()) {
    question.matchPlusImage = FALLBACK_PUZZLE_IMAGE;
  }

  // Normalize grid size
  const grid = Number(question.matchPlusGridSize);
  question.matchPlusGridSize = (Number.isInteger(grid) && grid >= 2 && grid <= 4) ? grid : 3;

  const lefts = Array.isArray(question.lefts) ? question.lefts : [];
  const rights = Array.isArray(question.rights) ? question.rights : [];

  // If lefts/rights are image URLs (old server sent image-image formatted data),
  // convert them to numeric piece indices while PRESERVING the server's shuffle order.
  const hasImageValues = lefts.some(looksLikeImageUrl) || rights.some(looksLikeImageUrl);
  if (hasImageValues) {
    // Map each unique left value to a stable piece number (1-based)
    const leftsIndexMap = new Map();
    lefts.forEach((l, i) => leftsIndexMap.set(l, i));
    // Slots: piece 1, 2, 3... in natural order
    question.lefts = lefts.map((_, i) => String(i + 1));
    // Pool chips: map each right value to its corresponding piece number
    // rights[j] = lefts[rightOrder[j]], so leftsIndexMap.get(rights[j]) = rightOrder[j]
    // Chip j then shows piece rightOrder[j]+1, preserving server shuffle semantics
    question.rights = rights.map(r => {
      const idx = leftsIndexMap.get(r);
      return idx !== undefined ? String(idx + 1) : String(lefts.indexOf(r) + 1 || 1);
    });
  } else if (lefts.length === 0) {
    // No data at all — create default 3×3 grid
    const count = question.matchPlusGridSize * question.matchPlusGridSize;
    const indices = Array.from({ length: count }, (_, i) => String(i + 1));
    question.lefts = indices;
    question.rights = [...indices].sort(() => Math.random() - 0.5);
  }
}

export const matchPlusArenaRuntime = {
  id: 'match-plus-arena',

  onGameStart({ state }) {
    ensureBuildMarker();
    if (state?.role !== 'player') return false;
    const msgEl = document.getElementById('player-answered-msg');
    if (msgEl) msgEl.textContent = '🧩 Match Plus Arena ready';
    return false;
  },

  onGameQuestion({ data, state, renderQuestion }) {
    ensureBuildMarker();
    // Normalize question to puzzle mode before rendering (works even with old server)
    if (data?.question) {
      normalizePuzzleQuestion(data.question);
    }

    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    renderQuestion(data, isHostOnly);

    if (state.role !== 'host') {
      const mode = normalizeMode(data?.question?.matchPlusMode);
      const msgEl = document.getElementById('player-answered-msg');
      if (msgEl) msgEl.textContent = `🧩 Image Puzzle • ${modeLabel(mode)}`;
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
