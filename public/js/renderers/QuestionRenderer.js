/**
 * QuestionRenderer.js
 * Factory that creates and manages question type renderers
 */

import { SingleChoiceRenderer } from './SingleChoiceRenderer.js?v=121';
import { MultiChoiceRenderer } from './MultiChoiceRenderer.js?v=121';
import { TypeSprintRenderer } from './TypeSprintRenderer.js?v=121';
import { MatchRenderer } from './MatchRenderer.js?v=121';
import { OrderRenderer } from './OrderRenderer.js?v=121';
import { BossRenderer } from './BossRenderer.js?v=121';

/**
 * Question Renderer Factory
 */
export class QuestionRendererFactory {
  static currentRenderer = null;
  static registry = new Map();

  static register(type, RendererClass) {
    if (!type || typeof type !== 'string' || typeof RendererClass !== 'function') return;
    this.registry.set(type, RendererClass);
  }

  static unregister(type) {
    if (!type || typeof type !== 'string') return;
    this.registry.delete(type);
  }
  
  /**
   * Create a renderer for the given question type
   */
  static create(questionData) {
    const type = questionData.type;
    const RendererClass = this.registry.get(type) || this.registry.get('single') || SingleChoiceRenderer;
    if (!this.registry.has(type)) {
      console.warn(`Unknown question type: ${type}`);
    }
    return new RendererClass(questionData);
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

QuestionRendererFactory.register('single', SingleChoiceRenderer);
QuestionRendererFactory.register('multi', MultiChoiceRenderer);
QuestionRendererFactory.register('type', TypeSprintRenderer);
QuestionRendererFactory.register('match', MatchRenderer);
QuestionRendererFactory.register('order', OrderRenderer);
QuestionRendererFactory.register('boss', BossRenderer);
