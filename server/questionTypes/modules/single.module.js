'use strict';

const createSingleHandler = require('../single');

module.exports = {
  id: 'single',
  aliases: [],
  timerPolicy: {
    kind: 'fixed',
  },
  createHandlerFactory: createSingleHandler,
};
