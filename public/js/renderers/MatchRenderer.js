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

  getMatchPlusMode() {
    if (!this.isImageMatchMode()) return 'classic';
    const mode = String(this.question?.matchPlusMode || 'image-puzzle').trim().toLowerCase();
    if (mode === 'emoji-emoji' || mode === 'emoji-text' || mode === 'image-text' || mode === 'image-image' || mode === 'image-puzzle') {
      return mode;
    }
    return 'image-puzzle';
  }

  getPuzzleGridSize() {
    const next = Number(this.question?.matchPlusGridSize);
    if (!Number.isInteger(next)) return 3;
    return Math.min(4, Math.max(2, next));
  }

  getPuzzleImageUrl() {
    const raw = this.question?.matchPlusImage;
    return typeof raw === 'string' ? raw.trim() : '';
  }

  getPieceIndex(value) {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isInteger(parsed) || parsed < 1) return null;
    return parsed - 1;
  }

  renderPuzzleTile(value, className = 'match-chip-media', forSlot = false) {
    const image = this.getPuzzleImageUrl();
    const grid = this.getPuzzleGridSize();
    const pieceIndex = this.getPieceIndex(value);

    if (!image || pieceIndex === null) {
      return `<span class="match-empty-tile" dir="auto">🧩 <small>قطعة</small></span>`;
    }

    const row = Math.floor(pieceIndex / grid);
    const col = pieceIndex % grid;
    const bgX = grid > 1 ? (col / (grid - 1)) * 100 : 0;
    const bgY = grid > 1 ? (row / (grid - 1)) * 100 : 0;

    return `<span class="${className} ${forSlot ? 'match-puzzle-slot-tile' : 'match-puzzle-chip-tile'}"
      style="background-image:url('${this.escapeAttr(image)}');background-size:${grid * 100}% ${grid * 100}%;background-position:${bgX}% ${bgY}%;"></span>`;
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
    const isMatchPlus = this.isImageMatchMode();
    const mode = this.getMatchPlusMode();
    const isPuzzleMode = mode === 'image-puzzle';

    if (isPuzzleMode) {
      this.buildSimplePuzzleUI(lefts, rights);
      return;
    }

    const forceLeftImage = isMatchPlus && (mode === 'image-text' || mode === 'image-image');
    const forceRightImage = isMatchPlus && mode === 'image-image';
    const placed = new Set(state.matchConnections.filter(v => v !== -1));
    
    container.innerHTML = `
      <div class="match-dnd-layout">
        <div class="match-dnd-slots">
          ${lefts.map((l, i) => {
            const ri = state.matchConnections[i];
            const filled = ri !== -1;
            const col = OPTION_COLORS[i % OPTION_COLORS.length];
            const leftContent = isPuzzleMode
              ? this.renderPuzzleTile(l, 'match-left-media', true)
              : this.renderMatchContent(l, 'match-left-media', forceLeftImage);
            const rightContent = isPuzzleMode
              ? this.renderPuzzleTile(rights[ri], 'match-chip-media', false)
              : this.renderMatchContent(rights[ri], 'match-chip-media', forceRightImage);
            
            return `<div class="match-dnd-row">
              <div class="match-dnd-label">${leftContent}</div>
              <div class="match-dropzone ${filled ? 'match-dz-filled ' + col : 'match-dz-empty'}" 
                   data-dropzone="${i}">
                ${filled
                  ? `<span class="match-chip in-slot ${col}" 
                           data-chip-idx="${ri}" 
                           data-in-slot="${i}">${rightContent}</span>`
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
            const poolContent = isPuzzleMode
              ? this.renderPuzzleTile(r, 'match-chip-media', false)
              : this.renderMatchContent(r, 'match-chip-media', forceRightImage);
            return `<span class="match-chip in-pool opt-violet" 
                         data-chip-idx="${i}" 
                         data-in-slot="-1">${poolContent}</span>`;
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

  buildSimplePuzzleUI(lefts, rights) {
    const container = safeGet('player-match-container');
    if (!container) return;

    const placed = new Set(state.matchConnections.filter(v => v !== -1));

    container.innerHTML = `
      <div class="simple-puzzle-wrap">
        <div class="simple-puzzle-board">
          ${lefts.map((leftValue, slotIndex) => {
            const pieceIndex = state.matchConnections[slotIndex];
            const filled = pieceIndex !== -1;
            const placedContent = filled
              ? this.renderPuzzleTile(rights[pieceIndex], 'simple-puzzle-piece-media', false)
              : '';
            const targetContent = this.renderPuzzleTile(leftValue, 'simple-puzzle-target-media', true);

            return `<div class="simple-puzzle-cell">
              <div class="match-dropzone simple-puzzle-dropzone ${filled ? 'match-dz-filled simple-puzzle-dropzone-filled' : 'match-dz-empty'}"
                   data-dropzone="${slotIndex}">
                <span class="simple-puzzle-target">${targetContent}</span>
                ${filled
                  ? `<span class="match-chip simple-puzzle-piece in-slot"
                           data-chip-idx="${pieceIndex}"
                           data-in-slot="${slotIndex}">${placedContent}</span>`
                  : ''
                }
              </div>
            </div>`;
          }).join('')}
        </div>

        <div class="simple-puzzle-pool">
          <span class="simple-puzzle-title">اسحب القطع إلى أماكنها الصحيحة</span>
          <div class="simple-puzzle-pool-grid">
            ${rights.map((value, pieceIndex) => {
              if (placed.has(pieceIndex)) return '';
              return `<span class="match-chip simple-puzzle-piece in-pool"
                           data-chip-idx="${pieceIndex}"
                           data-in-slot="-1">${this.renderPuzzleTile(value, 'simple-puzzle-piece-media', false)}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;

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
    const size = Math.round(Math.min(rect.width || 90, rect.height || 90));

    // Build ghost using the actual puzzle-tile background-image inline styles
    // so it shows the real piece image, not any background-color of the chip wrapper
    const tileSpan = chip.querySelector('[style*="background-image"]');
    const ghost = document.createElement('div');
    ghost.id = '__dgh';
    if (tileSpan) {
      ghost.style.backgroundImage    = tileSpan.style.backgroundImage;
      ghost.style.backgroundSize     = tileSpan.style.backgroundSize;
      ghost.style.backgroundPosition = tileSpan.style.backgroundPosition;
      ghost.style.backgroundRepeat   = 'no-repeat';
    } else {
      // fallback: clone contents (classic mode)
      ghost.innerHTML = chip.innerHTML;
    }
    ghost.style.position     = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex       = '9999';
    ghost.style.width        = size + 'px';
    ghost.style.height       = size + 'px';
    ghost.style.left         = rect.left + 'px';
    ghost.style.top          = rect.top  + 'px';
    ghost.style.opacity      = '0.92';
    ghost.style.transform    = 'scale(1.08)';
    ghost.style.borderRadius = '0';
    ghost.style.boxShadow    = '0 8px 32px rgba(0,0,0,0.55)';
    document.body.appendChild(ghost);
    
    // visibility:hidden keeps the chip's grid slot so the pool layout doesn't shift
    chip.style.visibility = 'hidden';
    
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
    const mode = this.getMatchPlusMode();
    const isPuzzleMode = mode === 'image-puzzle';
    const forceLeftImage = this.isImageMatchMode() && (mode === 'image-text' || mode === 'image-image');

    if (isPuzzleMode) {
      grid.innerHTML = `
        <div class="simple-puzzle-host-wrap">
          <div class="simple-puzzle-host-title">صورة مجزأة: رتّب القطع حسب مكانها</div>
          <div class="simple-puzzle-host-grid">
            ${lefts.map(l => `<span class="simple-puzzle-host-tile">${this.renderPuzzleTile(l, 'simple-puzzle-host-media', true)}</span>`).join('')}
          </div>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = `
      <div class="host-pairs-preview">
        ${lefts.map((l, i) => `
          <div class="host-pair-row stagger-${Math.min(i + 1, 4)}">
            <span class="host-pair-side">${isPuzzleMode ? this.renderPuzzleTile(l, 'host-pair-media', true) : this.renderMatchContent(l, 'host-pair-media', forceLeftImage)}</span>
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
