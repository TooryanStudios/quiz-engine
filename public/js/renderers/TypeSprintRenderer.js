/**
 * TypeSprintRenderer.js
 * Handles text input (type) questions
 */

import { BaseRenderer } from './BaseRenderer.js';
import { safeGet, safeSetDisplay } from '../utils/dom.js';

export class TypeSprintRenderer extends BaseRenderer {
  /**
   * Render player view (interactive)
   */
  render() {
    const container = safeGet('player-type-container');
    const input = safeGet('player-type-input');
    
    if (!container || !input) return;
    
    // Show type container
    safeSetDisplay('player-type-container', 'block');
    safeSetDisplay('player-options-grid', 'none');
    
    // Reset input
    input.value = '';
    input.placeholder = this.question.inputPlaceholder || 'Type your answer';
    input.disabled = false;
    input.focus();
    
    // Show submit button (initially disabled)
    this.setSubmitButtonVisible(true, false);
    this.setSubmitButtonText('✔ تأكيد الإجابة');
    
    // Enable submit when text is entered
    input.oninput = () => {
      const hasText = input.value.trim().length > 0;
      this.setSubmitButtonVisible(true, hasText && this.canSubmit());
    };
  }
  
  /**
   * Get typed answer
   */
  getAnswer() {
    const input = safeGet('player-type-input');
    const value = input ? input.value.trim() : '';
    return { textAnswer: value };
  }
  
  /**
   * Render host view (non-interactive display)
   */
  renderHost() {
    const grid = safeGet('host-options-grid');
    if (!grid) return;
    
    grid.innerHTML = `
      <div class="host-type-preview">
        <span class="host-type-label">Type Sprint</span>
        <span class="host-type-hint">Players submit a typed answer</span>
      </div>
    `;
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    const input = safeGet('player-type-input');
    if (input) {
      input.oninput = null;
    }
  }

  onAnswerSubmitted() {
    const input = safeGet('player-type-input');
    if (input) {
      input.disabled = true;
    }
    super.onAnswerSubmitted();
  }
}
