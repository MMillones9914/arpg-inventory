import { MODULE_ID } from '../constants';
import {
  clearItemPlacement,
  getActorInventory,
  getItemGrid,
  getItemStack,
  setActorInventory,
  setItemGrid
} from '../data/inventory-service';
import { normalizePlacement } from '../data/grid-model';
import { pointToCell } from '../engine/grid-geometry';
import {
  createGridState,
  placeItem,
  removeItem,
  placeOrStack,
  findFirstAvailable
} from '../engine/grid-engine';

const CELL_SIZE = 34;

function rarityClass(item: any) {
  const raw = String(item?.system?.rarity ?? item?.rarity ?? 'common');
  const slug = raw
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `arpginv-rarity--${slug || 'common'}`;
}

function actorWeight(actor: any) {
  let total = 0;
  for (const item of actor?.items ?? []) {
    const weight = item.system?.weight?.value ?? item.system?.weight ?? 0;
    const quantity = item.system?.quantity ?? 1;
    total += (Number(weight) || 0) * (Number(quantity) || 1);
  }
  return total;
}

export class InventoryApp extends foundry.applications.api.ApplicationV2 {
  actor: any;
  dragItemId: string | null = null;
  dragRotated = false;
  _lastMouse: { x: number; y: number } | null = null;
  _dragKeyHandler: ((ev: KeyboardEvent) => void) | null = null;

  constructor(options: any = {}) {
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

  /** Effective (already swapped) dimensions for an item in the current drag state. */
  _effectiveGrid(item: any, rotated = false) {
    const base = getItemGrid(item);
    const swap = !!rotated && base.rotatable;
    return {
      w: swap ? base.h : base.w,
      h: swap ? base.w : base.h,
      rotatable: base.rotatable
    };
  }

  _placementOf(inv: any, itemId: string) {
    const raw = inv?.placements?.[itemId];
    if (!raw) return null;
    const item = this.actor?.items?.get?.(itemId);
    return normalizePlacement(
      raw,
      item ? getItemGrid(item) : {},
      inv.capacity.cols,
      inv.capacity.rows
    );
  }

  _buildEngineState(inv: any) {
    let state = createGridState(inv.capacity.cols, inv.capacity.rows);
    for (const itemId of Object.keys(inv.placements)) {
      const p = this._placementOf(inv, itemId);
      if (!p) continue;
      const item = this.actor?.items?.get?.(itemId);
      const token = {
        id: itemId,
        grid: { w: p.w, h: p.h, rotatable: true },
        stack: p.stack ?? { current: 1, max: 1 },
        stackKey: p.stackKey ?? item?.name ?? itemId
      };
      const placed = placeItem(state, token, p.x, p.y, false);
      if (placed) {
        state = placed;
        // Keep the stored effective size/rotation, not the engine's default flag.
        state.placements[itemId].rotated = p.rotated;
      } else {
        // Stale/out-of-bounds/overlapping placement: let auto-place repair it.
        inv.placements[itemId] = null;
      }
    }
    return state;
  }

  async _autoPlace(inv: any) {
    let state = this._buildEngineState(inv);
    let changed = false;
    for (const item of this.actor?.items ?? []) {
      if (inv.placements[item.id]) continue;
      inv.placements[item.id] = null;
      const grid = this._effectiveGrid(item, false);
      const stack = getItemStack(item);
      const spot = findFirstAvailable(state, grid, false);
      if (!spot) continue;
      const placed = placeItem(
        state,
        { id: item.id, grid, stack, stackKey: item.name },
        spot.x,
        spot.y,
        false
      );
      if (placed) {
        inv.placements[item.id] = placed.placements[item.id];
        state = placed;
        changed = true;
      }
    }
    if (changed) await setActorInventory(this.actor, inv);
  }

  async _renderHTML() {
    const root = document.createElement('div');
    root.className = 'arpg-inventory';

    if (!this.actor) {
      root.textContent = 'No actor selected.';
      return root;
    }

    const inv = getActorInventory(this.actor);
    await this._autoPlace(inv);
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

    // Grid. Cells and items are BOTH explicitly positioned so data-x/y always
    // matches the visible cell (CSS auto-placement used to shift the cells).
    const grid = document.createElement('div');
    grid.className = 'arpginv-grid';
    grid.style.gridTemplateColumns = `repeat(${capacity.cols}, ${CELL_SIZE}px)`;
    grid.style.gridTemplateRows = `repeat(${capacity.rows}, ${CELL_SIZE}px)`;
    grid.dataset.cols = String(capacity.cols);
    grid.dataset.rows = String(capacity.rows);

    for (let y = 0; y < capacity.rows; y++) {
      for (let x = 0; x < capacity.cols; x++) {
        const cell = document.createElement('div');
        cell.className = 'arpginv-cell';
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.style.gridColumn = String(x + 1);
        cell.style.gridRow = String(y + 1);
        grid.appendChild(cell);
      }
    }

    // Items
    for (const item of this.actor.items ?? []) {
      const p = this._placementOf(inv, item.id);
      if (!p) continue;
      const stack = getItemStack(item);

      const el = document.createElement('div');
      el.className = `arpginv-item ${rarityClass(item)}`;
      el.draggable = true;
      el.dataset.itemId = item.id;
      el.style.gridColumn = `${p.x + 1} / span ${p.w}`;
      el.style.gridRow = `${p.y + 1} / span ${p.h}`;
      el.title = item.name;

      if (item.img) {
        const img = document.createElement('img');
        img.className = 'arpginv-item__img';
        img.src = item.img;
        img.alt = item.name;
        el.appendChild(img);
      }

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
        ev.dataTransfer?.setData('text/plain', item.id);
        if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
        el.classList.add('dragging');
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        this.dragItemId = null;
        this.dragRotated = false;
        this._clearDropHighlight(grid);
      });

      grid.appendChild(el);
    }

