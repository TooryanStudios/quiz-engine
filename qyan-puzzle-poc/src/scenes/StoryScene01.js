import { sceneData } from '../content/sceneData.js';
import { storyCaptions } from '../content/storyData.js';
import { SceneFlowManager } from '../systems/SceneFlowManager.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import clickRevealPlugin from '../plugins/interactions/clickReveal.plugin.js';
import glowPulsePlugin from '../plugins/effects/glowPulse.plugin.js';
import EventBus from '../core/EventBus.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';

export default class StoryScene01 {
  create(container) {
    this.container = container;
    this.container.style.background = 'url("/assets/images/valley-bg.svg") center/cover no-repeat';
    this.pluginsInstances = [];

    DialogueSystem.showCaption(this.container, storyCaptions.valleyEntrance);

    const data = sceneData['StoryScene01'];

    data.hotspots.forEach(hotspot => {
      const rect = document.createElement('div');
      rect.style.position = 'absolute';
      rect.style.left = `${hotspot.x - hotspot.width/2}px`;
      rect.style.top = `${hotspot.y - hotspot.height/2}px`;
      rect.style.width = `${hotspot.width}px`;
      rect.style.height = `${hotspot.height}px`;
      
      if (hotspot.id === 'rope') {
         rect.style.background = 'url("/assets/images/rope.svg") center/contain no-repeat';
      } else if (hotspot.id === 'bucket') {
         rect.style.background = 'url("/assets/images/bucket.svg") center/contain no-repeat';
      } else if (hotspot.id === 'symbol-stone') {
         rect.style.background = 'url("/assets/images/stone.svg") center/contain no-repeat';
      } else {
         rect.style.border = '2px solid transparent';
      }
      
      const label = document.createElement('div');
      label.innerText = hotspot.id;
      label.style.color = '#ffffff';
      label.style.position = 'absolute';
      label.style.top = '50%';
      label.style.left = '50%';
      label.style.transform = 'translate(-50%, -50%)';
      label.style.display = 'none'; // Hidden initially
      label.style.textShadow = '1px 1px 2px black';
      rect.appendChild(label);
      
      this.container.appendChild(rect);

      if (hotspot.plugin === 'clickReveal') {
        const plugin = Object.create(clickRevealPlugin);
        plugin.init({ target: rect, eventBus: EventBus }, { revealTarget: label });
        this.pluginsInstances.push(plugin);
      } else if (hotspot.plugin === 'glowPulse') {
        const plugin = Object.create(glowPulsePlugin);
        plugin.init({ target: rect }, {});
        this.pluginsInstances.push(plugin);
        
        InteractionSystem.makeInteractive(rect);
        rect.addEventListener('pointerdown', () => {
           DialogueSystem.updateText("The stone glows softly. Maybe I can find something here.");
        });
      }
    });

    this.contBtn = document.createElement('button');
    this.contBtn.className = 'ui-btn';
    this.contBtn.innerText = 'Continue ->';
    this.contBtn.style.position = 'absolute';
    this.contBtn.style.right = '50px';
    this.contBtn.style.bottom = '50px';
    this.container.appendChild(this.contBtn);
    
    this.contHandler = () => {
      SceneFlowManager.goTo(data.next);
    };
    this.contBtn.addEventListener('click', this.contHandler);
  }

  destroy() {
    this.pluginsInstances.forEach(p => p.destroy());
    if (this.contBtn) this.contBtn.removeEventListener('click', this.contHandler);
    this.container.innerHTML = '';
  }
}
