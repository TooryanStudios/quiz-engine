/**
 * QuestionRenderer.js
 * Factory that creates and manages question type renderers
 */

import { createRendererRegistry } from './questionTypes/index.js?v=121';

/**
 * Question Renderer Factory
 */
export class QuestionRendererFactory {
  static currentRenderer = null;
  static registry = createRendererRegistry();

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
    const RendererClass = this.registry.get(type) || this.registry.get('single');
    if (!RendererClass) {
      throw new Error('No renderer registered for question type "single"');
    }
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
