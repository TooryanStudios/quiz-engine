import { AudioSystem } from './AudioSystem.js';

export const InteractionSystem = {
  makeInteractive(element) {
    element.style.cursor = 'pointer';
    
    element.addEventListener('pointerover', () => {
      element.style.opacity = '0.7';
    });

    element.addEventListener('pointerout', () => {
      element.style.opacity = '1';
    });

    return element;
  },

  applyClickFeedback(element) {
    AudioSystem.playClick();
    element.style.transform = 'scale(0.9)';
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 100);
  }
};
