import { MODULE_ID } from '../constants.mjs';
import {
  normalizeActorInventory,
  defaultItemGrid,
  defaultItemStack,
  defaultItemStackMax
} from './grid-model.mjs';

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

export function getActorInventory(actor) {
  if (!actor) return null;
  const raw = actor.getFlag(MODULE_ID, 'inventory');
  const itemIds = (actor.items?.map((i) => i.id) ?? []);
  const inv = normalizeActorInventory(raw, itemIds, settingsDefaults());
  // Strength-based capacity: use dnd5e encumbrance maximum when enabled.
  if (inv.capacity.mode === 'strength') {
    const max = actor.system?.attributes?.encumbrance?.max;
    if (Number.isFinite(max) && max > 0) inv.capacity.maxWeight = max;
  }
  return inv;
}

export async function setActorInventory(actor, data) {
  if (!actor) return null;
  await actor.setFlag(MODULE_ID, 'inventory', data);
  return data;
}

export async function syncActorItems(actor) {
  if (!actor || (!actor.isOwner && !game.user?.isGM)) return null;
  const next = getActorInventory(actor);
  const current = actor.getFlag(MODULE_ID, 'inventory');
  // Only persist if normalized result differs or missing.
  if (JSON.stringify(current) !== JSON.stringify(next)) {
    await setActorInventory(actor, next);
  }
  return next;
}

export function getItemGrid(item) {
  if (!item) return defaultItemGrid();
  const stored = item.getFlag(MODULE_ID, 'grid');
  if (stored && typeof stored === 'object') {
    return {
      w: Number.isFinite(stored.w) ? stored.w : 1,
      h: Number.isFinite(stored.h) ? stored.h : 1,
      rotatable: stored.rotatable !== false
    };
  }
  return defaultItemGrid(item.type);
}

export async function setItemGrid(item, grid) {
  if (!item) return null;
  await item.setFlag(MODULE_ID, 'grid', {
    w: Math.max(1, grid?.w ?? 1),
    h: Math.max(1, grid?.h ?? 1),
    rotatable: grid?.rotatable !== false
  });
  return getItemGrid(item);
}

export function getItemStack(item) {
  if (!item) return { current: 1, max: 1 };
  const stored = item.getFlag(MODULE_ID, 'stack');
  const max = Number.isFinite(stored?.max) ? stored.max : defaultItemStackMax(item.type);
  const qty = Number.isFinite(item.system?.quantity) ? item.system.quantity : 1;
  const current = Number.isFinite(stored?.current) ? stored.current : qty;
  return { current: Math.max(1, current), max: Math.max(1, max) };
}

export async function setItemStackMax(item, max) {
  if (!item) return null;
  const current = getItemStack(item).current;
  await item.setFlag(MODULE_ID, 'stack', { current, max: Math.max(1, max) });
  return getItemStack(item);
}
