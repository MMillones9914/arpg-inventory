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

function normalizeZonePlacements(actor: any, zone: any, settings: any) {
  for (const id of Object.keys(zone.placements)) {
    const p = zone.placements[id];
    if (!p) continue;
    const item = actor.items?.get?.(id);
    zone.placements[id] = normalizePlacement(
      p,
      item ? getItemGrid(item) : defaultItemGrid(),
      zone.capacity.cols,
      zone.capacity.rows
    );
  }
  return zone;
}

export function getActorInventory(actor: any) {
  if (!actor) return null;
  const raw = actor.getFlag(MODULE_ID, 'inventory');
  const settings = settingsDefaults();
  const itemIds = actor.items?.map((i: any) => i.id) ?? [];
  const inv = normalizeActorInventory(raw, itemIds, settings);
  inv.capacity = normalizeCapacity(inv.capacity, settings);

  // Strength-based capacity: use dnd5e encumbrance maximum when enabled.
  if (inv.capacity.mode === 'strength') {
    const max = Number(actor.system?.attributes?.encumbrance?.max);
    if (Number.isFinite(max) && max > 0) inv.capacity.maxWeight = max;
  }

  normalizeZonePlacements(actor, inv, settings);
  for (const container of inv.containers) normalizeZonePlacements(actor, container, settings);
  return inv;
}

export async function setActorInventory(actor: any, data: any) {
  if (!actor) return null;
  await actor.setFlag(MODULE_ID, 'inventory', data);
  return data;
}

export async function syncActorItems(actor: any) {
  if (!actor || (!actor.isOwner && !game.user?.isGM)) return null;
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
  return defaultItemGrid(item.type);
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
    Math.floor(Number.isFinite(configured) ? configured : defaultItemStackMax(item.type))
  );
  return { current, max };
}
