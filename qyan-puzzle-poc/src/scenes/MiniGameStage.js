import { SceneFlowManager } from '../systems/SceneFlowManager.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import multipleChoicePlugin from '../plugins/quizzes/multipleChoice.plugin.js';
import { miniGamesData } from '../content/miniGamesData.js';
import { SaveState } from '../core/SaveState.js';
import gsap from 'gsap';

export default class MiniGameStage {
  constructor(stageId) {
    this.stageId = stageId;
  }

  create(container) {
    this.container = container;
    this.data = miniGamesData[this.stageId];
    
    if(!this.data) {
       this.container.style.backgroundColor = '#000';
       return;
    }

    this.container.style.background = `url("${this.data.bg}") center/cover no-repeat`;
    DialogueSystem.showCaption(this.container, this.data.text);

    if (this.data.puzzleType === 'click') {
      this.setupClickTarget();
    } else if (this.data.puzzleType === 'visual_order' || this.data.puzzleType === 'quiz') {
      this.setupQuiz();
    } else if (this.data.puzzleType === 'use_item') {
      this.setupDropTarget();
    }
  }

  setupClickTarget() {
    this.target = document.createElement('div');
    this.target.style.position = 'absolute';
    this.target.style.left = this.data.targetPosition.left;
    this.target.style.top = this.data.targetPosition.top;
    this.target.style.width = this.data.targetPosition.w;
    this.target.style.height = this.data.targetPosition.h;
    this.target.style.backgroundColor = this.data.color;
    this.target.style.transform = 'translate(-50%, -50%)';
    this.target.style.borderRadius = '8px';
    this.target.style.display = 'flex';
    this.target.style.alignItems = 'center';
    this.target.style.justifyContent = 'center';
    this.target.style.color = '#000';
    this.target.style.fontSize = '12px';
    this.target.style.fontWeight = 'bold';
    this.target.style.textAlign = 'center';
    this.target.innerText = this.data.targetText;

    InteractionSystem.makeInteractive(this.target);

    this.clickHandler = () => {
       InteractionSystem.applyClickFeedback(this.target);
       DialogueSystem.updateText("Solved!");

       if (this.data.collectItem) {
          SaveState.addInventoryItem(this.data.collectItem.id, this.data.collectItem.svg);
          DialogueSystem.updateText(`You found: ${this.data.collectItem.name || this.data.collectItem.id}!`);
       }
       
       gsap.to(this.target, {
         scale: 1.5,
         opacity: 0,
         duration: 0.5,
         onComplete: () => {
           SceneFlowManager.goTo(this.data.next);
         }
       });
    };

    this.target.addEventListener('click', this.clickHandler);
    this.container.appendChild(this.target);
    
    // Animate target in
    gsap.from(this.target, { y: -50, opacity: 0, duration: 1, ease: 'bounce.out' });
  }

  setupDropTarget() {
    this.target = document.createElement('div');
    this.target.style.position = 'absolute';
    this.target.style.left = this.data.targetPosition.left;
    this.target.style.top = this.data.targetPosition.top;
    this.target.style.width = this.data.targetPosition.w;
    this.target.style.height = this.data.targetPosition.h;
    this.target.style.backgroundColor = this.data.color || 'rgba(255, 255, 255, 0.2)';
    this.target.style.border = '2px dashed #00FA9A';
    this.target.style.transform = 'translate(-50%, -50%)';
    this.target.style.borderRadius = '8px';
    this.target.style.display = 'flex';
    this.target.style.alignItems = 'center';
    this.target.style.justifyContent = 'center';
    this.target.style.color = '#fff';
    this.target.style.fontSize = '12px';
    this.target.style.fontWeight = 'bold';
    this.target.style.textAlign = 'center';
    this.target.innerText = this.data.targetText;

    this.target.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.target.style.backgroundColor = 'rgba(0, 250, 154, 0.4)';
    });

    this.target.addEventListener('dragleave', () => {
      this.target.style.backgroundColor = this.data.color || 'rgba(255, 255, 255, 0.2)';
    });

    this.dropHandler = (e) => {
      e.preventDefault();
      const sourceIndex = e.dataTransfer.getData('sourceIndex');
      if (sourceIndex !== '') {
        const item = SaveState.inventory[parseInt(sourceIndex, 10)];
        if (item && item.id === this.data.requireItem) {
          SaveState.removeInventoryItem(this.data.requireItem);
          DialogueSystem.updateText("Item accepted!");
          
          this.target.style.backgroundColor = '#00FA9A';
          this.target.style.border = 'none';
          
          gsap.to(this.target, {
            scale: 2,
            opacity: 0,
            duration: 1,
            ease: 'power2.out',
            onComplete: () => {
              SceneFlowManager.goTo(this.data.next);
            }
          });
        } else {
           // Wrong Item
           gsap.fromTo(this.target, { x: -10 }, { x: 10, yoyo: true, repeat: 5, duration: 0.05, clearProps: 'all' });
           this.target.style.backgroundColor = this.data.color || 'rgba(255, 255, 255, 0.2)';
        }
      }
    };

    this.target.addEventListener('drop', this.dropHandler);
    this.container.appendChild(this.target);
    gsap.from(this.target, { y: 50, opacity: 0, duration: 1 });
  }

  setupQuiz() {
    // Dynamically import the visual layout plugin
    import('../plugins/quizzes/visualOrder.plugin.js').then(module => {
      this.quizInstance = Object.create(module.default);
      
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.top = '50%';
      wrapper.style.left = '50%';
      wrapper.style.transform = 'translate(-50%, -50%)';
      wrapper.style.width = '100%';
      wrapper.style.display = 'flex';
      wrapper.style.justifyContent = 'center';
      
      this.container.appendChild(wrapper);

      this.quizInstance.init({
        container: wrapper,
        data: {
           items: this.data.items,
           correctOrder: this.data.correctOrder
        },
        onComplete: () => {
          SceneFlowManager.goTo(this.data.next);
        }
      });
    });
  }

  destroy() {
    if (this.target && this.clickHandler) this.target.removeEventListener('click', this.clickHandler);
    if (this.target && this.dropHandler) this.target.removeEventListener('drop', this.dropHandler);
    if (this.quizInstance) this.quizInstance.destroy();
    this.container.innerHTML = '';
  }
}
