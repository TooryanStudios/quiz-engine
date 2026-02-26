import { puzzleRelayRuntime } from './puzzleRelay.runtime.js?v=121';
import { runtimeExampleRuntime } from './runtimeExample.runtime.js?v=121';

const EMPTY_RUNTIME = Object.freeze({});

const MODE_RUNTIME_REGISTRY = {
  'puzzle-relay': puzzleRelayRuntime,
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
