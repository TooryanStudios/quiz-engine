import { MatchRenderer } from '../MatchRenderer.js?v=127';

export function createMatchRendererEntry() {
  return { type: 'match', RendererClass: MatchRenderer };
}
