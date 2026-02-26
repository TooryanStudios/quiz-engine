import { singleQuestionTypeModule } from './modules/single.module.js?v=121';
import { createMultiRendererEntry } from './multi.js?v=121';
import { createTypeRendererEntry } from './type.js?v=121';
import { createMatchRendererEntry } from './match.js?v=121';
import { createOrderRendererEntry } from './order.js?v=121';
import { createBossRendererEntry } from './boss.js?v=121';

function createLegacyModule(id, createRendererEntry, options) {
  return {
    id,
    aliases: options?.aliases || [],
    timerPolicy: options?.timerPolicy || { kind: 'fixed' },
    createRendererEntry,
  };
}

export function createRendererRegistry() {
  const registry = new Map();
  const modules = [
    singleQuestionTypeModule,
    createLegacyModule('multi', createMultiRendererEntry),
    createLegacyModule('type', createTypeRendererEntry),
    createLegacyModule('match', createMatchRendererEntry, { aliases: ['match_plus'] }),
    createLegacyModule('order', createOrderRendererEntry, { aliases: ['order_plus'] }),
    createLegacyModule('boss', createBossRendererEntry),
  ];

  for (const moduleDef of modules) {
    if (!moduleDef || typeof moduleDef.id !== 'string' || typeof moduleDef.createRendererEntry !== 'function') continue;
    const entry = moduleDef.createRendererEntry();
    if (!entry || typeof entry.type !== 'string' || typeof entry.RendererClass !== 'function') continue;
    registry.set(entry.type, entry.RendererClass);
    for (const alias of moduleDef.aliases || []) {
      registry.set(alias, entry.RendererClass);
    }
  }

  return registry;
}
