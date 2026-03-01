import { MatchRenderer } from '../MatchRenderer.js?v=128';

export function createMatchRendererEntry() {
  return { type: 'match', RendererClass: MatchRenderer };
}
