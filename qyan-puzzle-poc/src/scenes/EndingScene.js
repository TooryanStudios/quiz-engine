import { storyCaptions } from '../content/storyData.js';
import gsap from 'gsap';

export default class EndingScene {
  create(container) {
    this.container = container;
    this.container.style.backgroundColor = '#111122';

    const glowingCore = document.createElement('div');
    glowingCore.style.position = 'absolute';
    glowingCore.style.left = '50%';
    glowingCore.style.top = '50%';
    glowingCore.style.width = '200px';
    glowingCore.style.height = '200px';
    glowingCore.style.transform = 'translate(-50%, -50%)';
    glowingCore.style.backgroundColor = '#00ffff';
    glowingCore.style.borderRadius = '50%';
    glowingCore.style.opacity = '0.8';
    this.container.appendChild(glowingCore);

    this.coreTween = gsap.to(glowingCore, {
      scale: 1.2,
      opacity: 0.5,
      yoyo: true,
      repeat: -1,
      duration: 2
    });

    const endingText = document.createElement('div');
    endingText.innerText = storyCaptions.endingText;
    endingText.style.position = 'absolute';
    endingText.style.left = '50%';
    endingText.style.top = '25%'; // 150px up from center approximately
    endingText.style.transform = 'translate(-50%, -50%)';
    endingText.style.fontSize = '36px';
    endingText.style.color = '#ffffff';
    endingText.style.opacity = '0';
    this.container.appendChild(endingText);
    
    this.textTween = gsap.to(endingText, {
      opacity: 1,
      duration: 2,
      delay: 1
    });
  }

  destroy() {
    if (this.coreTween) this.coreTween.kill();
    if (this.textTween) this.textTween.kill();
    this.container.innerHTML = '';
  }
}
