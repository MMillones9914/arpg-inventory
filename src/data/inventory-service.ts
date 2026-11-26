import { MODULE_ID } from '../constants';
import {
  normalizeActorInventory,
  normalizeCapacity,
  normalizePlacement,
  capacityFromWeight,
  MAIN_GRID_COLS,
  defaultItemGrid,
  defaultItemStackMax,
  DEFAULT_CONTAINERS
} from './grid-model';
import { dnd5eItemType, strengthCapacity } from './dnd5e';
import { containerCapacity } from './container-capacity';
import { containerKindMatches, isContainerItem, normalizedContainerLimit } from './containers';
import { inventoryItemIds, isInventoryItem } from './inventory-items';
import { canEditInventory } from './permissions';
import { applyRevision, isStaleWrite, type InventoryWriteResult } from './inventory-sync';
import { canPlace, createGridState, findFirstAvailable, placeItem } from '../engine/grid-engine';

function settingsDefaults() {
  try {
    return {
      defaultCapacityMode: game.settings.get(MODULE_ID, 'defaultCapacityMode'),
      defaultCols: game.settings.get(MODULE_ID, 'defaultCols'),
      defaultRows: game.settings.get(MODULE_ID, 'defaultRows'),
      defaultMaxWeight: game.settings.get(MODULE_ID, 'defaultMaxWeight'),
      maxContainers: game.settings.get(MODULE_ID, 'maxContainers')
    };
  } catch (e) {
    return {};
  }
}

function normalizeZonePlacements(actor: any, zone: any, settings: any) {
  for (const id of Object.keys(zone.placements)) {
    const p = zone.placements[id];
    if (!p) continue;
    const item = actor.items?.get?.(id);
    zone.placements[id] = normalizePlacement(
      p,
      item ? getItemGrid(item) : defaultItemGrid(dnd5eItemType(item)),
      zone.capacity.cols,
      zone.capacity.rows
    );
  }
  return zone;
}

/** Keep placements valid after a zone grid was resized by a weight change. */
function reflowZonePlacements(actor: any, zone: any) {
  const cols = zone.capacity.cols;
  const rows = zone.capacity.rows;
  let state = createGridState(cols, rows);
  const placements: Record<string, any> = {};
  for (const [id, raw] of Object.entries(zone.placements ?? {})) {
    if (!raw) continue;
    const placement = raw as any;
    const item = actor?.items?.get?.(id);
    const grid = item ? getItemGrid(item) : { w: placement.w, h: placement.h, rotatable: false };
    const token = {
      id,
      grid,
      stack: placement.stack ?? (item ? getItemStack(item) : { current: 1, max: 1 }),
      stackKey: placement.stackKey ?? item?.name ?? id
    };
    let next: any = null;
    if (placement.w <= cols && placement.h <= rows
      && canPlace(state, grid, placement.x, placement.y, placement.rotated)) {
      next = placeItem(state, token, placement.x, placement.y, placement.rotated);
    } else {
      const spot = findFirstAvailable(state, grid, placement.rotated);
      if (spot) next = placeItem(state, token, spot.x, spot.y, placement.rotated);
    }
    if (!next) continue; // No room: the app will try to auto-place it elsewhere.
    state = next;
    placements[id] = next.placements[id];
  }
  zone.placements = placements;
}

/**
 * One zone per carried container item, capped by the GM setting. Unused
 * backpack/quiver definitions remain as inactive placeholders.
 */
