'use strict';

/**
 * ────────────────────────────────────────────────────────────
 * Game Mode Duration Policy
 * ────────────────────────────────────────────────────────────
 *
 * Each game mode has its own duration policy that is SEPARATE
 * from the quiz's per-question duration.
 *
 * Policy types:
 *   'admin'      — uses miniGameConfig.gameDurationSec from the admin panel
 *   'self'       — the runtime manages its own timer (e.g., xo-duel, gear-machine)
 *   'per-round'  — uses individual question durations from the quiz
 *   'none'       — no timer (game ends when player finishes or host ends it)
 *
 * defaultDurationSec — fallback if no config is provided
 * minDurationSec     — minimum allowed value (clamped)
 * maxDurationSec     — maximum allowed value (clamped)
 */

const GAME_MODE_DURATION_POLICIES = Object.freeze({
  'match-plus-arena': {
    type: 'admin',
    defaultDurationSec: 120,
    minDurationSec: 30,
    maxDurationSec: 600,
  },
  'puzzle-relay': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
  'xo-duel': {
    type: 'self',
    defaultDurationSec: 600,
    minDurationSec: 60,
    maxDurationSec: 1800,
  },
  'gear-machine': {
    type: 'self',
    defaultDurationSec: 900,
    minDurationSec: 120,
    maxDurationSec: 3600,
  },
  'creator-studio': {
    type: 'self',
    defaultDurationSec: 45,
    minDurationSec: 15,
    maxDurationSec: 120,
  },
  'clue-chain': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
  'mystery-room-quiz': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
  'build-the-story': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
  'map-quest-trivia': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
  'debate-duel-quiz': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
  'time-pressure-heist': {
    type: 'per-round',
    defaultDurationSec: 20,
    minDurationSec: 5,
    maxDurationSec: 60,
  },
  'memory-grid-battle': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
  'reverse-quiz': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
  'fact-or-fiction-lab': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
  'creative-constraint-quiz': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
  'alliance-betrayal-mode': {
    type: 'per-round',
    defaultDurationSec: 30,
    minDurationSec: 10,
    maxDurationSec: 120,
  },
});

/**
 * Resolve the effective duration for a question in a room.
 *
 * @param {object} room       — the room object (has gameMode, miniGameConfig, etc.)
 * @param {object} question   — the current question object
 * @param {number} platformDefaultSec — the platform's default question duration (e.g., 20)
 * @returns {{ durationSec: number, source: string }}
 */
function resolveGameDuration(room, question, platformDefaultSec) {
  const modeId = typeof room?.gameMode === 'string' ? room.gameMode.trim().toLowerCase() : '';
  const policy = GAME_MODE_DURATION_POLICIES[modeId] || null;

  // ─── No recognized game mode → use standard quiz question duration ───
  if (!policy) {
    const qDur = Number(question?.duration);
    const dur = (Number.isFinite(qDur) && qDur >= 1) ? qDur : (platformDefaultSec || 20);
    return { durationSec: dur, source: 'quiz-question-default' };
  }

  // ─── 'self' — the runtime handles its own timing completely ───
  //     We give it a generous fallback but the runtime overrides it anyway.
  if (policy.type === 'self') {
    const adminDur = _readAdminDuration(room);
    const dur = adminDur || policy.defaultDurationSec;
    return {
      durationSec: _clamp(dur, policy.minDurationSec, policy.maxDurationSec),
      source: adminDur ? 'admin-config (self-managed)' : 'policy-default (self-managed)',
    };
  }

  // ─── 'admin' — use the gameDurationSec from admin panel, ignore question duration ───
  if (policy.type === 'admin') {
    const adminDur = _readAdminDuration(room);
    if (adminDur) {
      return {
        durationSec: _clamp(adminDur, policy.minDurationSec, policy.maxDurationSec),
        source: 'admin-config',
      };
    }
    // Fallback: use policy default (NOT the quiz question's 20s)
    return {
      durationSec: policy.defaultDurationSec,
      source: 'policy-default',
    };
  }

  // ─── 'per-round' — use individual question duration from quiz ───
  if (policy.type === 'per-round') {
    const adminDur = _readAdminDuration(room);
    if (adminDur) {
      return {
        durationSec: _clamp(adminDur, policy.minDurationSec, policy.maxDurationSec),
        source: 'admin-config',
      };
    }
    const qDur = Number(question?.duration);
    if (Number.isFinite(qDur) && qDur >= 1) {
      return {
        durationSec: _clamp(qDur, policy.minDurationSec, policy.maxDurationSec),
        source: 'question-duration',
      };
    }
    return {
      durationSec: policy.defaultDurationSec,
      source: 'policy-default',
    };
  }

  // ─── 'none' — no timer ───
  if (policy.type === 'none') {
    return { durationSec: 0, source: 'no-timer' };
  }

  // Catch-all
  return { durationSec: platformDefaultSec || 20, source: 'fallback' };
}

/**
 * Read the admin-configured game duration from the room's miniGameConfig.
 * Returns a positive number or null.
 */
function _readAdminDuration(room) {
  const cfg = room?.miniGameConfig;
  if (!cfg || typeof cfg !== 'object') return null;

  const val = Number(cfg.gameDurationSec ?? cfg.defaultDuration);
  return (Number.isFinite(val) && val >= 1) ? Math.floor(val) : null;
}

function _clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

/**
 * Get the policy definition for a mode (used by admin UI to show defaults/limits).
 */
function getDurationPolicy(modeId) {
  const key = typeof modeId === 'string' ? modeId.trim().toLowerCase() : '';
  return GAME_MODE_DURATION_POLICIES[key] || null;
}

module.exports = {
  resolveGameDuration,
  getDurationPolicy,
  GAME_MODE_DURATION_POLICIES,
};
