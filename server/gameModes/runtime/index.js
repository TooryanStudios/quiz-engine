'use strict';

const { createPuzzleRelayRuntime } = require('./puzzleRelay.runtime');
const { createRuntimeExampleRuntime } = require('./runtimeExample.runtime');
const { createXoDuelRuntime } = require('./xoDuel.runtime');
const { createGearMachineRuntime } = require('./gearMachine.runtime');
const { createCreatorStudioRuntime } = require('./creatorStudio.runtime');
const { createMatchPlusArenaRuntime } = require('./matchPlusArena.runtime');

const EMPTY_RUNTIME = Object.freeze({});

function normalizeModeId(modeId) {
  if (!modeId || typeof modeId !== 'string') return '';
  return modeId.trim().toLowerCase();
}

function createGameModeRuntime(modeId) {
  const normalizedModeId = normalizeModeId(modeId);
  if (!normalizedModeId) return EMPTY_RUNTIME;

  if (normalizedModeId === 'puzzle-relay') return createPuzzleRelayRuntime();
  if (normalizedModeId === 'xo-duel') return createXoDuelRuntime();
  if (normalizedModeId === 'gear-machine') return createGearMachineRuntime();
  if (normalizedModeId === 'creator-studio') return createCreatorStudioRuntime();
  if (normalizedModeId === 'match-plus-arena') return createMatchPlusArenaRuntime();
  if (normalizedModeId === 'runtime-example') return createRuntimeExampleRuntime();

  return EMPTY_RUNTIME;
}

function listRegisteredGameModes() {
  return ['puzzle-relay', 'xo-duel', 'gear-machine', 'creator-studio', 'match-plus-arena', 'runtime-example'];
}

module.exports = {
  createGameModeRuntime,
  listRegisteredGameModes,
};