export function syncDynamicContainers(actor: any, inv: any, settings: any = {}) {
  const items: any[] = [...(actor?.items ?? [])];
  const limit = normalizedContainerLimit(settings.maxContainers ?? 1);
  const dynamic: any[] = [];
  for (const item of items) {
    if (!isInventoryItem(item) || !isContainerItem(item)) continue;
    const id = String(item.id);
    if (dynamic.some((zone) => zone.id === id)) continue;
    if (dynamic.length >= limit) break;
    const saved = inv.containers?.find((c: any) => c.id === id);
    dynamic.push({
      id,
      name: String(item.name ?? 'Container'),
      itemId: id,
      img: String(item.img ?? ''),
      available: true,
      capacity: { mode: 'manual', ...containerCapacity(item) },
      placements: saved?.placements ?? {}
    });
  }
  const dynamicIds = new Set(dynamic.map((zone) => zone.id));
  const placeholders = (inv.containers ?? [])
    .filter((c: any) => {
      if (dynamicIds.has(c.id)) return false;
      if (c.itemId && !dynamicIds.has(String(c.itemId))) return false;
      return !items.some((item) => dynamicIds.has(String(item.id)) && containerKindMatches(c, item));
    })
    .map((c: any) => ({ ...c, available: false, itemId: null }));
  for (const fallback of DEFAULT_CONTAINERS) {
    if (placeholders.some((c: any) => c.id === fallback.id) || dynamicIds.has(fallback.id)) continue;
    if (items.some((item) => dynamicIds.has(String(item.id)) && containerKindMatches(fallback, item))) continue;
    placeholders.push({ ...fallback, available: false, itemId: null, placements: {} });
  }
  placeholders.sort((a: any, b: any) => {
    const order = (c: any) => {
      const index = DEFAULT_CONTAINERS.findIndex((def) => def.id === c.id);
      return index < 0 ? DEFAULT_CONTAINERS.length : index;
    };
    return order(a) - order(b);
  });
  inv.containers = [...dynamic, ...placeholders];

  // Tab order is user-defined and survives later syncs of dynamic zones.
  const order: string[] = Array.isArray(inv.containerOrder)
    ? inv.containerOrder.map((id: any) => String(id))
    : [];
  if (order.length) {
    const rank = (id: string) => {
      const index = order.indexOf(id);
      return index < 0 ? order.length : index;
    };
    inv.containers.sort((a: any, b: any) => rank(String(a.id)) - rank(String(b.id)));
  }
}

export function getActorInventory(actor: any) {
  if (!actor) return null;
  const raw = actor.getFlag(MODULE_ID, 'inventory');
  const settings = settingsDefaults();
  const itemIds = inventoryItemIds([...(actor?.items ?? [])]);
  const inv = normalizeActorInventory(raw, itemIds, settings);
  inv.capacity = normalizeCapacity(inv.capacity, settings, MAIN_GRID_COLS);

  // Strength-based capacity: dnd5e encumbrance max, then STR x 15 lb.
  // Re-derive the grid so 4 lb always equals one available space.
  if (inv.capacity.mode === 'strength') {
    const max = strengthCapacity(actor);
    if (max !== null) inv.capacity = capacityFromWeight(max, inv.capacity);
  }

  syncDynamicContainers(actor, inv, settings);
  normalizeZonePlacements(actor, inv, settings);
  for (const container of inv.containers) normalizeZonePlacements(actor, container, settings);
  reflowZonePlacements(actor, inv);
  for (const container of inv.containers) {
    if (container.available !== false) reflowZonePlacements(actor, container);
  }
  return inv;
}

/** Persist an inventory with an optimistic revision check. */
export async function setActorInventory(
  actor: any,
  data: any,
  options: { force?: boolean } = {}
): Promise<InventoryWriteResult> {
  if (!actor || !canEditInventory(game?.user, actor)) return { applied: false };
  const current = actor.getFlag?.(MODULE_ID, 'inventory');
  if (!options.force && isStaleWrite(current, data)) {
    return { applied: false, conflict: true, current };
  }
  const next = applyRevision(data, current, game?.user?.id ?? null);
  await actor.setFlag(MODULE_ID, 'inventory', next);
  return { applied: true, data: next };
}

export async function syncActorItems(actor: any) {
  if (!actor || !canEditInventory(game?.user, actor)) return null;
  const next = getActorInventory(actor);
  const current = actor.getFlag(MODULE_ID, 'inventory');
  if (JSON.stringify(current) !== JSON.stringify(next)) {
    await setActorInventory(actor, next);
  }
  return next;
}

export function getItemGrid(item: any) {
  if (!item) return defaultItemGrid();
  const stored = item.getFlag(MODULE_ID, 'grid');
  if (stored && typeof stored === 'object') {
    const w = Number(stored.w);
    const h = Number(stored.h);
    return {
      w: Number.isFinite(w) && w > 0 ? Math.floor(w) : 1,
      h: Number.isFinite(h) && h > 0 ? Math.floor(h) : 1,
      rotatable: stored.rotatable !== false
    };
  }
  return defaultItemGrid(dnd5eItemType(item));
}

export function getItemStack(item: any) {
  if (!item) return { current: 1, max: 1 };
  const stored = item.getFlag(MODULE_ID, 'stack');
  const qty = Number(item.system?.quantity);
  const storedCurrent = Number(stored?.current);
  const current = Math.max(1, Math.floor(
    Number.isFinite(qty) ? qty : (Number.isFinite(storedCurrent) ? storedCurrent : 1)
  ));
  const configured = Number(stored?.max);
  const max = Math.max(
    current,
    Math.floor(Number.isFinite(configured) ? configured : defaultItemStackMax(dnd5eItemType(item)))
  );
  return { current, max };
}
