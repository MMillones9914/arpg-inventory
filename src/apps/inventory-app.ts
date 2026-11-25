import { MODULE_ID } from '../constants';
import {
  EQUIPMENT_SLOTS,
  findItemLocation,
  getInventoryZone,
  normalizePlacement,
  removeItemFromInventory,
  zoneUsedCells
} from '../data/grid-model';
import {
  getActorInventory,
  getItemGrid,
  getItemStack,
  setActorInventory
} from '../data/inventory-service';
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

function itemWeight(item: any) {
  const weight = item?.system?.weight?.value ?? item?.system?.weight ?? 0;
  const quantity = item?.system?.quantity ?? 1;
  return (Number(weight) || 0) * (Number(quantity) || 1);
}

function actorWeight(actor: any) {
  let total = 0;
  for (const item of actor?.items ?? []) total += itemWeight(item);
  return total;
}

function zoneWeight(actor: any, zone: any) {
  let total = 0;
  for (const id of Object.keys(zone?.placements ?? {})) {
    const item = actor?.items?.get?.(id);
    if (item) total += itemWeight(item);
  }
  return total;
}

function appendImage(parent: HTMLElement, item: any) {
  if (!item?.img) return;
  const img = document.createElement('img');
  img.className = 'arpginv-item__img';
  img.src = item.img;
  img.alt = item.name;
  parent.appendChild(img);
}

export class InventoryApp extends foundry.applications.api.ApplicationV2 {
  actor: any;
  activeZone = 'main';
  dragItemId: string | null = null;
  dragRotated = false;
  dragSource: any = null;
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
    position: { width: 710, height: 620 }
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

  _normalizePlacement(itemId: string, zone: any) {
    const raw = zone?.placements?.[itemId];
    if (!raw) return null;
    const item = this.actor?.items?.get?.(itemId);
    return normalizePlacement(
      raw,
      item ? getItemGrid(item) : {},
      zone.capacity.cols,
      zone.capacity.rows
    );
  }

