import EventBus from '../core/EventBus.js';
import { SaveState } from '../core/SaveState.js';

import IntroScene from '../scenes/IntroScene.js';
import StoryScene01 from '../scenes/StoryScene01.js';
import PuzzleScene01 from '../scenes/PuzzleScene01.js';
import StoryScene02 from '../scenes/StoryScene02.js';
import PuzzleScene02 from '../scenes/PuzzleScene02.js';
import QuizScene01 from '../scenes/QuizScene01.js';
import EndingScene from '../scenes/EndingScene.js';
import UIScene from '../scenes/UIScene.js';
import MiniGameStage from '../scenes/MiniGameStage.js';

class SceneFlowManagerClass {
  init(hostElement) {
    this.host = hostElement;
    this.scenes = {
      IntroScene: new IntroScene(),
      StoryScene01: new StoryScene01(),
      PuzzleScene01: new PuzzleScene01(),
      StoryScene02: new StoryScene02(),
      PuzzleScene02: new PuzzleScene02(),
      QuizScene01: new QuizScene01(),
      EndingScene: new EndingScene(),
    };
    
    // Auto-mount dynamic stages
    for(let i=1; i<=10; i++) {
       const stageId = `MiniGameStagePart${i}`;
       this.scenes[stageId] = new MiniGameStage(stageId);
    }
    
    this.uiScene = new UIScene();
    
    this.currentSceneId = null;
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.position = 'absolute';
    this.uiContainer.style.top = '0';
    this.uiContainer.style.left = '0';
    this.uiContainer.style.width = '100%';
    this.uiContainer.style.height = '100%';
    this.uiContainer.style.pointerEvents = 'none';
    this.uiContainer.style.zIndex = '1000';
    this.host.appendChild(this.uiContainer);
    
    this.uiScene.create(this.uiContainer);
  }

  preloadAndBoot() {
    this.goTo('IntroScene');
  }

  goTo(newSceneKey) {
    if (this.currentScene) {
      this.currentScene.destroy();
      this.currentContainer.classList.remove('active');
    }

    SaveState.currentScene = newSceneKey;
    EventBus.emit('scene-changed', newSceneKey);

    this.currentContainer = document.createElement('div');
    this.currentContainer.className = 'scene-container';
    this.host.insertBefore(this.currentContainer, this.uiContainer);
    
    // allow paint before adding active class for fade in
    requestAnimationFrame(() => {
      this.currentContainer.classList.add('active');
    });

    this.currentScene = this.scenes[newSceneKey];
    this.currentScene.create(this.currentContainer);
  }

  restart() {
    SaveState.reset();
    EventBus.emit('game-restarted');
    this.goTo('IntroScene');
  }

  destroy() {
    if (this.currentScene) this.currentScene.destroy();
    if (this.uiScene) this.uiScene.destroy();
  }
}

export const SceneFlowManager = new SceneFlowManagerClass();
