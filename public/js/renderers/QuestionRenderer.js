/**
 * QuestionRenderer.js
 * Factory that creates and manages question type renderers
 */

import { SingleChoiceRenderer } from './SingleChoiceRenderer.js?v=116';
import { MultiChoiceRenderer } from './MultiChoiceRenderer.js?v=116';
import { TypeSprintRenderer } from './TypeSprintRenderer.js?v=116';
import { MatchRenderer } from './MatchRenderer.js?v=116';
import { OrderRenderer } from './OrderRenderer.js?v=116';
import { BossRenderer } from './BossRenderer.js?v=116';

/**
 * Question Renderer Factory
 */
export class QuestionRendererFactory {
  static currentRenderer = null;
  
  /**
   * Create a renderer for the given question type
   */
  static create(questionData) {
    const type = questionData.type;
    
    switch (type) {
      case 'single':
        return new SingleChoiceRenderer(questionData);
      
      case 'multi':
        return new MultiChoiceRenderer(questionData);
      
      case 'type':
        return new TypeSprintRenderer(questionData);
      
      case 'match':
        return new MatchRenderer(questionData);
      
      case 'order':
        return new OrderRenderer(questionData);
      
      case 'boss':
        return new BossRenderer(questionData);
      
      default:
        console.warn(`Unknown question type: ${type}`);
        return new SingleChoiceRenderer(questionData);
    }
  }
  
  /**
   * Render a question (player or host)
   */
  static render(questionData, isHost, onSubmit) {
    // Cleanup previous renderer
    if (this.currentRenderer) {
      this.currentRenderer.cleanup();
    }
    
    // Create new renderer
    this.currentRenderer = this.create(questionData);
    
    // Set submit callback
    if (onSubmit) {
      this.currentRenderer.onSubmit(onSubmit);
    }
    
    // Render
    if (isHost) {
      this.currentRenderer.renderHost();
    } else {
      this.currentRenderer.render();
    }
    
    return this.currentRenderer;
  }
  
  /**
   * Get answer from current renderer
   */
  static getAnswer() {
    if (!this.currentRenderer) return null;
    
    if (typeof this.currentRenderer.getAnswer === 'function') {
      return this.currentRenderer.getAnswer();
    }
    
    return null;
  }
  
  /**
   * Cleanup current renderer
   */
  static cleanup() {
    if (this.currentRenderer) {
      this.currentRenderer.cleanup();
      this.currentRenderer = null;
    }
  }
}
