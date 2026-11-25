import { MODULE_ID } from '../constants';
import {
  normalizeActorInventory,
  normalizeCapacity,
  normalizePlacement,
  defaultItemGrid,
  defaultItemStackMax
} from './grid-model';

function settingsDefaults() {
  try {
    return {
      defaultCapacityMode: game.settings.get(MODULE_ID, 'defaultCapacityMode'),
      defaultCols: game.settings.get(MODULE_ID, 'defaultCols'),
      defaultRows: game.settings.get(MODULE_ID, 'defaultRows'),
      defaultMaxWeight: game.settings.get(MODULE_ID, 'defaultMaxWeight')
    };
  } catch (e) {
    return {};
  }
}

export function getActorInventory(actor: any) {
  if (!actor) return null;
  const raw = actor.getFlag(MODULE_ID, 'inventory');
  const itemIds = actor.items?.map((i: any) => i.id) ?? [];
  const inv = normalizeActorInventory(raw, itemIds, settingsDefaults());
  inv.capacity = normalizeCapacity(inv.capacity, settingsDefaults());

  // Strength-based capacity: use dnd5e encumbrance maximum when enabled.
  if (inv.capacity.mode === 'strength') {
    const max = Number(actor.system?.attributes?.encumbrance?.max);
    if (Number.isFinite(max) && max > 0) inv.capacity.maxWeight = max;
  }

  // Normalize every placement once, with numeric coords and effective w/h.
  for (const id of Object.keys(inv.placements)) {
    const p = inv.placements[id];
    if (!p) continue;
    const item = actor.items?.get?.(id);
    inv.placements[id] = normalizePlacement(
      p,
      item ? getItemGrid(item) : defaultItemGrid(),
      inv.capacity.cols,
      inv.capacity.rows
    );
  }
  return inv;
}

export async function setActorInventory(actor: any, data: any) {
  if (!actor) return null;
  await actor.setFlag(MODULE_ID, 'inventory', data);
  return data;
}

/** Remove one item's placement so it is auto-placed again on next render. */
export async function clearItemPlacement(actor: any, itemId: string) {
  const inv = getActorInventory(actor);
  if (!inv || !(itemId in inv.placements)) return inv;
  inv.placements[itemId] = null;
  await setActorInventory(actor, inv);
  return inv;
}

export async function syncActorItems(actor: any) {
  if (!actor || (!actor.isOwner && !game.user?.isGM)) return null;
  const next = getActorInventory(actor);
  const current = actor.getFlag(MODULE_ID, 'inventory');
  // Only persist if normalized result differs or missing.
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
  return defaultItemGrid(item.type);
}

export async function setItemGrid(item: any, grid: any) {
  if (!item) return null;
  await item.setFlag(MODULE_ID, 'grid', {
    w: Math.max(1, Math.floor(Number(grid?.w) || 1)),
    h: Math.max(1, Math.floor(Number(grid?.h) || 1)),
    rotatable: grid?.rotatable !== false
  });
  return getItemGrid(item);
}

export function getItemStack(item: any) {
  if (!item) return { current: 1, max: 1 };
  const stored = item.getFlag(MODULE_ID, 'stack');
  const qty = Number(item.system?.quantity);
  const storedCurrent = Number(stored?.current);
  const current = Math.max(1, Math.floor(Number.isFinite(qty) ? qty : (Number.isFinite(storedCurrent) ? storedCurrent : 1)));
  const configured = Number(stored?.max);
  const max = Math.max(
    current,
    Math.floor(Number.isFinite(configured) ? configured : defaultItemStackMax(item.type))
  );
  return { current, max };
}

export async function setItemStackMax(item: any, max: number) {
  if (!item) return null;
  const current = getItemStack(item).current;
  await item.setFlag(MODULE_ID, 'stack', { current, max: Math.max(current, Math.floor(Number(max) || 1)) });
  return getItemStack(item);
}
