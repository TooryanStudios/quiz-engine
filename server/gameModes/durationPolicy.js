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
 * No hardcoded defaults, min, or max. Admin-set values are used as-is.
 */

const GAME_MODE_DURATION_POLICIES = Object.freeze({
  'match-plus-arena': { type: 'admin' },
  'puzzle-relay':     { type: 'per-round' },
  'xo-duel':          { type: 'self' },
  'gear-machine':     { type: 'self' },
  'creator-studio':   { type: 'self' },
  'clue-chain':       { type: 'per-round' },
  'mystery-room-quiz':{ type: 'per-round' },
  'build-the-story':  { type: 'per-round' },
  'map-quest-trivia': { type: 'per-round' },
  'debate-duel-quiz': { type: 'per-round' },
  'time-pressure-heist': { type: 'per-round' },
  'memory-grid-battle':  { type: 'per-round' },
  'reverse-quiz':     { type: 'per-round' },
  'fact-or-fiction-lab':  { type: 'per-round' },
  'creative-constraint-quiz': { type: 'per-round' },
  'alliance-betrayal-mode':   { type: 'per-round' },
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
  const adminDur = _readAdminDuration(room);

  // ─── No recognized game mode → standard quiz behaviour ───
  if (!policy) {
    // Even without a policy, honour admin-set gameDurationSec if present
    if (adminDur) return { durationSec: adminDur, source: 'admin-config (no-policy)' };
    const qDur = Number(question?.duration);
    const dur = (Number.isFinite(qDur) && qDur >= 1) ? qDur : (platformDefaultSec || 20);
    return { durationSec: dur, source: 'quiz-question-default' };
  }

  // ─── 'self' — runtime manages its own timer; admin overrides if set ───
  if (policy.type === 'self') {
    if (adminDur) return { durationSec: adminDur, source: 'admin-config (self-managed)' };
    // Let the runtime handle it — don't override with a hardcoded value
    const qDur = Number(question?.duration);
    const dur = (Number.isFinite(qDur) && qDur >= 1) ? qDur : (platformDefaultSec || 20);
    return { durationSec: dur, source: 'runtime-managed' };
  }

  // ─── 'admin' — use gameDurationSec exactly as set, no clamping ───
  if (policy.type === 'admin') {
    if (adminDur) return { durationSec: adminDur, source: 'admin-config' };
    // If admin hasn't configured duration, use question's own duration
    const qDur = Number(question?.duration);
    const dur = (Number.isFinite(qDur) && qDur >= 1) ? qDur : (platformDefaultSec || 20);
    return { durationSec: dur, source: 'question-fallback (no admin config)' };
  }

  // ─── 'per-round' — per-question; admin override if set ───
  if (policy.type === 'per-round') {
    if (adminDur) return { durationSec: adminDur, source: 'admin-config' };
    const qDur = Number(question?.duration);
    if (Number.isFinite(qDur) && qDur >= 1) return { durationSec: qDur, source: 'question-duration' };
    return { durationSec: platformDefaultSec || 20, source: 'platform-default' };
  }

  // ─── 'none' — no timer ───
  if (policy.type === 'none') return { durationSec: 0, source: 'no-timer' };

  // Catch-all — no hardcoded value, use platform default
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

/**
 * Get the policy definition for a mode (used by admin UI).
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
