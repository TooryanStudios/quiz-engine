import { InteractionSystem } from '../../systems/InteractionSystem.js';

export default {
  id: 'clickReveal',
  init(context, config) {
    const { target, message, eventBus } = context;
    if (!target) return;

    InteractionSystem.makeInteractive(target);
    
    this.actionHandler = () => {
      InteractionSystem.applyClickFeedback(target);
      if (message) {
        eventBus.emit('show-message', message);
      }
      if (config && config.revealTarget) {
        config.revealTarget.style.display = 'block';
      }
    };

    target.addEventListener('pointerdown', this.actionHandler);
    this.target = target;
  },
  destroy() {
    if (this.target && this.actionHandler) {
      this.target.removeEventListener('pointerdown', this.actionHandler);
    }
  }
};
