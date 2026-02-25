import { createSingleRendererEntry } from './single.js?v=121';
import { createMultiRendererEntry } from './multi.js?v=121';
import { createTypeRendererEntry } from './type.js?v=121';
import { createMatchRendererEntry } from './match.js?v=121';
import { createOrderRendererEntry } from './order.js?v=121';
import { createBossRendererEntry } from './boss.js?v=121';

export function createRendererRegistry() {
  const registry = new Map();
  const entries = [
    createSingleRendererEntry(),
    createMultiRendererEntry(),
    createTypeRendererEntry(),
    createMatchRendererEntry(),
    createOrderRendererEntry(),
    createBossRendererEntry(),
  ];

  for (const entry of entries) {
    if (!entry || typeof entry.type !== 'string' || typeof entry.RendererClass !== 'function') continue;
    registry.set(entry.type, entry.RendererClass);
  }

  return registry;
}
