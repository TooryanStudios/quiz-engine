import { SceneFlowManager } from '../systems/SceneFlowManager.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { PuzzleStateSystem } from '../systems/PuzzleStateSystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import gsap from 'gsap';

export default class PuzzleScene02 {
  create(container) {
    this.container = container;
    this.container.style.background = 'url("/assets/images/chamber-bg.svg") center/cover no-repeat';

    DialogueSystem.showCaption(this.container, "The key stone fits. Now align the rings.");

    this.gate = document.createElement('div');
    this.gate.style.position = 'absolute';
    this.gate.style.left = '50%';
    this.gate.style.top = '50%';
    this.gate.style.width = '240px';
    this.gate.style.height = '360px';
    this.gate.style.transform = 'translate(-50%, -50%)';
    this.gate.style.background = 'url("/assets/images/gate.svg") center/contain no-repeat';
    this.gate.style.display = 'flex';
    this.gate.style.flexDirection = 'column';
    this.gate.style.alignItems = 'center';
    this.gate.style.justifyContent = 'center';
    this.gate.style.gap = '15px';
    this.container.appendChild(this.gate);

    const symbols = ['Triangle', 'Circle', 'Square']; 
    this.currentSequence = [0, 0, 0];
    this.rings = [];

    const checkSequence = () => {
      if (PuzzleStateSystem.tryCompletePuzzle02(this.currentSequence)) {
        DialogueSystem.updateText("The gate clicks open!");
        this.rings.forEach(r => r.style.pointerEvents = 'none');
        
        gsap.to(this.gate, {
          y: "-=200", // Shift up visually
          opacity: 0,
          duration: 1.5,
          delay: 0.5,
          onComplete: () => SceneFlowManager.goTo('QuizScene01')
        });
      }
    };

    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('div');
      ring.style.width = '60px';
      ring.style.height = '60px';
      ring.style.background = 'url("/assets/images/ring.svg") center/contain no-repeat';
      ring.style.color = '#ffffff';
      ring.style.textShadow = '0px 1px 2px #000';
      ring.style.fontWeight = 'bold';
      ring.style.display = 'flex';
      ring.style.alignItems = 'center';
      ring.style.justifyContent = 'center';
      ring.style.fontSize = '12px';
      ring.innerText = symbols[0];
      
      InteractionSystem.makeInteractive(ring);
      ring.addEventListener('click', () => {
        InteractionSystem.applyClickFeedback(ring);
        this.currentSequence[i] = (this.currentSequence[i] + 1) % 3;
        ring.innerText = symbols[this.currentSequence[i]];
        checkSequence();
      });
      
      this.gate.appendChild(ring);
      this.rings.push(ring);
    }
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
