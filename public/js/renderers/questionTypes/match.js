import { MatchRenderer } from '../MatchRenderer.js?v=125';

export function createMatchRendererEntry() {
  return { type: 'match', RendererClass: MatchRenderer };
}
