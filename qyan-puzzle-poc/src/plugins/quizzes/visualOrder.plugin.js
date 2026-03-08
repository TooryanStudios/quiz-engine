import gsap from 'gsap';
import { AudioSystem } from '../../systems/AudioSystem.js';

export default {
  id: 'visualOrder',
  init(context, config) {
    const { container, data, onComplete } = context;
    if (!container || !data) return;

    this.container = container;
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '20px';
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = '600px';
    wrapper.style.padding = '40px';
    wrapper.style.backgroundColor = 'rgba(20, 30, 40, 0.9)';
    wrapper.style.borderRadius = '12px';
    wrapper.style.border = '2px solid #00FA9A';
    wrapper.style.boxShadow = '0px 0px 20px rgba(0, 250, 154, 0.5)';

    const instruction = document.createElement('h2');
    instruction.innerText = 'Rearrange in the correct order:';
    instruction.style.color = '#fff';
    instruction.style.margin = '0';
    wrapper.appendChild(instruction);

    const slotContainer = document.createElement('div');
    slotContainer.style.display = 'flex';
    slotContainer.style.gap = '15px';
    slotContainer.style.marginTop = '20px';
    wrapper.appendChild(slotContainer);

    let currentOrder = [...data.items];

    const renderSlots = () => {
      slotContainer.innerHTML = '';
      currentOrder.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.style.width = '80px';
        slot.style.height = '80px';
        slot.style.backgroundColor = 'rgba(0,0,0,0.6)';
        slot.style.border = '2px solid #fff';
        slot.style.borderRadius = '10px';
        slot.style.cursor = 'grab';
        slot.draggable = true;
        slot.style.display = 'flex';
        slot.style.justifyContent = 'center';
        slot.style.alignItems = 'center';
        
        slot.style.background = `url("${item.svg}") center/contain no-repeat, rgba(0,0,0,0.6)`;

        slot.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('sourceIndex', index);
        });

        slot.addEventListener('dragover', (e) => {
          e.preventDefault();
          slot.style.borderColor = '#00BFFF';
        });

        slot.addEventListener('dragleave', () => {
          slot.style.borderColor = '#fff';
        });

        slot.addEventListener('drop', (e) => {
          e.preventDefault();
          const fromIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10);
          if (fromIndex !== index && !isNaN(fromIndex)) {
            // Swap
            const temp = currentOrder[index];
            currentOrder[index] = currentOrder[fromIndex];
            currentOrder[fromIndex] = temp;
            AudioSystem.playClick();
            renderSlots();
            checkWin();
          }
        });

        slotContainer.appendChild(slot);
      });
    };

    const checkWin = () => {
      const isCorrect = currentOrder.every((item, i) => item.id === data.correctOrder[i]);
      if (isCorrect) {
        AudioSystem.playSuccess();
        instruction.innerText = 'Sequence Accepted!';
        instruction.style.color = '#00FA9A';
        Array.from(slotContainer.children).forEach(slot => {
          slot.style.pointerEvents = 'none';
          slot.style.borderColor = '#00FA9A';
        });
        
        gsap.to(wrapper, {
          scale: 1.05,
          opacity: 0,
          duration: 1.5,
          delay: 1,
          onComplete: () => {
            if (onComplete) onComplete();
          }
        });
      }
    };

    renderSlots();
    this.container.appendChild(wrapper);
    gsap.fromTo(wrapper, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 });
  },

  destroy() {
    this.container.innerHTML = '';
  }
};
