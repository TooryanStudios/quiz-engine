import gsap from 'gsap';

export const DialogueSystem = {
  showCaption(container, text) {
    if (this.panel) {
      this.hideCaption();
    }
    
    this.panel = document.createElement('div');
    this.panel.style.position = 'absolute';
    this.panel.style.top = '10px';
    this.panel.style.left = '50%';
    this.panel.style.transform = 'translateX(-50%)';
    this.panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.panel.style.color = '#ffffff';
    this.panel.style.padding = '10px 20px';
    this.panel.style.borderRadius = '8px';
    this.panel.style.fontSize = '16px';
    this.panel.style.textAlign = 'center';
    this.panel.style.maxWidth = '80%';
    this.panel.style.zIndex = '1000';
    this.panel.style.opacity = '0';
    
    this.textNode = document.createElement('span');
    this.textNode.innerText = text;
    this.panel.appendChild(this.textNode);
    
    container.appendChild(this.panel);
    
    gsap.to(this.panel, { opacity: 1, duration: 0.3 });
  },

  updateText(text) {
    if (this.textNode) {
      this.textNode.innerText = text;
    }
  },

  hideCaption() {
    if (this.panel) {
      const p = this.panel;
      this.panel = null;
      this.textNode = null;
      
      gsap.to(p, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          if (p.parentNode) p.parentNode.removeChild(p);
        }
      });
    }
  }
};
