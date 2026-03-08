import { SceneFlowManager } from '../systems/SceneFlowManager.js';
import { quizData } from '../content/quizData.js';
import visualOrderPlugin from '../plugins/quizzes/visualOrder.plugin.js';

export default class QuizScene01 {
  create(container) {
    this.container = container;
    
    // Abstract dark background for the quiz
    this.container.style.background = 'radial-gradient(circle at center, #1b2838 0%, #000000 100%)';
    this.container.style.display = 'flex';
    this.container.style.justifyContent = 'center';
    this.container.style.alignItems = 'center';

    this.quizInstance = Object.create(visualOrderPlugin);
    
    // Pass the plugin the required DOM node, data context, and the hook to proceed
    this.quizInstance.init({
      container: this.container,
      data: quizData.quiz01,
      onComplete: () => {
        SceneFlowManager.goTo('EndingScene');
      }
    });
  }

  destroy() {
    if (this.quizInstance) {
      this.quizInstance.destroy();
    }
  }
}
