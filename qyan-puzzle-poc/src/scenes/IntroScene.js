import { introPanels } from '../content/introData.js';
import { SceneFlowManager } from '../systems/SceneFlowManager.js';
import gsap from 'gsap';

export default class IntroScene {
  create(container) {
    this.container = container;
    this.currentPanelIndex = 0;
    
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.justifyContent = 'center';
    this.container.style.alignItems = 'center';
    this.container.style.transition = 'background-color 1s ease';
    this.container.style.cursor = 'pointer';
    
    this.titleText = document.createElement('h1');
    this.titleText.style.fontSize = '48px';
    this.titleText.style.color = '#ffffff';
    this.titleText.style.margin = '0 0 40px 0';
    this.container.appendChild(this.titleText);

    this.captionText = document.createElement('p');
    this.captionText.style.fontSize = '24px';
    this.captionText.style.color = '#cccccc';
    this.captionText.style.textAlign = 'center';
    this.captionText.style.maxWidth = '800px';
    this.container.appendChild(this.captionText);

    this.clickHandler = () => {
      this.currentPanelIndex++;
      if (this.currentPanelIndex < introPanels.length) {
        this.showPanel();
      } else {
        SceneFlowManager.goTo('StoryScene01');
      }
    };
    this.container.addEventListener('click', this.clickHandler);

    this.showPanel();
  }

  showPanel() {
    const panelData = introPanels[this.currentPanelIndex];
    
    this.container.style.background = panelData.background;

    this.titleText.innerText = panelData.title;
    this.captionText.innerText = panelData.caption;

    gsap.fromTo(this.titleText, { opacity: 0 }, { opacity: 1, duration: 1 });
    gsap.fromTo(this.captionText, { opacity: 0 }, { opacity: 1, duration: 1 });
  }

  destroy() {
    this.container.removeEventListener('click', this.clickHandler);
    this.container.innerHTML = '';
  }
}
