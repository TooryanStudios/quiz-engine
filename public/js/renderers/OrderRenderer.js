/**
 * OrderRenderer.js
 * Handles drag-to-reorder questions with smooth animated swaps.
 *
 * Instead of rebuilding the whole list on every move, items are
 * repositioned in the DOM and animated with CSS transitions so the
 * user never loses context.
 */

import { BaseRenderer } from './BaseRenderer.js';
import { state } from '../state/GameState.js';
import { safeGet, safeSetDisplay } from '../utils/dom.js';

export class OrderRenderer extends BaseRenderer {
  constructor(questionData) {
    super(questionData);
    this.drag = null;
    this._onMove = this._onDragMove.bind(this);
    this._onEnd  = this._onDragEnd.bind(this);
  }

  // -- Public API --

  render() {
    const container = safeGet('player-order-container');
    if (!container) return;

    state.orderItemOrder = this.question.items.map((_, i) => i);
    state.orderItems     = this.question.items;

    safeSetDisplay('player-order-container', 'block');
    safeSetDisplay('player-options-grid', 'none');

    this._buildList();

    this.setSubmitButtonVisible(true, true);
    this.setSubmitButtonText('\u2714 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0625\u062c\u0627\u0628\u0629');
  }

  getAnswer() {
    return { order: state.orderItemOrder };
  }

  renderHost() {
    const grid = safeGet('host-options-grid');
    if (!grid) return;
    const { escapeHtml } = this.utils;
    const items = this.question.items || [];
    grid.innerHTML = '<div class="host-order-preview">' +
      items.map((item, i) =>
        '<div class="host-order-item stagger-' + Math.min(i + 1, 4) + '">' +
          (i + 1) + '. ' + escapeHtml(item) +
        '</div>'
      ).join('') +
    '</div>';
  }

  cleanup() {
    this._removeGhost();
    document.removeEventListener('pointermove', this._onMove);
    document.removeEventListener('pointerup',   this._onEnd);
  }

  // -- Build initial list (one-time) --

  _buildList() {
    const list = safeGet('order-list');
    if (!list) return;

    const { escapeHtml } = this.utils;
    const items = state.orderItems;

    list.innerHTML = state.orderItemOrder.map((itemIdx, pos) =>
      '<li class="order-item" data-idx="' + itemIdx + '" data-pos="' + pos + '">' +
        '<span class="order-num">' + (pos + 1) + '</span>' +
        '<span class="order-label" dir="auto">' + escapeHtml(items[itemIdx]) + '</span>' +
        '<span class="order-drag-handle" aria-hidden="true">\u2800\u283F</span>' +
      '</li>'
    ).join('');

    list.querySelectorAll('.order-item').forEach(el => {
      el.addEventListener('pointerdown', this._onPointerDown.bind(this));
    });
  }

  // -- Refresh number badges only (no DOM rebuild) --

  _refreshNumbers() {
    const list = safeGet('order-list');
    if (!list) return;
    list.querySelectorAll('.order-item').forEach((el, i) => {
      el.dataset.pos = i;
      const num = el.querySelector('.order-num');
      if (num) num.textContent = i + 1;
    });
  }

  // -- Drag lifecycle --

  _onPointerDown(e) {
    if (!this.canSubmit()) return;
    e.preventDefault();

    const item = e.currentTarget;
    const rect = item.getBoundingClientRect();
    const list = safeGet('order-list');

    const ghost = document.createElement('li');
    ghost.id = '__dgh';
    ghost.className = 'order-item order-drag-ghost';
    ghost.innerHTML = item.innerHTML;
    ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;' +
      'width:' + rect.width + 'px;left:' + rect.left + 'px;top:' + rect.top + 'px;' +
      'opacity:0.92;transform:scale(1.04);';
    document.body.appendChild(ghost);

    item.classList.add('order-dragging-source');

    this.drag = {
      el: item,
      ghost: ghost,
      list: list,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      lastSwap: 0
    };

    document.addEventListener('pointermove', this._onMove);
    document.addEventListener('pointerup',   this._onEnd, { once: true });
  }

  _onDragMove(e) {
    const d = this.drag;
    if (!d) return;

    d.ghost.style.left = (e.clientX - d.offsetX) + 'px';
    d.ghost.style.top  = (e.clientY - d.offsetY) + 'px';

    const now = Date.now();
    if (now - d.lastSwap < 80) return;

    const siblings = Array.from(
      d.list.querySelectorAll('.order-item:not(.order-dragging-source)')
    );

    for (const sib of siblings) {
      const rect = sib.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      const draggedPos = parseInt(d.el.dataset.pos);
      const sibPos     = parseInt(sib.dataset.pos);

      if (draggedPos < sibPos && e.clientY > midY) {
        this._animatedSwap(d.el, sib, 'after');
        d.lastSwap = now;
        break;
      }
      if (draggedPos > sibPos && e.clientY < midY) {
        this._animatedSwap(d.el, sib, 'before');
        d.lastSwap = now;
        break;
      }
    }
  }

  _onDragEnd() {
    document.removeEventListener('pointermove', this._onMove);
    const d = this.drag;
    if (!d) return;

    this._removeGhost();
    d.el.classList.remove('order-dragging-source');

    const list = safeGet('order-list');
    const newOrder = [];
    list.querySelectorAll('.order-item').forEach(el => {
      newOrder.push(parseInt(el.dataset.idx));
    });
    state.orderItemOrder = newOrder;

    this._refreshNumbers();
    this.drag = null;
  }

  // -- Animated swap (FLIP technique) --

  _animatedSwap(draggedEl, targetEl, position) {
    const targetRect = targetEl.getBoundingClientRect();

    if (position === 'after') {
      targetEl.parentNode.insertBefore(draggedEl, targetEl.nextSibling);
    } else {
      targetEl.parentNode.insertBefore(draggedEl, targetEl);
    }

    const targetRectAfter = targetEl.getBoundingClientRect();
    const dx = targetRect.left - targetRectAfter.left;
    const dy = targetRect.top  - targetRectAfter.top;

    if (dx !== 0 || dy !== 0) {
      targetEl.style.transition = 'none';
      targetEl.style.transform  = 'translate(' + dx + 'px, ' + dy + 'px)';
      targetEl.offsetHeight; // force reflow
      targetEl.style.transition = 'transform 0.18s ease';
      targetEl.style.transform  = '';
    }

    this._refreshNumbers();
    this.utils.Sounds.click();
  }

  // -- Helpers --

  _removeGhost() {
    const g = document.getElementById('__dgh');
    if (g) g.remove();
  }
}
