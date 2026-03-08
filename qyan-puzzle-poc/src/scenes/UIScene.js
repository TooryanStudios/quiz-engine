import { SceneFlowManager } from '../systems/SceneFlowManager.js';
import EventBus from '../core/EventBus.js';
import { SaveState } from '../core/SaveState.js';

export default class UIScene {
  create(container) {
    this.container = container;
    
    // Title label
    const title = document.createElement('div');
    title.innerText = 'The Hidden Gate - POC';
    title.style.position = 'absolute';
    title.style.top = '20px';
    title.style.left = '20px';
    title.style.fontSize = '18px';
    title.style.color = '#aaaaaa';
    title.style.pointerEvents = 'none';
    this.container.appendChild(title);

    // Restart button
    this.restartBtn = document.createElement('button');
    this.restartBtn.innerText = 'Restart';
    this.restartBtn.className = 'ui-btn';
    this.restartBtn.style.position = 'absolute';
    this.restartBtn.style.top = '20px';
    this.restartBtn.style.right = '20px';
    this.restartBtn.style.pointerEvents = 'auto'; // Re-enable pointer logic from parent
    this.container.appendChild(this.restartBtn);
    
    // Admin Stage Jump Panel Toggle
    this.stageToggleBtn = document.createElement('button');
    this.stageToggleBtn.innerText = '☰ Stages';
    this.stageToggleBtn.className = 'ui-btn';
    this.stageToggleBtn.style.position = 'absolute';
    this.stageToggleBtn.style.top = '50px';
    this.stageToggleBtn.style.left = '20px';
    this.stageToggleBtn.style.pointerEvents = 'auto';
    this.container.appendChild(this.stageToggleBtn);

    // Sidebar Panel
    this.stagePanel = document.createElement('div');
    this.stagePanel.style.position = 'absolute';
    this.stagePanel.style.top = '0';
    this.stagePanel.style.left = '-150px'; // Hidden initially
    this.stagePanel.style.width = '150px';
    this.stagePanel.style.height = '100%';
    this.stagePanel.style.backgroundColor = 'rgba(10, 10, 15, 0.95)';
    this.stagePanel.style.borderRight = '1px solid #444';
    this.stagePanel.style.transition = 'left 0.2s ease';
    this.stagePanel.style.pointerEvents = 'auto';
    this.stagePanel.style.zIndex = '1000';
    this.stagePanel.style.overflowY = 'auto';
    this.stagePanel.style.display = 'flex';
    this.stagePanel.style.flexDirection = 'column';
    this.stagePanel.style.padding = '10px';
    this.stagePanel.style.boxSizing = 'border-box';
    this.stagePanel.style.fontSize = '12px';
    this.container.appendChild(this.stagePanel);

    // Close button for Panel
    this.closePanelBtn = document.createElement('button');
    this.closePanelBtn.innerText = 'X';
    this.closePanelBtn.className = 'ui-btn';
    this.closePanelBtn.style.marginBottom = '10px';
    this.closePanelBtn.style.padding = '5px';
    this.closePanelBtn.style.alignSelf = 'flex-end';
    this.stagePanel.appendChild(this.closePanelBtn);

    const stages = [
      'IntroScene', 'StoryScene01', 'PuzzleScene01', 
      'StoryScene02', 'PuzzleScene02', 'QuizScene01', 'EndingScene'
    ];
    
    // Auto-generate stage links up to 10 extra generic ones
    for(let i=1; i<=10; i++) {
        stages.push(`MiniGameStagePart${i}`);
    }

    this.jumpHandlers = [];
    stages.forEach(stage => {
      const btn = document.createElement('button');
      btn.innerText = stage.replace('MiniGameStagePart', 'Game_M').replace('Scene', '');
      btn.className = 'ui-btn';
      btn.style.marginBottom = '5px';
      btn.style.textAlign = 'left';
      btn.style.padding = '5px';
      btn.style.fontSize = '11px';
      this.stagePanel.appendChild(btn);

      const handler = () => {
        SceneFlowManager.goTo(stage);
      };
      btn.addEventListener('click', handler);
      this.jumpHandlers.push({ btn, handler, stage });
    });

    this.sceneListener = (activeStage) => {
      this.jumpHandlers.forEach(h => {
        if (h.stage === activeStage) {
          h.btn.style.backgroundColor = '#008b8b'; // Dark cyan highlight
          h.btn.style.color = '#fff';
          h.btn.style.borderColor = '#00ffff';
        } else {
          h.btn.style.backgroundColor = '';
          h.btn.style.color = '';
          h.btn.style.borderColor = '';
        }
      });
    };
    EventBus.on('scene-changed', this.sceneListener);
    // Initialize active highlight immediately
    this.sceneListener(SaveState.currentScene);

    this.togglePanelHandler = () => {
      this.stagePanel.style.left = '0';
    };
    this.stageToggleBtn.addEventListener('click', this.togglePanelHandler);

    this.closePanelHandler = () => {
      this.stagePanel.style.left = '-150px';
    };
    this.closePanelBtn.addEventListener('click', this.closePanelHandler);

    this.restartHandler = () => {
      SceneFlowManager.restart();
    };
    this.restartBtn.addEventListener('click', this.restartHandler);

    // INVENTORY SYSTEM
    this.inventoryContainer = document.createElement('div');
    this.inventoryContainer.style.position = 'absolute';
    this.inventoryContainer.style.bottom = '20px';
    this.inventoryContainer.style.left = '20px';
    this.inventoryContainer.style.display = 'flex';
    this.inventoryContainer.style.gap = '10px';
    this.inventoryContainer.style.pointerEvents = 'auto';
    this.container.appendChild(this.inventoryContainer);

    this.renderInventory = () => {
      this.inventoryContainer.innerHTML = ''; // clear
      
      const invItems = SaveState.inventory;
      const MAX_SLOTS = 4;

      for (let index = 0; index < MAX_SLOTS; index++) {
        const item = invItems[index];
        const slot = document.createElement('div');
        slot.style.width = '50px';
        slot.style.height = '50px';
        slot.style.border = '2px dashed rgba(255, 255, 255, 0.3)';
        slot.style.borderRadius = '5px';
        slot.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        slot.style.display = 'flex';
        slot.style.justifyContent = 'center';
        slot.style.alignItems = 'center';
        
        if (item) {
          slot.style.border = '2px solid rgba(255, 255, 255, 0.8)';
          slot.style.cursor = 'grab';
          slot.draggable = true;
          
          // Inner SVG
          const img = document.createElement('div');
          img.style.width = '80%';
          img.style.height = '80%';
          img.style.background = item.svg ? `url("${item.svg}") center/contain no-repeat` : 'none';
          img.innerText = item.svg ? '' : item.id;
          img.style.color = '#fff';
          img.style.fontSize = '10px';
          img.style.pointerEvents = 'none'; // let the slot handle drag
          slot.appendChild(img);
          
          // Drag Re-order handlers
          slot.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('sourceIndex', index);
          });
        }

        // Always allow dropping on slots to reorder blanks
        slot.addEventListener('dragover', (e) => {
          e.preventDefault();
          slot.style.borderColor = '#00BFFF';
        });

        slot.addEventListener('dragleave', () => {
           slot.style.borderColor = item ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)';
        });

