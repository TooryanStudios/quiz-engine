import { puzzleRelayRuntime } from './puzzleRelay.runtime.js?v=122';
import { runtimeExampleRuntime } from './runtimeExample.runtime.js?v=122';
import { xoDuelRuntime } from './xoDuel.runtime.js?v=122';
import { gearMachineRuntime } from './gearMachine.runtime.js?v=122';
import { creatorStudioRuntime } from './creatorStudio.runtime.js?v=122';
import { matchPlusArenaRuntime } from './matchPlusArena.runtime.js?v=126';

const EMPTY_RUNTIME = Object.freeze({});

const MODE_RUNTIME_REGISTRY = {
  'puzzle-relay': puzzleRelayRuntime,
  'xo-duel': xoDuelRuntime,
  'gear-machine': gearMachineRuntime,
  'creator-studio': creatorStudioRuntime,
  'match-plus-arena': matchPlusArenaRuntime,
  'runtime-example': runtimeExampleRuntime,
};

function normalizeModeId(modeId) {
  if (!modeId || typeof modeId !== 'string') return '';
  return modeId.trim().toLowerCase();
}

export function resolveGameModeRuntime(modeId) {
  const normalized = normalizeModeId(modeId);
  if (!normalized) return EMPTY_RUNTIME;
  return MODE_RUNTIME_REGISTRY[normalized] || EMPTY_RUNTIME;
}

export function listRegisteredGameModeRuntimeIds() {
  return Object.keys(MODE_RUNTIME_REGISTRY);
}
