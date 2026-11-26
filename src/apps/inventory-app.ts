import { MODULE_ID } from '../constants';
import {
  EQUIPMENT_SLOTS,
  findItemLocation,
  getInventoryZone,
  MAIN_GRID_COLS,
  normalizePlacement,
  removeItemFromInventory,
  zoneUsedCells
} from '../data/grid-model';
import {
  getActorInventory,
  getItemGrid,
  getItemStack,
  isItemStackable,
  itemContainerId,
  setActorInventory
} from '../data/inventory-service';
import {
  attunementState,
  equippedInfo,
  infoDescription,
  isTwoHandedWeapon,
  syncAttackMode,
  weaponHands
} from '../data/dnd5e';
import { canEditInventory } from '../data/permissions';
import {
  EMPTY_FILTERS,
  SHORTCUTS,
  filterOptions,
  itemType,
  itemWeight,
  matchingItemIds,
  tooltipLines,
  type ItemFilters
} from '../data/ux';
import { containerPlaceholder, slotPlaceholder, zonePlaceholder } from '../data/placeholders';
import { isContainerItem } from '../data/containers';
import { isInventoryItem } from '../data/inventory-items';
import { playInventorySound } from '../utils/sound';
import { warn } from '../utils/logger';
import { pointToCell } from '../engine/grid-geometry';
import {
  createGridState,
  itemIdAt,
  placeItem,
  removeItem,
  placeOrStack,
  findFirstAvailable,
  swapItems
} from '../engine/grid-engine';

const CELL_SIZE = 34;
const TWO_HANDS_ICON = 'icons/skills/melee/hand-grip-staff-blue.webp';

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
    if (isInventoryItem(item)) total += itemWeight(item);
  }
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

function appendAttunement(parent: HTMLElement, item: any) {
  const state = attunementState(item);
  if (state === 'none') return;
  const badge = document.createElement('span');
  badge.className = `arpginv-attunement arpginv-attunement--${state}`;
  badge.textContent = state === 'attuned' ? 'A' : 'R';
  parent.appendChild(badge);
}

function appendStackBadge(parent: HTMLElement, item: any) {
  if (!isItemStackable(item)) return;
  const badge = document.createElement('span');
  badge.className = 'arpginv-item__stack';
  badge.textContent = `x${getItemStack(item).current}`;
  parent.appendChild(badge);
}

function itemTooltip(item: any, fallback = '') {
  const lines = tooltipLines(item);
  return lines.length ? lines.map((line) => `${line.label}: ${line.value}`).join(' · ') : fallback;
}

export class InventoryApp extends foundry.applications.api.ApplicationV2 {
  actor: any;
  activeZone = 'main';
  weaponInfoSlot = 'mainhand';
  dragItemId: string | null = null;
  dragTabId: string | null = null;
  dragRotated = false;
  dragSource: any = null;
  filters: ItemFilters = { ...EMPTY_FILTERS };
  _lastMouse: { x: number; y: number } | null = null;
  _dragKeyHandler: ((ev: KeyboardEvent) => void) | null = null;
  _uiKeyHandler: ((ev: KeyboardEvent) => void) | null = null;
  _tooltipEl: HTMLElement | null = null;

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

  get editable() {
    return canEditInventory(game?.user, this.actor);
  }

