'use strict';

const singleQuestionTypeModule = require('./modules/single.module');
const createMultiHandler = require('./multi');
const createTypeHandler = require('./type');
const createMatchHandler = require('./match');
const createOrderHandler = require('./order');
const createBossHandler = require('./boss');

function createLegacyModule(id, createHandlerFactory, options) {
  return {
    id,
    aliases: options?.aliases || [],
    timerPolicy: options?.timerPolicy || { kind: 'fixed' },
    createHandlerFactory,
  };
}

function createQuestionTypeHandlers(deps) {
  const modules = [
    singleQuestionTypeModule,
    createLegacyModule('multi', createMultiHandler),
    createLegacyModule('type', createTypeHandler),
    createLegacyModule('match', createMatchHandler, { aliases: ['match_plus'] }),
    createLegacyModule('order', createOrderHandler, { aliases: ['order_plus'] }),
    createLegacyModule('boss', createBossHandler),
  ];

  const handlers = {};
  for (const moduleDef of modules) {
    if (!moduleDef || typeof moduleDef.id !== 'string' || typeof moduleDef.createHandlerFactory !== 'function') {
      continue;
    }
    const handler = moduleDef.createHandlerFactory(deps);
    handlers[moduleDef.id] = handler;
    for (const alias of moduleDef.aliases || []) {
      handlers[alias] = handler;
    }
  }

  return handlers;
}

module.exports = { createQuestionTypeHandlers };
