import { SaveState } from '../core/SaveState.js';
import EventBus from '../core/EventBus.js';

class InventorySystemClass {
  constructor() {
    this.selectedItemId = null;
  }

  selectItem(id) {
    this.selectedItemId = id;
    EventBus.emit('inventory-selected', id);
  }

  clearSelection() {
    this.selectedItemId = null;
    EventBus.emit('inventory-cleared');
  }

  getSelectedItem() {
    if (!this.selectedItemId) return null;
    return SaveState.inventory.find(i => i.id === this.selectedItemId) || null;
  }
}

export const InventorySystem = new InventorySystemClass();