  _localize(key: string, fallback: string) {
    try {
      return game.i18n?.localize?.(key) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  _themeClass() {
    const theme = game?.settings?.get?.(MODULE_ID, 'theme');
    return `arpginv-theme--${['light', 'dark', 'highContrast'].includes(theme) ? theme : 'light'}`;
  }

  /** Save with revision checking; reload on conflict instead of overwriting. */
  async _saveInventory(inv: any): Promise<boolean> {
    const result = await setActorInventory(this.actor, inv);
    if (result.applied) return true;
    if (result.conflict) {
      ui?.notifications?.warn?.('Inventory changed elsewhere; reloaded your copy');
      this.render(true);
    }
    return false;
  }

  /** Zone that owns an item according to dnd5e's real container field. */
  _itemZoneId(item: any, inv: any) {
    const owner = itemContainerId(item);
    if (!owner || owner === String(item?.id)) return 'main';
    const container = inv?.containers?.find(
      (zone: any) => String(zone.id) === owner && zone.available !== false
    );
    return container ? owner : 'main';
  }

  /** dnd5e fields supported by this Item document. */
  _supportsItemField(item: any, field: 'container' | 'equipped') {
    return item?.system?.[field] !== undefined || !!item?.system?.schema?.fields?.[field];
  }

  /** Persist a grid move on the Foundry item: unequipped and in the right zone. */
  async _syncItemPlacement(item: any, zoneId: string) {
    if (!item || !this.editable) return;
    const changes: any = {};
    if (this._supportsItemField(item, 'equipped') && item.system.equipped === true) {
      changes['system.equipped'] = false;
    }
    if (this._supportsItemField(item, 'container')) {
      const containerId = zoneId === 'main' ? null : zoneId;
      if (itemContainerId(item) !== containerId) changes['system.container'] = containerId;
    }
    if (Object.keys(changes).length) await item.update(changes);
  }

  /** Persist an equipment-slot drop as a real dnd5e equipped item. */
  async _syncItemEquipped(item: any, equipped: boolean) {
    if (!item || !this.editable) return;
    if (!this._supportsItemField(item, 'equipped')) return;
    const changes: any = { 'system.equipped': equipped };
    if (equipped && this._supportsItemField(item, 'container')) changes['system.container'] = null;
    if (equipped) await syncAttackMode(item, item.getFlag?.(MODULE_ID, 'twoHanded') === true);
    if (item.system.equipped === equipped && !changes['system.container']) return;
    await item.update(changes);
  }

  /** Does this weapon need both hands (including a versatile weapon set to 2H)? */
  _usesTwoHands(item: any) {
    if (!item || weaponHands(item) === null) return false;
    return isTwoHandedWeapon(item, item.getFlag?.(MODULE_ID, 'twoHanded') === true);
  }

  /** Slots to fill when an item is equipped through our UI. */
  _equipSlotsFor(item: any, slotId: string) {
    if (slotId === 'ammo') return ['ammo'];
    if (this._usesTwoHands(item)) return ['mainhand', 'offhand'];
    return [slotId];
  }

  /**
   * Assign equipment slots in memory. Returns items that lost a slot so the
   * caller can unequip them in Foundry after the flag was saved.
   */
  _assignEquipmentSlots(inv: any, itemId: string, slots: string[]) {
    const displaced = new Set<string>();
    for (const slot of slots) {
      const previous = inv.equipment?.[slot];
      if (previous && String(previous) !== String(itemId)) displaced.add(String(previous));
    }
    for (const slot of EQUIPMENT_SLOTS) {
      if (slots.includes(slot.id)) continue;
      if (String(inv.equipment?.[slot.id] ?? '') === String(itemId)) inv.equipment[slot.id] = null;
    }
    for (const slot of slots) inv.equipment[slot] = itemId;
    for (const id of displaced) {
      for (const slot of EQUIPMENT_SLOTS) {
        if (String(inv.equipment?.[slot.id] ?? '') === id) inv.equipment[slot.id] = null;
      }
      inv.placements[id] ??= null;
    }
    return [...displaced];
  }

  /** Switch a versatile weapon between one and two hands. */
  async _toggleTwoHanded(itemId: string) {
    if (!this.editable) return false;
    const item = this.actor?.items?.get?.(itemId);
    if (!item || weaponHands(item) !== 'versatile') return false;
    const inv = getActorInventory(this.actor);
    const isMain = String(inv.equipment?.mainhand ?? '') === String(itemId);
    const isOff = String(inv.equipment?.offhand ?? '') === String(itemId);
    if (!isMain && !isOff) return false;
    const next = item.getFlag?.(MODULE_ID, 'twoHanded') !== true;
    await item.setFlag(MODULE_ID, 'twoHanded', next);
    // Foundry's own attack mode follows the holding mode, so attack and damage
    // rolls use the versatile die without asking the player again.
    await syncAttackMode(item, next);
    const slots = next ? ['mainhand', 'offhand'] : ['mainhand'];
    const displaced = this._assignEquipmentSlots(inv, itemId, slots);
    if (!(await this._saveInventory(inv))) return false;
    for (const id of displaced) {
      await this._syncItemEquipped(this.actor?.items?.get?.(id), false);
    }
    this.render(true);
    return true;
  }

  _configLabel(
    path: 'itemProperties' | 'weaponMasteries' | 'damageTypes' | 'itemRarity',
    key: string
  ) {
    try {
      const config = (game as any)?.dnd5e?.config;
      const entry = config?.[path]?.[key];
      if (typeof entry === 'string' && entry) return game.i18n?.localize?.(entry) || entry;
      if (entry?.label) return game.i18n?.localize?.(entry.label) || entry.label;
    } catch (e) {
      // Foundry/CONFIG may be absent in tests.
    }
    return key;
  }

  /** Short localized unit (ft, m, mi, km) used in range labels. */
  _unitLabel(unit: string) {
    const paths: Record<string, string> = {
      ft: 'DND5E.UNITS.DISTANCE.Foot.Abbreviation',
      m: 'DND5E.UNITS.DISTANCE.Meter.Abbreviation',
      mi: 'DND5E.UNITS.DISTANCE.Mile.Abbreviation',
      km: 'DND5E.UNITS.DISTANCE.Kilometer.Abbreviation'
    };
    const path = paths[unit];
    if (path) {
      try {
        return game.i18n?.localize?.(path) || unit;
      } catch (e) {
        return unit;
      }
    }
    return unit;
  }

  /** Replace a raw unit suffix with its translated abbreviation when possible. */
  _distanceLabel(label: string) {
    return label.replace(/\b(ft|m|mi|km)\b$/, (unit) => this._unitLabel(unit));
  }

  /** One labelled line in the equipment info panel. */
  _infoRow(parent: HTMLElement, label: string, value: string, extraClass = '', description = '') {
    const row = document.createElement('div');
    row.className = `arpginv-weapon-info__row ${extraClass}`.trim();
    const key = document.createElement('span');
    key.className = 'arpginv-weapon-info__key';
    key.textContent = label;
    const text = document.createElement('span');
    text.className = 'arpginv-weapon-info__value';
    text.textContent = value;
    text.title = description || value;
    row.append(key, text);
    parent.appendChild(row);
  }

  /** Labelled list; each entry carries its own hover description. */
  _infoList(
    parent: HTMLElement,
    label: string,
    entries: { label: string; description: string }[],
    extraClass = ''
  ) {
    const row = document.createElement('div');
    row.className = `arpginv-weapon-info__row arpginv-weapon-info__row--list ${extraClass}`.trim();
    const key = document.createElement('span');
    key.className = 'arpginv-weapon-info__key';
    key.textContent = label;
    const list = document.createElement('ul');
    list.className = 'arpginv-weapon-info__list';
    for (const entry of entries) {
      const item = document.createElement('li');
      item.textContent = entry.label;
      item.title = entry.description;
      list.appendChild(item);
    }
    row.append(key, list);
    parent.appendChild(row);
  }

  /** Rebuild the single compact info panel for the selected weapon slot. */
  _updateWeaponInfo(inv: any = getActorInventory(this.actor), root?: HTMLElement) {
    root ??= this.element as HTMLElement | undefined;
    const panel = root?.querySelector('.arpginv-weapon-info') as HTMLElement | null;
    if (!panel) return;
    const slotId = this.weaponInfoSlot;
    const itemId = inv?.equipment?.[slotId];
    const item = itemId ? this.actor?.items?.get?.(itemId) : null;
    root?.querySelectorAll('.arpginv-weapon-bar .arpginv-slot[data-slot]')
      .forEach((el) => (el as HTMLElement).classList.toggle(
        'arpginv-weapon-slot--active',
        (el as HTMLElement).dataset.slot === slotId
      ));

    const info = equippedInfo(item, this.actor);
    panel.replaceChildren();
    panel.className = `arpginv-weapon-info${item ? ` ${rarityClass(item)}` : ''}`;
    panel.title = item ? itemTooltip(item, info?.name ?? '') : '';
    if (!info) {
      panel.textContent = '—';
      return;
    }

    const name = document.createElement('div');
    name.className = 'arpginv-weapon-info__name';
    name.textContent = info.name;
    name.title = info.name;
    panel.appendChild(name);

    // Ordered as: identity, attack, damage, defence, traits, requirements.
    if (info.rarity) {
      this._infoRow(panel, 'Rareza', this._configLabel('itemRarity', info.rarity));
    }

    const twoHanded = this._usesTwoHands(item);
    const damage = twoHanded && info.altDamage ? info.altDamage : info.damage;
    if (damage) {
      const damageValue = info.damageModifiers ? `${damage} ${info.damageModifiers}` : damage;
      this._infoRow(
        panel,
        twoHanded && info.altDamage ? 'Daño (2 manos)' : 'Daño',
        damageValue,
        'arpginv-weapon-info__damage',
        infoDescription(twoHanded && info.altDamage ? 'versatileDamage' : 'damage', 'base')
      );
    }
    if (info.damageTypes.length) {
      this._infoList(panel, 'Tipo de daño', info.damageTypes.map((key) => ({
        label: this._configLabel('damageTypes', key),
        description: infoDescription('damageType', key)
      })), 'arpginv-weapon-info__props');
    }
    if (info.range) this._infoRow(panel, 'Alcance', this._distanceLabel(info.range));
    if (info.mastery) {
      this._infoRow(
        panel,
        'Maestría',
        this._configLabel('weaponMasteries', info.mastery),
        `arpginv-weapon-info__mastery${info.hasMastery ? ' arpginv-weapon-info__mastery--active' : ''}`,
        infoDescription('mastery', info.mastery)
      );
    }
    if (info.attunement !== 'none') {
      this._infoRow(panel, 'Sintonía', info.attunement === 'attuned' ? 'Sintonizado' : 'Requerida');
    }
    if (info.properties.length) {
      this._infoList(panel, 'Propiedades', info.properties.map((key) => {
        const label = this._configLabel('itemProperties', key);
        return {
          label: key === 'thr' && info.throwRange
            ? `${label} ${this._distanceLabel(info.throwRange)}`
            : label,
          description: infoDescription('property', key)
        };
      }), 'arpginv-weapon-info__props');
    }
  }

  /** Apply a merged stack to its item after the inventory flag was saved. */
  async _persistStack(targetId: string, placements: any) {
    if (!this.editable) return;
    const targetItem = this.actor.items.get(targetId);
    if (!targetItem) return;
    const stack = placements[targetId]?.stack ?? { current: 1, max: 1 };
    await targetItem.setFlag(MODULE_ID, 'stack', { current: stack.current, max: stack.max });
    await targetItem.update({ 'system.quantity': stack.current });
  }

  /**
   * Every configured zone is exposed so empty placeholders stay visible, but
   * only zones backed by an actor item are marked available.
   */
  _zoneDefs(inv: any = getActorInventory(this.actor)) {
    if (!inv) return [];
    const defs = [{
      id: 'main',
      name: this._localize('ARPGINV.App.ZoneMain', 'Main'),
      zone: inv,
      available: true,
      icon: zonePlaceholder('main')
    }];
    for (const container of inv.containers ?? []) {
      const item = this.actor?.items?.get?.(container.id);
      const available = container.available !== false && !!item;
      defs.push({
        id: container.id,
        name: container.name,
        zone: container,
        available,
        icon: item?.img || containerPlaceholder(container.name)
      });
    }
    return defs;
  }

  _availableZoneDefs(inv?: any) {
    return this._zoneDefs(inv).filter((zone) => zone.available);
  }

  _warnUnavailableContainer(zone: any) {
    const template = this._localize(
      'ARPGINV.App.NeedContainer',
      'Necesitas un contenedor para usar {name}'
    );
    ui.notifications?.warn?.(template.replace('{name}', zone?.name ?? ''));
    playInventorySound('invalid');
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

  /** Count containers cap a stack at their declared capacity (20 arrows, etc.). */
  _zoneStack(item: any, zone: any) {
    const stack = getItemStack(item);
    const maxCount = Number(zone?.capacity?.maxCount);
    if (zone?.capacity?.mode !== 'count' || !Number.isFinite(maxCount) || maxCount < 1) return stack;
    return { current: Math.min(stack.current, maxCount), max: Math.min(stack.max, maxCount) };
  }

  /** Exchange positions when a bag is dropped onto another bag in the same zone. */
  _bagSwap(state: any, zone: any, draggedId: string, targetId: string, grid: any, stack: any) {
    if (!targetId || targetId === draggedId || !zone?.placements?.[draggedId]) return null;
    const dragged = this.actor?.items?.get?.(draggedId);
    const target = this.actor?.items?.get?.(targetId);
    if (!isContainerItem(dragged) || !isContainerItem(target)) return null;
    return swapItems(state, draggedId, targetId, {
      grid,
      rotated: this.dragRotated,
      stack,
      stackKey: dragged?.name ?? draggedId
    });
  }

  /** Reorder container tabs by dragging one tab onto another. */
  async _reorderContainerTab(draggedId: string, targetId: string) {
    if (!this.editable || !draggedId || draggedId === targetId) return false;
    if (draggedId === 'main' || targetId === 'main') return false;
    const inv = getActorInventory(this.actor);
    const ids = (inv.containers ?? []).map((c: any) => String(c.id));
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return false;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    inv.containerOrder = ids;
    if (!(await this._saveInventory(inv))) return false;
    playInventorySound('place');
    this.render(true);
    return true;
  }

  async _autoPlaceAll(inv: any) {
    if (!this.editable) return;
    const items = [...(this.actor?.items ?? [])].filter(isInventoryItem);
    const zones = this._availableZoneDefs(inv).map((def) => ({ id: def.id, zone: def.zone }));
    const states = new Map<string, any>();
    for (const z of zones) states.set(z.id, this._buildEngineState(z.zone));

    let changed = false;
    // Items left in a container the actor no longer owns are unreachable;
    // release them so the normal placement pass returns them to a usable zone.
    for (const container of inv.containers ?? []) {
      if (container.available !== false) continue;
      for (const itemId of Object.keys(container.placements ?? {})) {
        if (container.placements[itemId]) {
          container.placements[itemId] = null;
          changed = true;
        }
      }
    }
    for (const item of items) {
      if (findItemLocation(inv, item.id)) continue;
      const requiredZone = this._itemZoneId(item, inv);
      const grid = this._effectiveGrid(item, false);
      const stack = getItemStack(item);
      const token = { id: item.id, grid, stack, stackKey: item.name };
      for (const z of zones) {
        // Never auto-place an item outside the container Foundry says holds it.
        if (z.id !== requiredZone) continue;
        if (z.zone.capacity.mode === 'count' && stack.current > z.zone.capacity.maxCount) continue;
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
    if (changed) await this._saveInventory(inv);
  }

  // ---- M7: filters, tooltips, shortcuts ------------------------------------

  _hasActiveFilters() {
    return !!(this.filters.query || this.filters.type || this.filters.rarity);
  }

  _applyFilters(root?: HTMLElement) {
    const scope: ParentNode = root ?? this.element ?? document;
    const active = this._hasActiveFilters();
    const matches = new Set(matchingItemIds(
      [...(this.actor?.items ?? [])].filter(isInventoryItem),
      this.filters
    ));
    let total = 0;
    let shown = 0;
    scope.querySelectorAll<HTMLElement>('.arpginv-item, .arpginv-slot[data-item-id]').forEach((el) => {
      const ok = matches.has(el.dataset.itemId ?? '');
      el.classList.toggle('arpginv-filtered-out', active && !ok);
      el.classList.toggle('arpginv-filtered-match', active && ok);
      el.tabIndex = ok ? 0 : -1;
      if (el.classList.contains('arpginv-item')) {
        total += 1;
        if (ok) shown += 1;
      }
    });
    const count = scope.querySelector<HTMLElement>('.arpginv-filter-count');
    if (count) {
      count.textContent = `${this._localize('ARPGINV.App.Results', 'Results')} ${shown}/${total}`;
    }
  }

  _buildHelpPanel() {
    const panel = document.createElement('div');
    panel.className = 'arpginv-help';
    panel.hidden = true;
    panel.setAttribute('role', 'note');
    for (const shortcut of SHORTCUTS) {
      const row = document.createElement('div');
      row.className = 'arpginv-help__row';
      const key = document.createElement('kbd');
      key.textContent = shortcut.keys;
      const action = document.createElement('span');
      action.textContent = shortcut.action;
      row.append(key, action);
      panel.appendChild(row);
    }
    return panel;
  }

  _buildFilterBar() {
    const wrapper = document.createElement('div');
    wrapper.className = 'arpginv-ux';

    const bar = document.createElement('div');
    bar.className = 'arpginv-filterbar';

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'arpginv-filter-search';
    search.placeholder = this._localize('ARPGINV.App.Search', 'Search items...');
    search.setAttribute('aria-label', search.placeholder);
    search.value = this.filters.query;
    search.addEventListener('input', () => {
      this.filters.query = search.value;
      this._applyFilters();
    });

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'arpginv-filter-toggle';
    toggle.textContent = this._localize('ARPGINV.App.Filters', 'Filters');
    toggle.setAttribute('aria-expanded', 'false');

    const count = document.createElement('span');
    count.className = 'arpginv-filter-count';

    const helpBtn = document.createElement('button');
    helpBtn.type = 'button';
    helpBtn.className = 'arpginv-help-toggle';
    helpBtn.textContent = '?';
    helpBtn.title = this._localize('ARPGINV.App.Help', 'Shortcuts');
    helpBtn.setAttribute('aria-label', helpBtn.title);
    helpBtn.setAttribute('aria-expanded', 'false');

    const panel = document.createElement('div');
    panel.className = 'arpginv-filterpanel';
    panel.hidden = true;

    const items = [...(this.actor?.items ?? [])].filter(isInventoryItem);
    const makeSelect = (
      className: string,
      allLabel: string,
      options: Array<{ value: string; label: string }>,
      value: string,
      onChange: (next: string) => void
    ) => {
      const select = document.createElement('select');
      select.className = `arpginv-filter-select ${className}`;
      select.setAttribute('aria-label', allLabel);
      const all = document.createElement('option');
      all.value = '';
      all.textContent = allLabel;
      select.appendChild(all);
      for (const option of options) {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        select.appendChild(opt);
      }
      select.value = value;
      select.addEventListener('change', () => onChange(select.value));
      return select;
    };

    const asOptions = (values: string[]) => values.map((value) => ({ value, label: value }));
    const typeSelect = makeSelect(
      'arpginv-filter-type',
      this._localize('ARPGINV.App.AllTypes', 'All types'),
      asOptions(filterOptions(items, 'type')),
      this.filters.type,
      (next) => { this.filters.type = next; this._applyFilters(); }
    );
    const raritySelect = makeSelect(
      'arpginv-filter-rarity',
      this._localize('ARPGINV.App.AllRarities', 'All rarities'),
      asOptions(filterOptions(items, 'rarity')),
      this.filters.rarity,
      (next) => { this.filters.rarity = next; this._applyFilters(); }
    );
    const zoneSelect = makeSelect(
      'arpginv-filter-zone',
      this._localize('ARPGINV.App.AllZones', 'All zones'),
      this._availableZoneDefs().map((zone) => ({ value: zone.id, label: zone.name })),
      this.activeZone,
      (next) => this._switchZone(next || 'main')
    );
    panel.append(typeSelect, raritySelect, zoneSelect);

    const help = this._buildHelpPanel();
    toggle.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
    });
    helpBtn.addEventListener('click', () => {
      help.hidden = !help.hidden;
      helpBtn.setAttribute('aria-expanded', String(!help.hidden));
    });

    bar.append(search, toggle, count, helpBtn);
    wrapper.append(bar, panel, help);
    return wrapper;
  }

  _showTooltip(target: HTMLElement) {
    const itemId = target.dataset.itemId;
    const item = itemId ? this.actor?.items?.get?.(itemId) : null;
    const lines = tooltipLines(item);
    if (!lines.length) return;
    let tip = this._tooltipEl;
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'arpginv-tooltip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
      this._tooltipEl = tip;
    }
    tip.replaceChildren(...lines.map((line) => {
      const row = document.createElement('div');
      row.className = 'arpginv-tooltip__row';
      const label = document.createElement('span');
      label.className = 'arpginv-tooltip__label';
      label.textContent = line.label;
      const value = document.createElement('span');
      value.textContent = line.value;
      if (line.rarity) value.className = `arpginv-tooltip__rarity arpginv-tooltip__rarity--${line.rarity}`;
      row.append(label, value);
      return row;
    }));
    tip.classList.add('visible');
    const rect = target.getBoundingClientRect();
    const left = Math.min(window.innerWidth - tip.offsetWidth - 8, rect.right + 8);
    const top = Math.min(window.innerHeight - tip.offsetHeight - 8, rect.top);
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${Math.max(8, top)}px`;
  }

  _hideTooltip() {
    this._tooltipEl?.classList.remove('visible');
  }

  /** Double-click opens the real Foundry item sheet. */
  async _openItemSheet(itemId?: string) {
    if (!itemId) return;
    const item = this.actor?.items?.get?.(itemId);
    if (!item) return;
    this._hideTooltip();
    try {
      item.sheet?.render?.(true);
    } catch (e) {
      warn('Could not open item sheet', e);
    }
  }

  _switchZone(zoneId: string) {
    const def = this._zoneDefs().find((zone) => zone.id === zoneId);
    if (!def) return;
    if (!def.available) {
      this._warnUnavailableContainer(def);
      return;
    }
    this.activeZone = zoneId;
    this.render(true);
  }

  async _activateFocused() {
    const active = document.activeElement as HTMLElement | null;
    const itemId = active?.dataset?.itemId;
    if (!itemId) return;
    if (active?.classList.contains('arpginv-slot')) await this._unequipItem(itemId);
    else await this._moveItemToZone(itemId, this.activeZone);
  }

  _registerUiKeyHandler() {
    if (this._uiKeyHandler) return;
    this._uiKeyHandler = (ev: KeyboardEvent) => {
      if (!this.rendered) return;
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT'
        || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        if (ev.code === 'Escape') target.blur();
        return;
      }
      if (ev.code === 'Escape') {
        ev.preventDefault();
        this.close();
        return;
      }
      if (/^Digit[123]$/.test(ev.code)) {
        const zone = this._zoneDefs()[Number(ev.code.slice(-1)) - 1];
        if (zone) {
          ev.preventDefault();
          this._switchZone(zone.id);
        }
        return;
      }
      if (ev.code === 'Enter') {
        if ((target as HTMLElement | null)?.dataset?.itemId) {
          ev.preventDefault();
          this._activateFocused();
        }
      }
    };
    document.addEventListener('keydown', this._uiKeyHandler);
  }

  async _unequipItem(itemId: string) {
    if (!this.editable) return false;
    const item = this.actor?.items?.get?.(itemId);
    if (!item) return false;
    const inv = getActorInventory(this.actor);
    for (const slotId of Object.keys(inv.equipment ?? {})) {
      if (inv.equipment[slotId] === itemId) inv.equipment[slotId] = null;
    }
    const state = this._buildEngineState(inv);
    const grid = this._effectiveGrid(item, false);
    const spot = findFirstAvailable(state, grid, false);
    if (!spot) {
      ui.notifications?.warn('No free space in the main inventory');
      playInventorySound('invalid');
      return false;
    }
    const token = { id: itemId, grid, stack: getItemStack(item), stackKey: item.name };
    const placed = placeItem(state, token, spot.x, spot.y, false);
    if (!placed) return false;
    inv.placements = placed.placements;
    if (!(await this._saveInventory(inv))) return false;
    await this._syncItemPlacement(item, 'main');
    playInventorySound('place');
    this.render(true);
    return true;
  }

  async _renderHTML() {
    const root = document.createElement('div');
    root.className = 'arpg-inventory arpg-inventory__root';
    root.classList.add(this._themeClass());

    if (!this.actor) {
      root.textContent = 'No actor selected.';
      return root;
    }

    if (!this.editable) {
      const notice = document.createElement('div');
      notice.className = 'arpginv-readonly';
      notice.textContent = 'Solo lectura: no tienes permiso para editar este inventario.';
      root.appendChild(notice);
    }

    const inv = getActorInventory(this.actor);
    await this._autoPlaceAll(inv);
    const zoneDefs = this._zoneDefs(inv);
    if (!zoneDefs.some((def) => def.id === this.activeZone && def.available)) this.activeZone = 'main';
    const zone = getInventoryZone(inv, this.activeZone) ?? inv;

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
    // Fixed width for every actor: rows may grow, the panel never does.
    // Container zones are capped to the same column count by the model.
    const paneWidth = MAIN_GRID_COLS * CELL_SIZE + (MAIN_GRID_COLS - 1) * 2 + 12;
    inventoryPane.style.width = `${paneWidth}px`;
    const weaponBar = document.createElement('div');
    weaponBar.className = 'arpginv-weapon-bar';
    // One shared info panel sits between mainhand and offhand. Clicking either
    // slot (or ammo) switches which item it describes.
    const weaponInfo = document.createElement('div');
    weaponInfo.className = 'arpginv-weapon-info';
    const weaponPair = document.createElement('div');
    weaponPair.className = 'arpginv-weapon-pair';

    // Equipment silhouette: real actor-art image + 11 positioned slots.
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
      slotEl.tabIndex = 0;
      slotEl.setAttribute('role', 'button');
      slotEl.setAttribute('aria-label', slot.label);

      const itemId = inv.equipment[slot.id];
      const item = itemId ? this.actor.items.get(itemId) : null;
      if (item) {
        slotEl.classList.add('has-item', `arpginv-rarity--${rarityClass(item).replace('arpginv-rarity--', '')}`);
        slotEl.draggable = this.editable;
        slotEl.dataset.itemId = item.id;
        slotEl.setAttribute('aria-label', itemTooltip(item, slot.label));
        appendImage(slotEl, item);
        appendAttunement(slotEl, item);
        appendStackBadge(slotEl, item);

        // A two-handed weapon appears in both hands. The offhand copy is a
        // muted mirror: same image, greyed out, with the real weapon in main.
        const mirror = slot.id === 'offhand'
          && String(inv.equipment?.mainhand ?? '') === String(item.id)
          && this._usesTwoHands(item);
        if (mirror) {
          slotEl.classList.add('arpginv-slot--mirror-hand');
          slotEl.setAttribute('aria-label', `${itemTooltip(item, slot.label)} · 2 manos`);
        }

        // Hands toggle lives on the equipped image, bottom-right corner.
        if (slot.side === 'weapon' && this.editable && weaponHands(item) === 'versatile') {
          const primary = slot.id === 'mainhand'
            || (slot.id === 'offhand' && String(inv.equipment?.mainhand ?? '') !== String(item.id));
          if (primary) {
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'arpginv-slot__hands-toggle';
            toggle.draggable = false;
            toggle.title = this._usesTwoHands(item) ? 'Volver a una mano' : 'Usar a dos manos';
            toggle.setAttribute('aria-label', toggle.title);
            const toggleIcon = document.createElement('img');
            toggleIcon.src = TWO_HANDS_ICON;
            toggleIcon.alt = '';
            toggleIcon.setAttribute('aria-hidden', 'true');
            toggle.appendChild(toggleIcon);
            toggle.addEventListener('click', async (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              await this._toggleTwoHanded(String(item.id));
            });
            toggle.addEventListener('dragstart', (ev) => ev.stopPropagation());
            slotEl.classList.add('arpginv-slot--hands-toggle');
            slotEl.appendChild(toggle);
          }
        }

        slotEl.addEventListener('dragstart', (ev) => {
          this._beginDrag(ev, item.id, { kind: 'equipment', slot: slot.id });
        });
      } else {
        const icon = slotPlaceholder(slot.id);
        if (icon) {
          const placeholder = document.createElement('img');
          placeholder.className = 'arpginv-slot__placeholder';
          placeholder.src = icon;
          placeholder.alt = '';
          placeholder.setAttribute('aria-hidden', 'true');
          slotEl.appendChild(placeholder);
        }
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
      slotEl.addEventListener('click', (ev) => {
        if (slot.side !== 'weapon') return;
        ev.stopPropagation();
        this.weaponInfoSlot = slot.id;
        this._updateWeaponInfo(inv, root);
      });

      if (slot.side === 'weapon') {
        if (slot.id === 'mainhand') weaponBar.appendChild(slotEl);
        else weaponPair.appendChild(slotEl);
      } else {
        frame.appendChild(slotEl);
      }
    }
    weaponBar.appendChild(weaponPair);
    weaponBar.insertBefore(weaponInfo, weaponPair);
    equipment.appendChild(frame);

    // Zone tabs (main + containers).
    const tabs = document.createElement('div');
    tabs.className = 'arpginv-tabs';
    for (const def of zoneDefs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `arpginv-tab ${def.available ? 'arpginv-tab--available' : 'arpginv-tab--inactive'}`;
      if (def.id === this.activeZone) btn.classList.add('active');
      btn.dataset.zone = def.id;
      const noContainer = this._localize('ARPGINV.App.NoContainer', 'Sin contenedor');
      btn.title = def.available ? def.name : `${def.name} (${noContainer})`;
      btn.setAttribute('aria-label', btn.title);
      btn.setAttribute('aria-disabled', String(!def.available));
      const icon = document.createElement('img');
      icon.className = 'arpginv-tab__icon';
      icon.src = def.icon;
      icon.alt = '';
      icon.setAttribute('aria-hidden', 'true');
      btn.appendChild(icon);
      btn.draggable = true;
      btn.addEventListener('click', () => this._switchZone(def.id));
      btn.addEventListener('dragstart', (ev) => {
        ev.stopPropagation();
        this.dragTabId = def.id;
        ev.dataTransfer?.setData('text/plain', `tab:${def.id}`);
        if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
        btn.classList.add('dragging');
      });
      btn.addEventListener('dragend', () => {
        this.dragTabId = null;
        btn.classList.remove('dragging');
        tabs.querySelectorAll('.arpginv-tab--drop-target')
          .forEach((el) => el.classList.remove('arpginv-tab--drop-target'));
      });
      btn.addEventListener('dragenter', (ev) => {
        if (!this.dragTabId || this.dragTabId === def.id) return;
        ev.preventDefault();
        btn.classList.add('arpginv-tab--drop-target');
      });
      btn.addEventListener('dragleave', () => btn.classList.remove('arpginv-tab--drop-target'));
      btn.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
      btn.addEventListener('drop', async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        btn.classList.remove('arpginv-tab--drop-target');
        if (this.dragTabId) {
          const draggedTab = this.dragTabId;
          this.dragTabId = null;
          await this._reorderContainerTab(draggedTab, def.id);
          return;
        }
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
    const capacityLabel = zone.capacity.mode === 'count'
      ? `Loaded ${Object.values(zone.placements).reduce(
          (sum: number, p: any) => sum + (p?.stack?.current ?? 1), 0
        )}/${zone.capacity.maxCount}`
      : `Weight ${zoneLoad.toFixed(1)}/${zone.capacity.maxWeight}`;
    info.textContent = `Cells ${usedCells}/${totalCells} · ${capacityLabel}`;

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
      if (!isInventoryItem(item)) continue;
      const p = this._normalizePlacement(item.id, zone);
      if (!p) continue;
      const el = document.createElement('div');
      el.className = `arpginv-item ${rarityClass(item)}`;
      el.draggable = this.editable;
      el.dataset.itemId = item.id;
      el.style.gridColumn = `${p.x + 1} / span ${p.w}`;
      el.style.gridRow = `${p.y + 1} / span ${p.h}`;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', itemTooltip(item));
      appendImage(el, item);
      appendAttunement(el, item);
      appendStackBadge(el, item);
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
        stack: this._zoneStack(item, zone),
        stackKey: item.name
      };
      const placed = placeOrStack(working, token, cell.x, cell.y);
      const swap = placed ? null : this._bagSwap(
        state, zone, this.dragItemId, itemIdAt(working, cell.x, cell.y), gridDims, token.stack
      );
      const valid = !!placed || !!swap;
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

    const ux = this._buildFilterBar();
    inventoryPane.append(weaponBar, weightBar, tabs, ux, info, grid);
    layout.append(equipment, inventoryPane);
    root.append(layout);

    root.addEventListener('mouseover', (ev) => {
      const target = (ev.target as HTMLElement)?.closest<HTMLElement>('[data-item-id]');
      if (target && root.contains(target)) this._showTooltip(target);
    });
    root.addEventListener('mouseout', (ev) => {
      const target = (ev.target as HTMLElement)?.closest<HTMLElement>('[data-item-id]');
      if (target) this._hideTooltip();
    });
    root.addEventListener('focusin', (ev) => {
      const target = (ev.target as HTMLElement)?.closest<HTMLElement>('[data-item-id]');
      if (target) this._showTooltip(target);
    });
    root.addEventListener('focusout', () => this._hideTooltip());
    root.addEventListener('dblclick', (ev) => {
      const source = ev.target as HTMLElement | null;
      if (source?.closest('.arpginv-slot__hands-toggle')) return;
      const target = source?.closest<HTMLElement>('[data-item-id]');
      if (!target || !root.contains(target)) return;
      ev.preventDefault();
      ev.stopPropagation();
      void this._openItemSheet(target.dataset.itemId);
    });

    this._registerUiKeyHandler();
    this._applyFilters(root);
    this._updateWeaponInfo(inv, root);
    return root;
  }

  _beginDrag(ev: DragEvent, itemId: string, source: any) {
    if (!this.editable) return;
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
    if (!this.editable) return false;
    const def = this._zoneDefs().find((zone) => zone.id === zoneId);
    if (!def) return false;
    if (!def.available) {
      this._warnUnavailableContainer(def);
      return false;
    }
    const draggedId = this.dragItemId;
    if (!draggedId) return false;
    const item = this.actor?.items?.get?.(draggedId);
    if (!item || !isInventoryItem(item)) return false;

    const inv = getActorInventory(this.actor);
    const zone = getInventoryZone(inv, zoneId);
    if (!zone) return false;

    if (zone.capacity.mode === 'count' && getItemStack(item).current > zone.capacity.maxCount) {
      ui.notifications?.warn('Container capacity exceeded');
      playInventorySound('invalid');
      return false;
    }
    const gridDims = this._effectiveGrid(item, this.dragRotated);
    const stack = this._zoneStack(item, zone);
    const state = this._buildEngineState(zone);
    const token = { id: draggedId, grid: gridDims, stack, stackKey: item.name };

    // Build the state before clearing the source: a bag swapped in this zone
    // keeps its previous anchor, which the swap helper then exchanges.
    const swapped = this._bagSwap(state, zone, draggedId, itemIdAt(state, x, y), gridDims, stack);
    removeItemFromInventory(inv, draggedId);

    let placements: any;
    let consumed = false;
    let targetId = draggedId;
    if (swapped) {
      placements = swapped.placements;
    } else {
      const working = removeItem(state, draggedId);
      const res = placeOrStack(working, token, x, y);
      if (!res) {
        ui.notifications?.warn('Cannot place item here');
        playInventorySound('invalid');
        return false;
      }
      placements = res.state.placements;
      consumed = res.consumed;
      targetId = res.targetId;
      if (!consumed && placements[draggedId]) {
        placements[draggedId] = normalizePlacement(
          { ...placements[draggedId], rotated: this.dragRotated },
          gridDims,
          zone.capacity.cols,
          zone.capacity.rows
        );
      }
    }
    if (zoneId === 'main') inv.placements = placements;
    else zone.placements = placements;

    if (!(await this._saveInventory(inv))) {
      this._endDrag();
      return false;
    }
    if (consumed) {
      await this._persistStack(targetId, placements);
      await this._syncItemPlacement(this.actor.items.get(targetId), zoneId);
      await this.actor.deleteEmbeddedDocuments('Item', [draggedId]);
      playInventorySound('stack');
    } else {
      // The same Item document now lives in the target zone in Foundry too.
      await this._syncItemPlacement(item, zoneId);
      playInventorySound('place');
    }
    this._endDrag();
    this.render(true);
    return true;
  }

  async _equipDragged(slotId: string) {
    if (!this.editable) return false;
    const draggedId = this.dragItemId;
    const dragged = this.actor?.items?.get?.(draggedId);
    if (!draggedId || !dragged || !isInventoryItem(dragged)) return false;
    const inv = getActorInventory(this.actor);
    removeItemFromInventory(inv, draggedId);
    const slots = this._equipSlotsFor(dragged, slotId);
    const displaced = this._assignEquipmentSlots(inv, draggedId, slots);
    if (!(await this._saveInventory(inv))) return false;
    await this._syncItemEquipped(dragged, true);
    for (const id of displaced) {
      await this._syncItemEquipped(this.actor?.items?.get?.(id), false);
    }
    this.weaponInfoSlot = slotId === 'ammo' ? 'mainhand' : slotId;
    playInventorySound('equip');
    this._endDrag();
    this.render(true);
    return true;
  }

  /** Move an item to the first free cell of a zone (drop on tab, Enter key). */
  async _moveItemToZone(itemId: string, zoneId: string) {
    if (!this.editable) return false;
    const def = this._zoneDefs().find((zone) => zone.id === zoneId);
    if (!def) return false;
    if (!def.available) {
      this._warnUnavailableContainer(def);
      return false;
    }
    const item = this.actor?.items?.get?.(itemId);
    if (!item || !isInventoryItem(item)) return false;

    const inv = getActorInventory(this.actor);
    removeItemFromInventory(inv, itemId);
    const zone = getInventoryZone(inv, zoneId);
    if (!zone) return false;
    const grid = this._effectiveGrid(item, false);
    const state = this._buildEngineState(zone);
    const spot = findFirstAvailable(state, grid, false);
    if (!spot) {
      ui.notifications?.warn('No free space in this container');
      playInventorySound('invalid');
      return false;
    }
    const token = { id: itemId, grid, stack: getItemStack(item), stackKey: item.name };
    const placed = placeItem(state, token, spot.x, spot.y, false);
    if (!placed) return false;
    if (zoneId === 'main') inv.placements = placed.placements;
    else zone.placements = placed.placements;
    if (!(await this._saveInventory(inv))) return false;
    await this._syncItemPlacement(item, zoneId);
    playInventorySound('place');
    this._endDrag();
    this.render(true);
    return true;
  }

  /** Move the dragged item to the first free cell of a zone (drop on tab). */
  async _moveDraggedToZone(zoneId: string) {
    const draggedId = this.dragItemId;
    if (!draggedId) return false;
    return this._moveItemToZone(draggedId, zoneId);
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
    if (this._uiKeyHandler) {
      document.removeEventListener('keydown', this._uiKeyHandler);
      this._uiKeyHandler = null;
    }
    this._hideTooltip();
    this._tooltipEl?.remove();
    this._tooltipEl = null;
    this._endDrag();
    return super.close(options);
  }
}
