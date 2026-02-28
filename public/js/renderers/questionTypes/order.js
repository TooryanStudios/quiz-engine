import { OrderRenderer } from '../OrderRenderer.js?v=122';

export function createOrderRendererEntry() {
  return { type: 'order', RendererClass: OrderRenderer };
}
