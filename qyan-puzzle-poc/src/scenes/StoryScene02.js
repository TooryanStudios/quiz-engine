import { SceneFlowManager } from '../systems/SceneFlowManager.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { SaveState } from '../core/SaveState.js';
import { storyCaptions } from '../content/storyData.js';
import shakeObjectPlugin from '../plugins/effects/shakeObject.plugin.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import gsap from 'gsap';

export default class StoryScene02 {
  create(container) {
    this.container = container;
    this.container.style.background = 'url("/assets/images/chamber-bg.svg") center/cover no-repeat';

    DialogueSystem.showCaption(this.container, storyCaptions.gateChamber);

    const clue = document.createElement('div');
    clue.innerText = "[Clue: Square -> Triangle -> Circle]";
    clue.style.position = 'absolute';
    clue.style.top = '100px';
    clue.style.width = '100%';
    clue.style.textAlign = 'center';
    clue.style.fontSize = '24px';
    clue.style.fontWeight = 'bold';
    clue.style.color = '#fff';
    clue.style.textShadow = '0px 2px 4px #000';
    this.container.appendChild(clue);

    const gate = document.createElement('div');
    gate.style.position = 'absolute';
    gate.style.left = '50%';
    gate.style.top = '50%';
    gate.style.width = '240px';
    gate.style.height = '360px';
    gate.style.transform = 'translate(-50%, -50%)';
    gate.style.background = 'url("/assets/images/gate.svg") center/contain no-repeat';
    this.container.appendChild(gate);
    
    InteractionSystem.makeInteractive(gate);

    this.gateClickHandler = () => {
      DialogueSystem.updateText("The gate is locked tightly. It has a recess shaped like a stone.");
      const shake = Object.create(shakeObjectPlugin);
      shake.init({ target: gate }, {});
    };

    gate.addEventListener('click', this.gateClickHandler);

    // Make Gate droppable for the inventory slot
    gate.addEventListener('dragover', (e) => e.preventDefault());
    gate.addEventListener('drop', (e) => {
      e.preventDefault();
      // Only proceed if dragging an inventory slot
      const sourceIndex = e.dataTransfer.getData('sourceIndex');
      if (sourceIndex !== '') {
        const item = SaveState.inventory[parseInt(sourceIndex, 10)];
        if (item && item.id === 'keyStone') {
          // Success! Used Item
          SaveState.removeInventoryItem('keyStone');
          SaveState.setFlag('keyStoneFound', true);

          gate.removeEventListener('click', this.gateClickHandler);
          DialogueSystem.hideCaption();
          
          gsap.to(gate, {
            scale: 3.5,
            opacity: 0,
            duration: 1.5,
            ease: 'power2.in',
            onComplete: () => {
              SceneFlowManager.goTo('PuzzleScene02');
            }
          });
        }
      }
    });

    this.gate = gate;
  }

  destroy() {
    if (this.gate) this.gate.removeEventListener('click', this.gateClickHandler);
    this.container.innerHTML = '';
  }
}
