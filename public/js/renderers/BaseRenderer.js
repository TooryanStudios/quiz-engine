/**
 * BaseRenderer.js
 * Base class for all question type renderers
 */

import { state } from '../state/GameState.js';
import { safeGet, safeSetDisplay, escapeHtml, OPTION_COLORS, OPTION_ICONS } from '../utils/dom.js';
import { Sounds } from '../utils/sounds.js';

export class BaseRenderer {
  constructor(questionData) {
    this.question = questionData;
    this.submitCallback = null;
  }
  
  /**
   * Render the question UI for player
   * Must be implemented by subclasses
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }
  
  /**
   * Render the question UI for host (non-interactive display)
   * Must be implemented by subclasses
   */
  renderHost() {
    throw new Error('renderHost() must be implemented by subclass');
  }
  
  /**
   * Clean up event listeners and state
   */
  cleanup() {
    // Override if needed
  }
  
  /**
   * Set the submit callback
   */
  onSubmit(callback) {
    this.submitCallback = callback;
  }
  
  /**
   * Trigger answer submission
   */
  submit(answerData) {
    if (this.submitCallback) {
      this.submitCallback(answerData);
    }
  }
  
  /**
   * Check if user can submit (not already answered, not frozen)
   */
  canSubmit() {
    return !state.hasAnswered && !state.isFrozen;
  }
  
  /**
   * Common utilities available to all renderers
   */
  get utils() {
    return {
      safeGet,
      safeSetDisplay,
      escapeHtml,
      OPTION_COLORS,
      OPTION_ICONS,
      Sounds,
    };
  }
  
  /**
   * Get submit button element
   */
  getSubmitButton() {
    return safeGet('btn-submit-answer');
  }
  
  /**
   * Show/hide submit button
   */
  setSubmitButtonVisible(visible, enabled = true) {
    const btn = this.getSubmitButton();
    if (btn) {
      btn.style.display = visible ? 'block' : 'none';
      btn.disabled = !enabled;
    }
  }
  
  /**
   * Update submit button text
   */
  setSubmitButtonText(text) {
    const btn = this.getSubmitButton();
    if (btn) {
      btn.textContent = text;
    }
  }
}
