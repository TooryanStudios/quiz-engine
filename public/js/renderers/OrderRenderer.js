/**
 * OrderRenderer.js
 * Handles drag-to-reorder questions
 */

import { BaseRenderer } from './BaseRenderer.js';
import { state } from '../state/GameState.js';
import { safeGet, safeSetDisplay } from '../utils/dom.js';

export class OrderRenderer extends BaseRenderer {
  constructor(questionData) {
    super(questionData);
    this.drag = null;
  }
  
  /**
   * Render player view (interactive)
   */
  render() {
    const container = safeGet('player-order-container');
    if (!container) return;
    
    // Initialize order state
    state.orderItemOrder = this.question.items.map((_, i) => i);
    state.orderItems = this.question.items;
    
    // Show order container
    safeSetDisplay('player-order-container', 'block');
    safeSetDisplay('player-options-grid', 'none');
    
    // Build UI
    this.buildOrderUI();
    
    // Show submit button
    this.setSubmitButtonVisible(true, true);
    this.setSubmitButtonText('✔ تأكيد الإجابة');
  }
  
  /**
   * Build the order UI
   */
  buildOrderUI() {
    if (state.hasAnswered) return;
    
    const list = safeGet('order-list');
    if (!list) return;
    
    const { escapeHtml } = this.utils;
    const items = state.orderItems;
    
    list.innerHTML = state.orderItemOrder.map((itemIdx, pos) =>
      `<li class="order-item stagger-${Math.min(pos + 1, 4)}" data-pos="${pos}">
        <span class="order-drag-handle" aria-hidden="true">⠿</span>
        <span class="order-label" dir="auto">${escapeHtml(items[itemIdx])}</span>
      </li>`
    ).join('');
    
    // Attach drag handlers
    list.querySelectorAll('.order-item').forEach(item => {
      item.addEventListener('pointerdown', this.onItemPointerDown.bind(this));
    });
  }
  
  /**
   * Handle item drag start
   */
  onItemPointerDown(e) {
    if (!this.canSubmit()) return;
    e.preventDefault();
    
    const item = e.currentTarget;
    const fromPos = parseInt(item.dataset.pos);
    const rect = item.getBoundingClientRect();
    
    // Create ghost element
    const ghost = document.createElement('li');
    ghost.id = '__dgh';
    ghost.className = 'order-item order-drag-ghost';
    ghost.innerHTML = item.innerHTML;
    ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;
      width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;
      opacity:0.9;transform:rotate(-1.5deg) scale(1.03);`;
    document.body.appendChild(ghost);
    
    item.classList.add('order-dragging-source');
    
    // Insert position indicator
    const ind = document.createElement('li');
    ind.id = '__ord_ind';
    ind.className = 'order-insert-indicator';
    safeGet('order-list')?.appendChild(ind);
    
    this.drag = {
      fromPos,
      sourceEl: item,
      ghost,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      insertAt: fromPos
    };
    
    document.addEventListener('pointermove', this.onDragMove.bind(this));
    document.addEventListener('pointerup', this.onDragEnd.bind(this), { once: true });
  }
  
  /**
   * Handle drag move
   */
  onDragMove(e) {
    if (!this.drag) return;
    
    this.drag.ghost.style.left = (e.clientX - this.drag.offsetX) + 'px';
    this.drag.ghost.style.top = (e.clientY - this.drag.offsetY) + 'px';
    
    // Find insert position
    const list = safeGet('order-list');
    const items = list?.querySelectorAll('.order-item:not(.order-dragging-source)');
    
    if (!items) return;
    
    let insertAt = state.orderItemOrder.length;
    
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      if (e.clientY < midY) {
        insertAt = parseInt(items[i].dataset.pos);
        break;
      }
    }
    
    this.drag.insertAt = insertAt;
    
    // Update indicator position
    const indicator = document.getElementById('__ord_ind');
    if (indicator && items[insertAt]) {
      const targetRect = items[insertAt].getBoundingClientRect();
      indicator.style.top = `${targetRect.top}px`;
    }
  }
  
  /**
   * Handle drag end
   */
  onDragEnd() {
    document.removeEventListener('pointermove', this.onDragMove.bind(this));
    if (!this.drag) return;
    
    // Remove visual elements
    document.getElementById('__dgh')?.remove();
    document.getElementById('__ord_ind')?.remove();
    this.drag.sourceEl.classList.remove('order-dragging-source');
    
    // Update order
    const { fromPos, insertAt } = this.drag;
    
    if (fromPos !== insertAt) {
      const newOrder = [...state.orderItemOrder];
      const [item] = newOrder.splice(fromPos, 1);
      const targetIdx = insertAt > fromPos ? insertAt - 1 : insertAt;
      newOrder.splice(targetIdx, 0, item);
      state.orderItemOrder = newOrder;
      
      this.utils.Sounds.click();
    }
    
    this.drag = null;
    this.buildOrderUI();
  }
  
  /**
   * Get answer
   */
  getAnswer() {
    return { order: state.orderItemOrder };
  }
  
  /**
   * Render host view
   */
  renderHost() {
    const grid = safeGet('host-options-grid');
    if (!grid) return;
    
    const { escapeHtml } = this.utils;
    const items = this.question.items || [];
    
    grid.innerHTML = `
      <div class="host-order-preview">
        ${items.map((item, i) => `
          <div class="host-order-item stagger-${Math.min(i + 1, 4)}">
            ${i + 1}. ${escapeHtml(item)}
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    document.getElementById('__dgh')?.remove();
    document.getElementById('__ord_ind')?.remove();
    document.removeEventListener('pointermove', this.onDragMove.bind(this));
    document.removeEventListener('pointerup', this.onDragEnd.bind(this));
  }
}
