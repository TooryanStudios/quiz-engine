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
  
  /**
   * Render player view (interactive)
   */
  render() {
    const container = safeGet('player-match-container');
    if (!container) return;
    
    // Initialize match state
    state.matchConnections = new Array(this.question.lefts.length).fill(-1);
    state.matchLefts = this.question.lefts;
    state.matchRights = this.question.rights;
    
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
    
    const { escapeHtml, OPTION_COLORS } = this.utils;
    const lefts = state.matchLefts;
    const rights = state.matchRights;
    const placed = new Set(state.matchConnections.filter(v => v !== -1));
    
    container.innerHTML = `
      <div class="match-dnd-layout">
        <div class="match-dnd-slots">
          ${lefts.map((l, i) => {
            const ri = state.matchConnections[i];
            const filled = ri !== -1;
            const col = OPTION_COLORS[i % OPTION_COLORS.length];
            
            return `<div class="match-dnd-row">
              <div class="match-dnd-label">${escapeHtml(l)}</div>
              <div class="match-dropzone ${filled ? 'match-dz-filled ' + col : 'match-dz-empty'}" 
                   data-dropzone="${i}">
                ${filled
                  ? `<span class="match-chip in-slot ${col}" 
                           data-chip-idx="${ri}" 
                           data-in-slot="${i}">${escapeHtml(rights[ri])}</span>`
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
                         data-in-slot="-1">${escapeHtml(r)}</span>`;
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
    const ghost = document.createElement('span');
    ghost.id = '__dgh';
    ghost.className = 'match-chip match-drag-ghost';
    ghost.textContent = chip.textContent;
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
    return { pairs: state.matchConnections };
  }
  
  /**
   * Render host view
   */
  renderHost() {
    const grid = safeGet('host-options-grid');
    if (!grid) return;
    
    const { escapeHtml } = this.utils;
    const lefts = this.question.lefts || [];
    
    grid.innerHTML = `
      <div class="host-pairs-preview">
        ${lefts.map((l, i) => `
          <div class="host-pair-row stagger-${Math.min(i + 1, 4)}">
            <span class="host-pair-side">${escapeHtml(l)}</span>
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
