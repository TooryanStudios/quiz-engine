import { SceneFlowManager } from '../systems/SceneFlowManager.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { PuzzleStateSystem } from '../systems/PuzzleStateSystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';

export default class PuzzleScene01 {
  create(container) {
    this.container = container;
    this.container.style.background = 'url("/assets/images/chamber-bg.svg") center/cover no-repeat';

    DialogueSystem.showCaption(this.container, "A dry canal. I can see something stuck inside. Connect the rope to the bucket to retrieve it.");

    // Helpers to create draggable/droppable blocks
    const makeItem = (id, svgName, size, x, y, draggable) => {
      const el = document.createElement('div');
      el.id = id;
      el.style.position = 'absolute';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.width = size.w;
      el.style.height = size.h;
      el.style.background = `url("/assets/images/${svgName}.svg") center/contain no-repeat`;
      if (draggable) {
        el.draggable = true;
        el.style.cursor = 'grab';
      }
      return el;
    };

    const bucket = makeItem('bucket', 'bucket', {w: '100px', h: '100px'}, 350, 250, false);
    const rope = makeItem('rope', 'rope', {w: '45px', h: '150px'}, 800, 250, true);
    
    // Canal zone
    const canalZone = document.createElement('div');
    canalZone.style.position = 'absolute';
    canalZone.style.left = '50%';
    canalZone.style.bottom = '180px';
    canalZone.style.transform = 'translateX(-50%)';
    canalZone.style.width = '300px';
    canalZone.style.height = '100px';
    canalZone.style.background = 'url("/assets/images/canal.svg") center/contain no-repeat';
    
    // Key Stone Reveal
    const keyStone = makeItem('key-stone', 'key-stone', {w: '60px', h: '60px'}, 0, -80, false);
    keyStone.style.display = 'none';
    keyStone.style.left = '50%';
    keyStone.style.transform = 'translateX(-50%)';
    keyStone.style.pointerEvents = 'auto'; // Explicitly allow clicks
    keyStone.style.zIndex = '100'; // Make sure it sits above bucket

    InteractionSystem.makeInteractive(keyStone);

    this.container.appendChild(canalZone);
    this.container.appendChild(bucket);
    this.container.appendChild(rope);
    bucket.appendChild(keyStone);

    // Setup UI button
    this.contBtn = document.createElement('button');
    this.contBtn.className = 'ui-btn';
    this.contBtn.innerText = 'Continue ->';
    this.contBtn.style.position = 'absolute';
    this.contBtn.style.right = '50px';
    this.contBtn.style.bottom = '50px';
    this.contBtn.style.display = 'none';
    this.container.appendChild(this.contBtn);
    
    this.contHandler = () => SceneFlowManager.goTo('StoryScene02');
    this.contBtn.addEventListener('click', this.contHandler);

    // Step 1: Drag Rope to Bucket
    rope.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', 'rope'));
    bucket.addEventListener('dragover', (e) => e.preventDefault());
    bucket.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.getData('text/plain') === 'rope') {
        rope.style.display = 'none'; // hide generic rope
        
        const label = document.createElement('div');
        label.innerText = 'bucket+rope';
        label.style.width = '100%';
        label.style.textAlign = 'center';
        label.style.pointerEvents = 'none';
        bucket.appendChild(label);
        
        bucket.style.borderTop = '5px solid #8B4513';
        bucket.draggable = true;
        bucket.style.cursor = 'grab';
        DialogueSystem.updateText("The rope is attached to the bucket. Now use it on the canal.");
      }
    });

    // Step 2: Drag Bucket to Canal
    bucket.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', 'bucket'));
    canalZone.addEventListener('dragover', (e) => e.preventDefault());
    canalZone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.getData('text/plain') === 'bucket') {
        bucket.style.left = '50%';
        bucket.style.top = '0';
        bucket.style.transform = 'translateX(-50%)';
        bucket.draggable = false;
        bucket.style.cursor = 'default';
        canalZone.appendChild(bucket); // Map into canal coordinate space
        
        // Safely detach the keyStone from the previously draggable bucket and mount it to the zone
        canalZone.appendChild(keyStone);
        keyStone.style.top = '-80px';
        keyStone.style.display = 'flex';
        DialogueSystem.updateText("You dragged the bucket up! Click the glowing stone to collect it.");
      }
    });

    // Step 3: Collect Key
    keyStone.addEventListener('click', (e) => {
      e.stopPropagation();
      SaveState.addInventoryItem('keyStone', '/assets/images/stone.svg');
      keyStone.style.display = 'none';
      DialogueSystem.updateText("You pocketed the Key Stone.");
      PuzzleStateSystem.tryCompletePuzzle01();
      this.contBtn.style.display = 'block';
    });
  }

  destroy() {
    if (this.contBtn) this.contBtn.removeEventListener('click', this.contHandler);
    this.container.innerHTML = '';
  }
}
