'use strict';

const createSingleHandler = require('./single');
const createMultiHandler = require('./multi');
const createTypeHandler = require('./type');
const createMatchHandler = require('./match');
const createOrderHandler = require('./order');
const createBossHandler = require('./boss');

function createQuestionTypeHandlers(deps) {
  return {
    single: createSingleHandler(deps),
    multi: createMultiHandler(deps),
    type: createTypeHandler(deps),
    match: createMatchHandler(deps),
    order: createOrderHandler(deps),
    boss: createBossHandler(deps),
  };
}

module.exports = { createQuestionTypeHandlers };