    // Drag over: highlight the exact target cells using viewport geometry.
    grid.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this._lastMouse = { x: ev.clientX, y: ev.clientY };
      if (!this.dragItemId) return;
      const cell = this._cellFromPoint(grid, ev.clientX, ev.clientY);
      if (!cell) {
        this._clearDropHighlight(grid);
        return;
      }
      const item = this.actor?.items?.get?.(this.dragItemId);
      if (!item) return;
      const gridDims = this._effectiveGrid(item, this.dragRotated);
      const state = this._buildEngineState(inv);
      const working = inv.placements[this.dragItemId]
        ? removeItem(state, this.dragItemId)
        : state;
      const token = {
        id: this.dragItemId,
        grid: gridDims,
        stack: getItemStack(item),
        stackKey: item.name
      };
      const valid = !!placeOrStack(working, token, cell.x, cell.y);
      this._highlightCells(grid, cell.x, cell.y, gridDims, valid);
      this._setDropHighlight(grid, valid);
    });

    grid.addEventListener('drop', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!this.dragItemId) return;
      const cell = this._cellFromPoint(grid, ev.clientX, ev.clientY);
      if (!cell) return;
      const draggedId = this.dragItemId;
      const item = this.actor?.items?.get?.(draggedId);
      if (!item) return;

      const currentInv = getActorInventory(this.actor);
      await this._autoPlace(currentInv);
      const gridDims = this._effectiveGrid(item, this.dragRotated);
      const state = this._buildEngineState(currentInv);
      const working = currentInv.placements[draggedId]
        ? removeItem(state, draggedId)
        : state;
      const token = {
        id: draggedId,
        grid: gridDims,
        stack: getItemStack(item),
        stackKey: item.name
      };
      const res = placeOrStack(working, token, cell.x, cell.y);
      if (!res) {
        ui.notifications?.warn('Cannot place item here');
        this._clearDropHighlight(grid);
        return;
      }

      const newInv = { ...currentInv, placements: { ...res.state.placements } };
      if (!res.consumed && newInv.placements[draggedId]) {
        newInv.placements[draggedId] = normalizePlacement(
          { ...newInv.placements[draggedId], rotated: this.dragRotated },
          gridDims,
          currentInv.capacity.cols,
          currentInv.capacity.rows
        );
      }

      if (res.consumed) {
        const targetItem = this.actor.items.get(res.targetId);
        if (targetItem) {
          const newStack = newInv.placements[res.targetId]?.stack ?? { current: 1, max: 1 };
          await targetItem.setFlag(MODULE_ID, 'stack', {
            current: newStack.current,
            max: newStack.max
          });
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

    // Rotation during drag (R), only for rotatable items.
    if (!this._dragKeyHandler) {
      this._dragKeyHandler = (ev) => {
        if (!this.dragItemId || ev.code !== 'KeyR') return;
        const item = this.actor?.items?.get?.(this.dragItemId);
        if (!item || !getItemGrid(item).rotatable) return;
        this.dragRotated = !this.dragRotated;
        const liveGrid = this.element?.querySelector('.arpginv-grid') as HTMLElement | null;
        if (liveGrid && this._lastMouse) {
          liveGrid.dispatchEvent(new MouseEvent('dragover', {
            clientX: this._lastMouse.x,
            clientY: this._lastMouse.y,
            bubbles: true
          }));
        }
      };
      document.addEventListener('keydown', this._dragKeyHandler);
    }

    root.append(weightBar, grid);
    return root;
  }

  _cellFromPoint(grid: HTMLElement, clientX: number, clientY: number) {
    const cols = Number(grid.dataset.cols) || 0;
    const rows = Number(grid.dataset.rows) || 0;
    const cells = grid.querySelectorAll<HTMLElement>('.arpginv-cell');
    if (!cells.length) return null;

    const first = cells[0].getBoundingClientRect();
    const nextX = cells[1]?.getBoundingClientRect();
    const nextY = cells[cols]?.getBoundingClientRect();
    const stepX = nextX ? nextX.left - first.left : first.width;
    const stepY = nextY ? nextY.top - first.top : first.height;

    return pointToCell({
      left: first.left,
      top: first.top,
      stepX,
      stepY,
      cols,
      rows
    }, clientX, clientY);
  }

  _setDropHighlight(grid: HTMLElement, valid: boolean) {
    grid.classList.toggle('drop-valid', valid);
    grid.classList.toggle('drop-invalid', !valid);
  }

  _clearDropHighlight(grid: HTMLElement) {
    grid.classList.remove('drop-valid', 'drop-invalid');
    this._clearCellHighlight(grid);
  }

  _clearCellHighlight(grid: HTMLElement) {
    grid.querySelectorAll<HTMLElement>('.arpginv-cell').forEach((cell) => {
      cell.classList.remove('drop-ok', 'drop-bad');
      cell.style.background = '';
      cell.style.borderColor = '';
      cell.style.boxShadow = '';
    });
  }

  _highlightCells(grid: HTMLElement, x: number, y: number, dims: any, valid: boolean) {
    this._clearCellHighlight(grid);
    const bg = valid ? 'rgba(76, 175, 80, 0.65)' : 'rgba(244, 67, 54, 0.65)';
    const border = valid ? '#4caf50' : '#f44336';
    grid.querySelectorAll<HTMLElement>('.arpginv-cell').forEach((cell) => {
      const cx = Number(cell.dataset.x);
      const cy = Number(cell.dataset.y);
      if (cx >= x && cx < x + dims.w && cy >= y && cy < y + dims.h) {
        cell.style.background = bg;
        cell.style.borderColor = border;
        cell.style.boxShadow = `inset 0 0 8px ${border}`;
        cell.classList.add(valid ? 'drop-ok' : 'drop-bad');
      }
    });
  }

  _replaceHTML(element: HTMLElement, root: HTMLElement) {
    root.replaceChildren(element);
  }

  async _editItemGrid(item: any) {
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
          callback: async (_event: any, _button: any, dialogEl: any) => {
            const form = dialogEl.querySelector('form');
            const w = Math.max(1, parseInt(form.w.value, 10) || 1);
            const h = Math.max(1, parseInt(form.h.value, 10) || 1);
            const rotatable = form.rotatable.checked;
            await setItemGrid(item, { w, h, rotatable });
            // A resized item may overlap neighbours: reset and auto-place again.
            await clearItemPlacement(this.actor, item.id);
            this.render(true);
          }
        },
        { action: 'cancel', label: 'Cancel' }
      ]
    });
    await dialog.render(true);
  }

  async close(options: any = {}) {
    if (this._dragKeyHandler) {
      document.removeEventListener('keydown', this._dragKeyHandler);
      this._dragKeyHandler = null;
    }
    return super.close(options);
  }
}
