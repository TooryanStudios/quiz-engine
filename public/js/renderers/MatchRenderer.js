/**
 * MatchRenderer.js
 * Handles drag-and-drop matching questions
 */

import { BaseRenderer } from './BaseRenderer.js';
import { state } from '../state/GameState.js';
import { safeGet, safeSetDisplay } from '../utils/dom.js';

export class MatchRenderer extends BaseRenderer {
  constructor(questionData) {
    super(questionData);
    this.drag = null;
  }

  isLikelyImageSource(value) {
    if (typeof value !== 'string') return false;
    const v = value.trim().toLowerCase();
    if (!v) return false;
    if (v.startsWith('data:image/')) return true;
    if (v.startsWith('blob:')) return true;
    if (v.startsWith('/')) return true;
    if (v.startsWith('http://') || v.startsWith('https://')) {
      return /(\.png|\.jpe?g|\.gif|\.webp|\.bmp|\.svg)(\?.*)?$/.test(v);
    }
    return false;
  }

  isImageMatchMode() {
    return this.question?.type === 'match_plus';
  }

  escapeAttr(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  renderMatchContent(value, className = 'match-chip-media', forceImage = false) {
    const { escapeHtml } = this.utils;
    const text = String(value ?? '');
    const shouldRenderImage = forceImage || this.isLikelyImageSource(text);
    if (shouldRenderImage && text) {
      return `<img class="${className}" src="${this.escapeAttr(text)}" alt="match item" loading="lazy" />`;
    }
    if (forceImage) {
      return `<span class="match-empty-tile" dir="auto">🖼️ <small>أضف صورة</small></span>`;
    }
    return `<span class="match-chip-text" dir="auto">${escapeHtml(text)}</span>`;
  }
  
  /**
   * Render player view (interactive)
   */
  render() {
    const container = safeGet('player-match-container');
    if (!container) return;
    
    // Initialize match state
    const lefts = Array.isArray(this.question.lefts) ? this.question.lefts : [];
    const rights = Array.isArray(this.question.rights) ? this.question.rights : [];
    state.matchConnections = new Array(lefts.length).fill(-1);
    state.matchLefts = lefts;
    state.matchRights = rights;
    
    // Show match container
    safeSetDisplay('player-match-container', 'block');
    safeSetDisplay('player-options-grid', 'none');
    
    // Build UI
    this.buildMatchUI();
    
    // Show submit button (initially disabled)
    this.setSubmitButtonVisible(true, false);
    this.setSubmitButtonText('✔ تأكيد الإجابة');
  }
  
  /**
   * Build the match UI
   */
  buildMatchUI() {
    if (state.hasAnswered) return;
    
    const container = safeGet('player-match-container');
    if (!container) return;
    
    const { OPTION_COLORS } = this.utils;
    const lefts = state.matchLefts;
    const rights = state.matchRights;
    const imageMode = this.isImageMatchMode();
    const placed = new Set(state.matchConnections.filter(v => v !== -1));
    
    container.innerHTML = `
      <div class="match-dnd-layout">
        <div class="match-dnd-slots">
          ${lefts.map((l, i) => {
            const ri = state.matchConnections[i];
            const filled = ri !== -1;
            const col = OPTION_COLORS[i % OPTION_COLORS.length];
            
            return `<div class="match-dnd-row">
              <div class="match-dnd-label">${this.renderMatchContent(l, 'match-left-media', imageMode)}</div>
              <div class="match-dropzone ${filled ? 'match-dz-filled ' + col : 'match-dz-empty'}" 
                   data-dropzone="${i}">
                ${filled
                  ? `<span class="match-chip in-slot ${col}" 
                           data-chip-idx="${ri}" 
                           data-in-slot="${i}">${this.renderMatchContent(rights[ri], 'match-chip-media', imageMode)}</span>`
                  : `<span class="match-drop-hint">drop here</span>`
                }
              </div>
            </div>`;
          }).join('')}
        </div>
        <div class="match-dnd-pool">
          <span class="match-pool-label">Drag to match</span>
          ${rights.map((r, i) => {
            if (placed.has(i)) return '';
            return `<span class="match-chip in-pool opt-violet" 
                         data-chip-idx="${i}" 
                         data-in-slot="-1">${this.renderMatchContent(r, 'match-chip-media', imageMode)}</span>`;
          }).join('')}
        </div>
      </div>
    `;
    
    // Attach drag handlers
    container.querySelectorAll('.match-chip').forEach(chip => {
      chip.addEventListener('pointerdown', this.onChipPointerDown.bind(this));
    });
    
    this.checkMatchComplete();
  }
  
  /**
   * Handle chip drag start
   */
  onChipPointerDown(e) {
    if (!this.canSubmit()) return;
    e.preventDefault();
    
    const chip = e.currentTarget;
    const chipIdx = parseInt(chip.dataset.chipIdx);
    const fromSlot = parseInt(chip.dataset.inSlot);
    const rect = chip.getBoundingClientRect();
    
    // Create ghost element
    const ghost = document.createElement('div');
    ghost.id = '__dgh';
    ghost.className = 'match-chip match-drag-ghost';
    ghost.innerHTML = chip.innerHTML;
    ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;
      width:${rect.width}px;left:${rect.left}px;top:${rect.top}px;
      opacity:0.9;transform:scale(1.1) rotate(-2deg);`;
    document.body.appendChild(ghost);
    
    chip.style.opacity = '0.2';
    
    this.drag = {
      chipIdx,
      fromSlot,
      sourceEl: chip,
      ghost,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
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
    
    document.querySelectorAll('.match-dropzone').forEach(dz => 
      dz.classList.remove('match-dz-hover')
    );
    
    const dz = this.getDropzoneAt(e.clientX, e.clientY);
    if (dz) dz.classList.add('match-dz-hover');
  }
  
  /**
   * Handle drag end
   */
  onDragEnd(e) {
    document.removeEventListener('pointermove', this.onDragMove.bind(this));
    if (!this.drag) return;
    
    this.removeDragGhost();
    document.querySelectorAll('.match-dropzone').forEach(dz => 
      dz.classList.remove('match-dz-hover')
    );
    
    const dz = this.getDropzoneAt(e.clientX, e.clientY);
    
    if (dz) {
      const toSlot = parseInt(dz.dataset.dropzone);
      const existed = state.matchConnections[toSlot];
      
      state.matchConnections[toSlot] = this.drag.chipIdx;
      
      if (this.drag.fromSlot !== -1) {
        state.matchConnections[this.drag.fromSlot] = existed !== -1 ? existed : -1;
      }
      
      this.utils.Sounds.click();
    } else {
      if (this.drag.fromSlot !== -1) {
        state.matchConnections[this.drag.fromSlot] = -1;
      }
    }
    
    this.drag = null;
    this.buildMatchUI();
  }
  
  /**
   * Get dropzone element at coordinates
   */
  getDropzoneAt(x, y) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.dataset && el.dataset.dropzone !== undefined) {
        return el;
      }
    }
    return null;
  }
  
  /**
   * Remove drag ghost element
   */
  removeDragGhost() {
    document.getElementById('__dgh')?.remove();
  }
  
  /**
   * Check if all matches are complete
   */
  checkMatchComplete() {
    const allFilled = state.matchConnections.every(v => v !== -1);
    this.setSubmitButtonVisible(true, allFilled);
  }
  
  /**
   * Get answer
   */
  getAnswer() {
    return { matches: state.matchConnections, pairs: state.matchConnections };
  }
  
  /**
   * Render host view
   */
  renderHost() {
    const grid = safeGet('host-options-grid');
    if (!grid) return;

    const lefts = this.question.lefts || [];
    const imageMode = this.isImageMatchMode();
    
    grid.innerHTML = `
      <div class="host-pairs-preview">
        ${lefts.map((l, i) => `
          <div class="host-pair-row stagger-${Math.min(i + 1, 4)}">
            <span class="host-pair-side">${this.renderMatchContent(l, 'host-pair-media', imageMode)}</span>
            <span class="host-pair-arrow">⟷</span>
            <span class="host-pair-side host-pair-right">?</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    this.removeDragGhost();
    document.removeEventListener('pointermove', this.onDragMove.bind(this));
    document.removeEventListener('pointerup', this.onDragEnd.bind(this));
  }
}
