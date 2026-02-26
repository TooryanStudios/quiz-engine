'use strict';

function createRuntimeExampleRuntime() {
  return {
    id: 'runtime-example',

    onQuestionDispatch({ room }) {
      if (!room) return false;
      room.lastRuntimeExampleAt = Date.now();
      return false;
    },
  };
}

module.exports = { createRuntimeExampleRuntime };