        slot.addEventListener('drop', (e) => {
          e.preventDefault();
          const fromIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10);
          if (fromIndex !== index && !isNaN(fromIndex)) {
            // Swap logic directly inside SaveState
            const temp = SaveState.inventory[index];
            SaveState.inventory[index] = SaveState.inventory[fromIndex];
            SaveState.inventory[fromIndex] = temp;
            
            // Cleanup any undefined gaps inserted by moving to a non-existent index
            SaveState.inventory = SaveState.inventory.filter(Boolean);
            
            this.renderInventory(); // Redraw
          }
        });

        this.inventoryContainer.appendChild(slot);
      }
    };

    // Listen to changes
    this.inventoryListener = (itemsMap) => this.renderInventory();
    EventBus.on('inventory-updated', this.inventoryListener);
    
    this.renderInventory(); // Init render
  }
  
  destroy() {
    if (this.restartBtn) this.restartBtn.removeEventListener('click', this.restartHandler);
    if (this.stageToggleBtn) this.stageToggleBtn.removeEventListener('click', this.togglePanelHandler);
    if (this.closePanelBtn) this.closePanelBtn.removeEventListener('click', this.closePanelHandler);
    if (this.jumpHandlers) {
      this.jumpHandlers.forEach(h => h.btn.removeEventListener('click', h.handler));
    }
    EventBus.off('inventory-updated', this.inventoryListener);
    EventBus.off('scene-changed', this.sceneListener);
  }
}
