import EventBus from './EventBus.js';

class SaveStateClass {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentScene = 'BootScene';
    this.inventory = [];
    this.solvedPuzzles = [];
    this.flags = {
      keyStoneFound: false,
      gateUnlocked: false
    };
    EventBus.emit('inventory-updated', this.inventory);
  }

  getState() {
    return {
      currentScene: this.currentScene,
      inventory: [...this.inventory],
      solvedPuzzles: [...this.solvedPuzzles],
      flags: { ...this.flags }
    };
  }

  setFlag(key, value) {
    this.flags[key] = value;
  }

  hasFlag(key) {
    return !!this.flags[key];
  }

  addInventoryItem(id, svgPath) {
    if (!this.hasInventoryItem(id)) {
      this.inventory.push({ id, svg: svgPath || null });
      EventBus.emit('inventory-updated', this.inventory);
    }
  }

  removeInventoryItem(itemId) {
    this.inventory = this.inventory.filter((i) => i.id !== itemId);
    EventBus.emit('inventory-updated', this.inventory);
  }

  hasInventoryItem(itemId) {
    return this.inventory.some((i) => i.id === itemId);
  }
}

export const SaveState = new SaveStateClass();
