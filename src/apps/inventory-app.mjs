import { MODULE_ID } from '../constants.mjs';
import { getActorInventory, getItemGrid, getItemStack } from '../data/inventory-service.mjs';
import { setItemGrid } from '../data/inventory-service.mjs';

function rarityClass(item) {
  const raw = (item.system?.rarity ?? item.rarity ?? 'common').toString();
  const slug = raw
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `arpginv-rarity--${slug || 'common'}`;
}

function actorWeight(actor) {
  let total = 0;
  for (const item of actor.items ?? []) {
    const w = item.system?.weight?.value ?? item.system?.weight ?? 0;
    const q = item.system?.quantity ?? 1;
    total += (Number(w) || 0) * (Number(q) || 1);
  }
  return total;
}

export class InventoryApp extends foundry.applications.api.ApplicationV2 {
  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null;
  }

  static DEFAULT_OPTIONS = {
    id: 'arpg-inventory-inventory',
    classes: ['arpg-inventory'],
    window: { title: 'ARPG Inventory' },
    position: { width: 520, height: 420 }
  };

  get title() {
    return this.actor ? `ARPG Inventory - ${this.actor.name}` : 'ARPG Inventory';
  }

  async _renderHTML() {
    const root = document.createElement('div');
    root.className = 'arpg-inventory';

    if (!this.actor) {
      root.textContent = 'No actor selected.';
      return root;
    }

    const inv = getActorInventory(this.actor);
    const capacity = inv.capacity;

    // Weight bar
    const weight = actorWeight(this.actor);
    const weightBar = document.createElement('div');
    weightBar.className = 'arpginv-weight';
    const fill = document.createElement('div');
    fill.className = 'arpginv-weight__fill';
    const pct = capacity.maxWeight > 0 ? Math.min(100, (weight / capacity.maxWeight) * 100) : 0;
    fill.style.width = `${pct}%`;
    if (pct >= 100) fill.classList.add('arpginv-weight__fill--over');
    else if (pct >= 75) fill.classList.add('arpginv-weight__fill--warn');
    const label = document.createElement('span');
    label.className = 'arpginv-weight__label';
    label.textContent = `${weight.toFixed(1)} / ${capacity.maxWeight}`;
    weightBar.append(fill, label);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'arpginv-grid';
    grid.style.gridTemplateColumns = `repeat(${capacity.cols}, 34px)`;
    grid.style.gridTemplateRows = `repeat(${capacity.rows}, 34px)`;

    // Empty cells
    for (let y = 0; y < capacity.rows; y++) {
      for (let x = 0; x < capacity.cols; x++) {
        const cell = document.createElement('div');
        cell.className = 'arpginv-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        grid.appendChild(cell);
      }
    }

    // Items
    for (const item of this.actor.items ?? []) {
      const placement = inv.placements[item.id];
      if (!placement) continue;
      const g = getItemGrid(item);
      const stack = getItemStack(item);

      const el = document.createElement('div');
      el.className = `arpginv-item ${rarityClass(item)}`;
      el.style.gridColumn = `${placement.x + 1} / span ${placement.w}`;
      el.style.gridRow = `${placement.y + 1} / span ${placement.h}`;
      el.title = item.name;

      const name = document.createElement('span');
      name.className = 'arpginv-item__name';
      name.textContent = item.name;
      el.appendChild(name);

      if (stack.current > 1) {
        const badge = document.createElement('span');
        badge.className = 'arpginv-item__stack';
        badge.textContent = `x${stack.current}`;
        el.appendChild(badge);
      }

      if (game.user?.isGM) {
        el.addEventListener('contextmenu', (ev) => {
          ev.preventDefault();
          this._editItemGrid(item);
        });
      }

      grid.appendChild(el);
    }

    root.append(weightBar, grid);
    return root;
  }

  _replaceHTML(element, root) {
    root.replaceChildren(element);
  }

  async _editItemGrid(item) {
    if (!game.user?.isGM) return;
    const current = getItemGrid(item);
    const content = `
      <form class="arpginv-edit-form">
        <div class="form-group">
          <label>Width</label>
          <input type="number" name="w" value="${current.w}" min="1" />
        </div>
        <div class="form-group">
          <label>Height</label>
          <input type="number" name="h" value="${current.h}" min="1" />
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="rotatable" ${current.rotatable ? 'checked' : ''} /> Rotatable</label>
        </div>
      </form>
    `;

    const dialog = new foundry.applications.api.DialogV2({
      window: { title: `Edit grid size: ${item.name}` },
      content,
      buttons: [
        {
          action: 'save',
          label: 'Save',
          default: true,
          callback: async (event, button, dialogEl) => {
            const form = dialogEl.querySelector('form');
            const w = Math.max(1, parseInt(form.w.value, 10) || 1);
            const h = Math.max(1, parseInt(form.h.value, 10) || 1);
            const rotatable = form.rotatable.checked;
            await setItemGrid(item, { w, h, rotatable });
            this.render(true);
          }
        },
        { action: 'cancel', label: 'Cancel' }
      ]
    });
    await dialog.render(true);
  }
}
