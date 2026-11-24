import { MODULE_ID } from '../constants.mjs';
import { getActorInventory, getItemGrid, getItemStack, setItemGrid } from '../data/inventory-service.mjs';
import { setActorInventory } from '../data/inventory-service.mjs';
import {
  createGridState,
  canPlace,
  placeItem,
  removeItem,
  placeOrStack,
  findFirstAvailable
} from '../engine/grid-engine.mjs';

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
    this.dragItemId = null;
    this.dragRotated = false;
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

  _buildEngineState(inv) {
    const state = createGridState(inv.capacity.cols, inv.capacity.rows);
    for (const [itemId, placement] of Object.entries(inv.placements)) {
      if (!placement) continue;
      const item = this.actor.items.get(itemId);
      if (!item) continue;
      state.placements[itemId] = { ...placement };
      for (let dy = 0; dy < placement.h; dy++) {
        for (let dx = 0; dx < placement.w; dx++) {
          state.cells[`${placement.x + dx},${placement.y + dy}`] = itemId;
        }
      }
    }
    return state;
  }

  _autoPlace(inv) {
    let state = this._buildEngineState(inv);
    let changed = false;
    for (const item of this.actor.items ?? []) {
      if (item.id in inv.placements && inv.placements[item.id] !== null) continue;
      if (!(item.id in inv.placements)) inv.placements[item.id] = null;
      if (inv.placements[item.id] !== null) continue;
      const grid = getItemGrid(item);
      const stack = getItemStack(item);
      const spot = findFirstAvailable(state, grid, false);
      if (!spot) continue;
      const placed = placeItem(state, { id: item.id, grid, stack, stackKey: item.name }, spot.x, spot.y, false);
      if (placed) {
        inv.placements[item.id] = placed.placements[item.id];
        state = placed;
        changed = true;
      }
    }
    if (changed) {
      setActorInventory(this.actor, inv).catch(() => {});
    }
  }

  async _renderHTML() {
    const root = document.createElement('div');
    root.className = 'arpg-inventory';

    if (!this.actor) {
      root.textContent = 'No actor selected.';
      return root;
    }

    const inv = getActorInventory(this.actor);
    this._autoPlace(inv);
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
    grid.dataset.cols = capacity.cols;
    grid.dataset.rows = capacity.rows;

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
      el.draggable = true;
      el.dataset.itemId = item.id;
      el.style.gridColumn = `${placement.x + 1} / span ${placement.w}`;
      el.style.gridRow = `${placement.y + 1} / span ${placement.h}`;
      el.title = item.name;

      if (item.img) {
        const img = document.createElement('img');
        img.className = 'arpginv-item__img';
        img.src = item.img;
        img.alt = item.name;
        el.appendChild(img);
      }

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
        el.addEventListener('dblclick', (ev) => {
          ev.preventDefault();
          this._editItemGrid(item);
        });
      }

      el.addEventListener('dragstart', (ev) => {
        this.dragItemId = item.id;
        this.dragRotated = false;
        ev.dataTransfer.setData('text/plain', item.id);
        ev.dataTransfer.effectAllowed = 'move';
        el.classList.add('dragging');
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        this.dragItemId = null;
        this._clearDropHighlight(grid);
      });

      grid.appendChild(el);
    }

    // Drag & drop handlers on grid
    grid.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      this._lastMouse = { x: ev.clientX, y: ev.clientY };
      if (!this.dragItemId) return;
      const cell = this._cellFromPoint(grid, ev.clientX, ev.clientY);
      if (!cell) {
        this._setDropHighlight(grid, false);
        return;
      }
      const x = cell.x;
      const y = cell.y;
      const item = this.actor.items.get(this.dragItemId);
      if (!item) return;
      const baseGrid = getItemGrid(item);
      const gridDims = this.dragRotated
        ? { w: baseGrid.h, h: baseGrid.w, rotatable: baseGrid.rotatable }
        : baseGrid;
      const state = this._buildEngineState(inv);
      const working = inv.placements[this.dragItemId]
        ? removeItem(state, this.dragItemId)
        : state;
      const token = { id: this.dragItemId, grid: gridDims, stack: getItemStack(item), stackKey: item.name };
      const valid = canPlace(working, gridDims, x, y) || !!placeOrStack(working, token, x, y);
      this._setDropHighlight(grid, valid);
    });

    grid.addEventListener('drop', async (ev) => {
      ev.preventDefault();
      if (!this.dragItemId) return;
      const cell = this._cellFromPoint(grid, ev.clientX, ev.clientY);
      if (!cell) return;
      const x = cell.x;
      const y = cell.y;
      const draggedId = this.dragItemId;
      const item = this.actor.items.get(draggedId);
      if (!item) return;

      const currentInv = getActorInventory(this.actor);
      const baseGrid = getItemGrid(item);
      const gridDims = this.dragRotated
        ? { w: baseGrid.h, h: baseGrid.w, rotatable: baseGrid.rotatable }
        : baseGrid;
      const state = this._buildEngineState(currentInv);
      const working = currentInv.placements[draggedId]
        ? removeItem(state, draggedId)
        : state;
      const token = { id: draggedId, grid: gridDims, stack: getItemStack(item), stackKey: item.name };
      const res = placeOrStack(working, token, x, y);
      if (!res) {
        this._clearDropHighlight(grid);
        return;
      }

      const newInv = { ...currentInv, placements: { ...res.state.placements } };
      if (!res.consumed && newInv.placements[draggedId]) {
        newInv.placements[draggedId].rotated = this.dragRotated;
      }

      if (res.consumed) {
        const targetItem = this.actor.items.get(res.targetId);
        if (targetItem) {
          const newStack = newInv.placements[res.targetId]?.stack ?? { current: 1, max: 1 };
          await targetItem.setFlag(MODULE_ID, 'stack', { current: newStack.current, max: newStack.max });
          await targetItem.update({ 'system.quantity': newStack.current });
        }
        await setActorInventory(this.actor, newInv);
        await this.actor.deleteEmbeddedDocuments('Item', [draggedId]);
      } else {
        await setActorInventory(this.actor, newInv);
      }

      this.dragItemId = null;
      this.dragRotated = false;
      this._clearDropHighlight(grid);
      this.render(true);
    });

    // Rotation during drag
    if (!this._dragKeyHandler) {
      this._dragKeyHandler = (ev) => {
        if (!this.dragItemId) return;
        if (ev.code === 'KeyR') {
          this.dragRotated = !this.dragRotated;
          const grid = this.element?.querySelector('.arpginv-grid');
          if (grid && this._lastMouse) {
            grid.dispatchEvent(new MouseEvent('dragover', {
              clientX: this._lastMouse.x,
              clientY: this._lastMouse.y,
              bubbles: true
            }));
          }
        }
      };
      document.addEventListener('keydown', this._dragKeyHandler);
    }

    root.append(weightBar, grid);
    return root;
  }

  _cellFromPoint(grid, clientX, clientY) {
    const cols = +grid.dataset.cols;
    const rows = +grid.dataset.rows;
    const rect = grid.getBoundingClientRect();
    const stride = 36; // 34px cell + 2px gap
    const pad = 4;
    const x = Math.floor((clientX - rect.left - pad) / stride);
    const y = Math.floor((clientY - rect.top - pad) / stride);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
    return { x, y };
  }
  _setDropHighlight(grid, valid) {
    grid.classList.toggle('drop-valid', valid);
    grid.classList.toggle('drop-invalid', !valid);
  }

  _clearDropHighlight(grid) {
    grid.classList.remove('drop-valid', 'drop-invalid');
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