  /** Build an engine state for one zone and repair invalid placements in memory. */
  _buildEngineState(zone: any) {
    let state = createGridState(zone.capacity.cols, zone.capacity.rows);
    for (const itemId of Object.keys(zone.placements)) {
      const p = this._normalizePlacement(itemId, zone);
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
        state.placements[itemId].rotated = p.rotated;
      } else {
        zone.placements[itemId] = null;
      }
    }
    return state;
  }

  async _autoPlaceAll(inv: any) {
    const zones = [
      { id: 'main', zone: inv },
      ...inv.containers.map((c: any) => ({ id: c.id, zone: c }))
    ];
    const states = new Map<string, any>();
    for (const z of zones) states.set(z.id, this._buildEngineState(z.zone));

    let changed = false;
    for (const item of this.actor?.items ?? []) {
      if (findItemLocation(inv, item.id)) continue;
      const grid = this._effectiveGrid(item, false);
      const stack = getItemStack(item);
      const token = { id: item.id, grid, stack, stackKey: item.name };
      for (const z of zones) {
        const spot = findFirstAvailable(states.get(z.id), grid, false);
        if (!spot) continue;
        const placed = placeItem(states.get(z.id), token, spot.x, spot.y, false);
        if (!placed) continue;
        z.zone.placements[item.id] = placed.placements[item.id];
        states.set(z.id, placed);
        changed = true;
        break;
      }
    }
    if (changed) await setActorInventory(this.actor, inv);
  }

  async _renderHTML() {
    const root = document.createElement('div');
    root.className = 'arpg-inventory arpg-inventory__root';

    if (!this.actor) {
      root.textContent = 'No actor selected.';
      return root;
    }

    const inv = getActorInventory(this.actor);
    await this._autoPlaceAll(inv);
    let zone = getInventoryZone(inv, this.activeZone);
    if (!zone) {
      this.activeZone = 'main';
      zone = inv;
    }

    // Weight bar (all carried items, strength/manual capacity).
    const weight = actorWeight(this.actor);
    const capacity = inv.capacity;
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
    if (weight > capacity.maxWeight) root.classList.add('arpginv-overweight');

    // Side-by-side layout: equipment (left) + inventory (right).
    const layout = document.createElement('div');
    layout.className = 'arpginv-layout';
    const inventoryPane = document.createElement('div');
    inventoryPane.className = 'arpginv-inventory-pane';
    // Keep pane width tied to the main grid so the weight bar and weapon row
    // stay the same size when switching to smaller container zones.
    const mainCols = Math.max(1, Number(inv.capacity.cols) || 10);
    inventoryPane.style.width = `${mainCols * CELL_SIZE + (mainCols - 1) * 2 + 12}px`;
    const paneTitle = document.createElement('div');
    paneTitle.className = 'arpginv-inventory-pane__title';
    paneTitle.textContent = 'Inventario';
    const weaponBar = document.createElement('div');
    weaponBar.className = 'arpginv-weapon-bar';
    const mainInfo = document.createElement('div');
    mainInfo.className = 'arpginv-weapon-info arpginv-weapon-info--mainhand';
    const offInfo = document.createElement('div');
    offInfo.className = 'arpginv-weapon-info arpginv-weapon-info--offhand';
    const weaponPair = document.createElement('div');
    weaponPair.className = 'arpginv-weapon-pair';

    // Equipment silhouette: real actor-art image + 10 positioned slots.
    // Weapon slots live in the separate bar above the inventory grid.
    const equipment = document.createElement('div');
    equipment.className = 'arpginv-equipment';
    const art = this.actor.img
      || this.actor.prototypeToken?.texture?.src
      || 'icons/svg/mystery-man.svg';
    const portrait = document.createElement('img');
    portrait.className = 'arpginv-equipment__portrait';
    portrait.src = art;
    portrait.alt = '';
    equipment.appendChild(portrait);
    const frame = document.createElement('div');
    frame.className = 'arpginv-equipment__frame';

    for (const slot of EQUIPMENT_SLOTS) {
      const slotEl = document.createElement('div');
      slotEl.className = `arpginv-slot arpginv-slot--${slot.id} arpginv-slot--${slot.side}`;
      slotEl.dataset.slot = slot.id;
      slotEl.title = slot.label;
      const code = document.createElement('span');
      code.className = 'arpginv-slot__code';
      code.textContent = slot.code;
      slotEl.appendChild(code);

      const itemId = inv.equipment[slot.id];
      const item = itemId ? this.actor.items.get(itemId) : null;
      if (item) {
        slotEl.classList.add('has-item', `arpginv-rarity--${rarityClass(item).replace('arpginv-rarity--', '')}`);
        slotEl.draggable = true;
        slotEl.dataset.itemId = item.id;
        slotEl.title = item.name;
        appendImage(slotEl, item);
        slotEl.addEventListener('dragstart', (ev) => {
          this._beginDrag(ev, item.id, { kind: 'equipment', slot: slot.id });
        });
      }
      const labelEl = document.createElement('span');
      labelEl.className = 'arpginv-slot__label';
      labelEl.textContent = slot.label;
      slotEl.appendChild(labelEl);

      slotEl.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
      slotEl.addEventListener('drop', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await this._equipDragged(slot.id);
      });

      if (slot.side === 'weapon') {
        if (slot.id === 'offhand' || slot.id === 'ammo') weaponPair.appendChild(slotEl);
        else weaponBar.appendChild(slotEl);
      } else {
        frame.appendChild(slotEl);
      }
    }
    weaponBar.append(mainInfo, offInfo, weaponPair);
    equipment.appendChild(frame);

    // Zone tabs (main + containers).
    const tabs = document.createElement('div');
    tabs.className = 'arpginv-tabs';
    const zoneDefs = [
      { id: 'main', name: 'Main', zone: inv },
      ...inv.containers.map((c: any) => ({ id: c.id, name: c.name, zone: c }))
    ];
    for (const def of zoneDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'arpginv-tab';
      if (def.id === this.activeZone) btn.classList.add('active');
      btn.dataset.zone = def.id;
      btn.textContent = def.name;
      btn.addEventListener('click', () => {
        this.activeZone = def.id;
        this.render(true);
      });
      btn.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
      btn.addEventListener('drop', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await this._moveDraggedToZone(def.id);
      });
      tabs.appendChild(btn);
    }

    // Zone info: volume (cells) + weight.
    const info = document.createElement('div');
    info.className = 'arpginv-zone-info';
    const usedCells = zoneUsedCells(zone);
    const totalCells = zone.capacity.cols * zone.capacity.rows;
    const zoneLoad = zoneWeight(this.actor, zone);
    info.textContent = `Cells ${usedCells}/${totalCells} · Weight ${zoneLoad.toFixed(1)}/${zone.capacity.maxWeight}`;

    // Active-zone grid. Cells are explicitly positioned so data-x/y always
    // matches the visible cell (CSS auto-placement used to shift them).
    const grid = document.createElement('div');
    grid.className = 'arpginv-grid';
    grid.style.gridTemplateColumns = `repeat(${zone.capacity.cols}, ${CELL_SIZE}px)`;
    grid.style.gridTemplateRows = `repeat(${zone.capacity.rows}, ${CELL_SIZE}px)`;
    grid.dataset.cols = String(zone.capacity.cols);
    grid.dataset.rows = String(zone.capacity.rows);

    for (let y = 0; y < zone.capacity.rows; y++) {
      for (let x = 0; x < zone.capacity.cols; x++) {
        const cell = document.createElement('div');
        cell.className = 'arpginv-cell';
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        cell.style.gridColumn = String(x + 1);
        cell.style.gridRow = String(y + 1);
        grid.appendChild(cell);
      }
    }

    for (const item of this.actor.items ?? []) {
      const p = this._normalizePlacement(item.id, zone);
      if (!p) continue;
      const stack = getItemStack(item);
      const el = document.createElement('div');
      el.className = `arpginv-item ${rarityClass(item)}`;
      el.draggable = true;
      el.dataset.itemId = item.id;
      el.style.gridColumn = `${p.x + 1} / span ${p.w}`;
      el.style.gridRow = `${p.y + 1} / span ${p.h}`;
      el.title = item.name;
      appendImage(el, item);
      if (stack.current > 1) {
        const badge = document.createElement('span');
        badge.className = 'arpginv-item__stack';
        badge.textContent = `x${stack.current}`;
        el.appendChild(badge);
      }
      const location = findItemLocation(inv, item.id);
      el.addEventListener('dragstart', (ev) => {
        this._beginDrag(ev, item.id, location ?? { kind: 'main', zoneId: 'main' });
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
      const item = this.actor?.items?.get?.(this.dragItemId);
      if (!cell || !item) {
        this._clearDropHighlight(grid);
        return;
      }
      const gridDims = this._effectiveGrid(item, this.dragRotated);
      const state = this._buildEngineState(zone);
      const working = zone.placements[this.dragItemId]
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
      const cell = this._cellFromPoint(grid, ev.clientX, ev.clientY);
      if (!cell) return;
      await this._placeDraggedInZone(this.activeZone, cell.x, cell.y);
    });

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

    inventoryPane.append(paneTitle, weaponBar, weightBar, tabs, info, grid);
    layout.append(equipment, inventoryPane);
    root.append(layout);
    return root;
  }

  _beginDrag(ev: DragEvent, itemId: string, source: any) {
    this.dragItemId = itemId;
    this.dragRotated = false;
    this.dragSource = source;
    ev.dataTransfer?.setData('text/plain', itemId);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
    const target = ev.currentTarget as HTMLElement | null;
    target?.classList.add('dragging');
    target?.addEventListener('dragend', () => this._endDrag(), { once: true });
  }

  _endDrag() {
    this.dragItemId = null;
    this.dragRotated = false;
    this.dragSource = null;
    const grid = this.element?.querySelector('.arpginv-grid') as HTMLElement | null;
    if (grid) this._clearDropHighlight(grid);
    this.element?.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
  }

  async _placeDraggedInZone(zoneId: string, x: number, y: number) {
    const draggedId = this.dragItemId;
    if (!draggedId) return false;
    const item = this.actor?.items?.get?.(draggedId);
    if (!item) return false;

    const inv = getActorInventory(this.actor);
    removeItemFromInventory(inv, draggedId);
    const zone = getInventoryZone(inv, zoneId);
    if (!zone) return false;

    const gridDims = this._effectiveGrid(item, this.dragRotated);
    const state = this._buildEngineState(zone);
    const token = { id: draggedId, grid: gridDims, stack: getItemStack(item), stackKey: item.name };
    const res = placeOrStack(state, token, x, y);
    if (!res) {
      ui.notifications?.warn('Cannot place item here');
      return false;
    }

    const placements = res.state.placements;
    if (!res.consumed && placements[draggedId]) {
      placements[draggedId] = normalizePlacement(
        { ...placements[draggedId], rotated: this.dragRotated },
        gridDims,
        zone.capacity.cols,
        zone.capacity.rows
      );
    }
    if (zoneId === 'main') inv.placements = placements;
    else zone.placements = placements;

    if (res.consumed) {
      await this._consumeStackedItem(inv, res.targetId, placements);
      await setActorInventory(this.actor, inv);
      await this.actor.deleteEmbeddedDocuments('Item', [draggedId]);
    } else {
      await setActorInventory(this.actor, inv);
    }
    this._endDrag();
    this.render(true);
    return true;
  }

  async _equipDragged(slotId: string) {
    const draggedId = this.dragItemId;
    if (!draggedId || !this.actor?.items?.get?.(draggedId)) return false;
    const inv = getActorInventory(this.actor);
    removeItemFromInventory(inv, draggedId);
    inv.equipment[slotId] = draggedId;
    await setActorInventory(this.actor, inv);
    this._endDrag();
    this.render(true);
    return true;
  }

  /** Move the dragged item to the first free cell of a zone (drop on tab). */
  async _moveDraggedToZone(zoneId: string) {
    const draggedId = this.dragItemId;
    if (!draggedId) return false;
    const item = this.actor?.items?.get?.(draggedId);
    if (!item) return false;

    const inv = getActorInventory(this.actor);
    removeItemFromInventory(inv, draggedId);
    const zone = getInventoryZone(inv, zoneId);
    if (!zone) return false;
    const grid = this._effectiveGrid(item, false);
    const state = this._buildEngineState(zone);
    const spot = findFirstAvailable(state, grid, false);
    if (!spot) {
      ui.notifications?.warn('No free space in this container');
      return false;
    }
    const token = { id: draggedId, grid, stack: getItemStack(item), stackKey: item.name };
    const placed = placeItem(state, token, spot.x, spot.y, false);
    if (!placed) return false;
    if (zoneId === 'main') inv.placements = placed.placements;
    else zone.placements = placed.placements;
    await setActorInventory(this.actor, inv);
    this._endDrag();
    this.render(true);
    return true;
  }

  async _consumeStackedItem(inv: any, targetId: string, placements: any) {
    const targetItem = this.actor.items.get(targetId);
    if (!targetItem) return;
    const stack = placements[targetId]?.stack ?? { current: 1, max: 1 };
    await targetItem.setFlag(MODULE_ID, 'stack', { current: stack.current, max: stack.max });
    await targetItem.update({ 'system.quantity': stack.current });
  }

  _cellFromPoint(grid: HTMLElement, clientX: number, clientY: number) {
    const cols = Number(grid.dataset.cols) || 0;
    const rows = Number(grid.dataset.rows) || 0;
    const cells = grid.querySelectorAll<HTMLElement>('.arpginv-cell');
    if (!cells.length) return null;
    const first = cells[0].getBoundingClientRect();
    const nextX = cells[1]?.getBoundingClientRect();
    const nextY = cells[cols]?.getBoundingClientRect();
    return pointToCell({
      left: first.left,
      top: first.top,
      stepX: nextX ? nextX.left - first.left : first.width,
      stepY: nextY ? nextY.top - first.top : first.height,
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

  async close(options: any = {}) {
    if (this._dragKeyHandler) {
      document.removeEventListener('keydown', this._dragKeyHandler);
      this._dragKeyHandler = null;
    }
    this._endDrag();
    return super.close(options);
  }
}
