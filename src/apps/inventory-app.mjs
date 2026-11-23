// Foundry VTT v14 provides `foundry` as a global. It is externalized by Vite.

export class InventoryApp extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'arpg-inventory-inventory',
    classes: ['arpg-inventory'],
    window: { title: 'ARPG Inventory' }
  };

  async _renderHTML() {
    const div = document.createElement('div');
    div.className = 'arpg-inventory';
    div.textContent = 'ARPG Inventory (bootstrap)';
    return div;
  }

  _replaceHTML(element, root) {
    root.replaceChildren(element);
  }
}
