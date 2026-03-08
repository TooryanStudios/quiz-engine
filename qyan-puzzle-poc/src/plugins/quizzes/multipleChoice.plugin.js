import gsap from 'gsap';
import { AudioSystem } from '../../systems/AudioSystem.js';

export default {
  id: 'multipleChoice',
  init(context, config) {
    const { container, data, onComplete } = context;
    if (!container || !data) return;

    this.container = container;
    this.handlers = [];

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '20px';
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = '600px';
    wrapper.style.padding = '40px';
    wrapper.style.backgroundColor = 'rgba(20, 30, 40, 0.9)';
    wrapper.style.borderRadius = '12px';
    wrapper.style.border = '2px solid #00BFFF';
    
    // Add glowing shadow to quiz box
    wrapper.style.boxShadow = '0px 0px 20px rgba(0, 191, 255, 0.5)';

    const qText = document.createElement('h2');
    qText.innerText = data.question;
    qText.style.color = '#fff';
    qText.style.margin = '0';
    wrapper.appendChild(qText);

    // Feedback Element
    const feedback = document.createElement('div');
    feedback.style.height = '30px';
    feedback.style.color = '#ff4444';
    feedback.style.fontWeight = 'bold';
    feedback.style.textAlign = 'center';
    wrapper.appendChild(feedback);

    data.options.forEach((optText, index) => {
      const btn = document.createElement('button');
      btn.className = 'ui-btn';
      btn.style.width = '100%';
      btn.style.textAlign = 'left';
      btn.style.padding = '15px 20px';
      btn.style.borderRadius = '8px';
      btn.style.display = 'flex';
      btn.style.justifyContent = 'space-between';
      
      const label = document.createElement('span');
      label.innerText = String.fromCharCode(65 + index) + '. ' + optText;
      btn.appendChild(label);

      const hitHandler = () => {
        AudioSystem.playClick();
        if (index === data.correctIndex) {
          btn.style.backgroundColor = '#2E8B57';
          feedback.style.color = '#00FA9A';
          feedback.innerText = data.successMessage;
          AudioSystem.playSuccess();
          
          gsap.to(wrapper, {
            scale: 1.05,
            opacity: 0,
            duration: 1,
            delay: 1,
            onComplete: () => {
              if (onComplete) onComplete();
            }
          });
          
          // disable interactions
          this.handlers.forEach(h => h.btn.removeEventListener('click', h.func));
        } else {
          // Wrong Answer
          btn.style.backgroundColor = '#8B0000';
          feedback.innerText = data.errorMessage;
          gsap.fromTo(wrapper, { x: -10 }, { x: 10, yoyo: true, repeat: 5, duration: 0.05, clearProps: 'x' });
        }
      };

      btn.addEventListener('click', hitHandler);
      this.handlers.push({ btn, func: hitHandler });
      wrapper.appendChild(btn);
    });

    this.container.appendChild(wrapper);
    gsap.fromTo(wrapper, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 });
  },

  destroy() {
    this.handlers.forEach(h => h.btn.removeEventListener('click', h.func));
    this.container.innerHTML = '';
  }
};
