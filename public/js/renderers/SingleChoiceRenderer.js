/**
 * SingleChoiceRenderer.js
 * Handles single-choice (pick one) questions
 */

import { BaseRenderer } from './BaseRenderer.js';
import { safeGet } from '../utils/dom.js';

export class SingleChoiceRenderer extends BaseRenderer {
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
    
    // Attach click handlers
    grid.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.canSubmit()) return;
        
        Sounds.click();
        const answerIndex = parseInt(btn.dataset.index, 10);
        this.submit({ answerIndex });
      });
    });
    
    // Show options grid
    grid.style.display = '';
    
    // Hide submit button (single choice submits immediately)
    this.setSubmitButtonVisible(false);
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
