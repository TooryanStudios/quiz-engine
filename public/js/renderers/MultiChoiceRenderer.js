/**
 * MultiChoiceRenderer.js
 * Handles multi-select (choose all that apply) questions
 */

import { BaseRenderer } from './BaseRenderer.js';
import { safeGet } from '../utils/dom.js';

export class MultiChoiceRenderer extends BaseRenderer {
  /**
   * Render player view (interactive)
   */
  render() {
    const grid = safeGet('player-options-grid');
    if (!grid) return;
    
    const { escapeHtml, OPTION_COLORS, OPTION_ICONS, Sounds } = this.utils;
    const options = this.question.options || [];
    
    // Build option buttons
    grid.innerHTML = options.map((opt, i) =>
      `<button
        class="option-btn ${OPTION_COLORS[i]} stagger-${i + 1}"
        data-index="${i}"
        aria-label="Option ${i + 1}: ${escapeHtml(opt)}"
      >
        <span class="opt-icon">${OPTION_ICONS[i]}</span>
        <span class="opt-text">${escapeHtml(opt)}</span>
      </button>`
    ).join('');
    
    // Attach toggle handlers
    grid.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.canSubmit()) return;
        
        Sounds.click();
        btn.classList.toggle('multi-selected');
        
        // Enable submit button if at least one option selected
        const anySelected = grid.querySelectorAll('.multi-selected').length > 0;
        this.setSubmitButtonVisible(true, anySelected);
      });
    });
    
    // Show options grid
    grid.style.display = '';
    
    // Show submit button (initially disabled)
    this.setSubmitButtonVisible(true, false);
    this.setSubmitButtonText('✔ تأكيد الإجابة');
  }
  
  /**
   * Get selected answer indices
   */
  getAnswer() {
    const grid = safeGet('player-options-grid');
    if (!grid) return { answerIndices: [] };
    
    const selected = Array.from(
      grid.querySelectorAll('.multi-selected')
    ).map(el => parseInt(el.dataset.index, 10));
    
    return { answerIndices: selected };
  }
  
  /**
   * Render host view (non-interactive display)
   */
  renderHost() {
    const grid = safeGet('host-options-grid');
    if (!grid) return;
    
    const { escapeHtml, OPTION_COLORS, OPTION_ICONS } = this.utils;
    const options = this.question.options || [];
    
    grid.innerHTML = options.map((opt, i) =>
      `<div class="option-card ${OPTION_COLORS[i]} stagger-${i + 1}">
        <span class="opt-icon">${OPTION_ICONS[i]}</span>
        <span class="opt-text">${escapeHtml(opt)}</span>
      </div>`
    ).join('');
  }
}
