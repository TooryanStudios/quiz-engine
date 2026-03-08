import { SceneFlowManager } from '../systems/SceneFlowManager.js';
import EventBus from './EventBus.js';

export default class GameApp {
  constructor(selector) {
    this.container = document.querySelector(selector);
  }

  mount() {
    this.host = document.createElement('div');
    this.host.id = 'game-host';
    this.container.appendChild(this.host);

    SceneFlowManager.init(this.host);
    SceneFlowManager.preloadAndBoot();
  }

  destroy() {
    SceneFlowManager.destroy();
    if (this.host) {
      this.host.remove();
      this.host = null;
    }
  }
}
