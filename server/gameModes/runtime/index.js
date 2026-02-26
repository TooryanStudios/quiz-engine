'use strict';

const { createPuzzleRelayRuntime } = require('./puzzleRelay.runtime');
const { createRuntimeExampleRuntime } = require('./runtimeExample.runtime');

const EMPTY_RUNTIME = Object.freeze({});

function normalizeModeId(modeId) {
  if (!modeId || typeof modeId !== 'string') return '';
  return modeId.trim().toLowerCase();
}

function createGameModeRuntime(modeId) {
  const normalizedModeId = normalizeModeId(modeId);
  if (!normalizedModeId) return EMPTY_RUNTIME;

  if (normalizedModeId === 'puzzle-relay') return createPuzzleRelayRuntime();
  if (normalizedModeId === 'runtime-example') return createRuntimeExampleRuntime();

  return EMPTY_RUNTIME;
}

function listRegisteredGameModes() {
  return ['puzzle-relay', 'runtime-example'];
}

module.exports = {
  createGameModeRuntime,
  listRegisteredGameModes,
};
