import { OrderRenderer } from '../OrderRenderer.js?v=121';

export function createOrderRendererEntry() {
  return { type: 'order', RendererClass: OrderRenderer };
}
