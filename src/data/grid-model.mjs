// Pure data model for the ARPG Inventory.
// No Foundry globals. Safe to unit-test.

export const INVENTORY_SCHEMA_VERSION = 1;

const DEFAULT_CAPACITY = {
  mode: 'manual',
  cols: 10,
  rows: 6,
  maxWeight: 100
};

const ITEM_GRID_DEFAULTS = {
  weapon: { w: 2, h: 1 },
  equipment: { w: 2, h: 2 },
  consumable: { w: 1, h: 1 },
  tool: { w: 1, h: 1 },
  loot: { w: 1, h: 1 },
  default: { w: 1, h: 1 }
};

const ITEM_STACK_MAX = {
  consumable: 10,
  default: 1
};

export function defaultCapacity(settings = {}) {
  return {
    mode: settings.defaultCapacityMode ?? DEFAULT_CAPACITY.mode,
    cols: Number.isFinite(settings.defaultCols) ? settings.defaultCols : DEFAULT_CAPACITY.cols,
    rows: Number.isFinite(settings.defaultRows) ? settings.defaultRows : DEFAULT_CAPACITY.rows,
    maxWeight: Number.isFinite(settings.defaultMaxWeight) ? settings.defaultMaxWeight : DEFAULT_CAPACITY.maxWeight
  };
}

export function defaultItemGrid(itemType = 'default') {
  const size = ITEM_GRID_DEFAULTS[itemType] ?? ITEM_GRID_DEFAULTS.default;
  return { w: size.w, h: size.h, rotatable: true };
}

export function defaultItemStackMax(itemType = 'default') {
  return ITEM_STACK_MAX[itemType] ?? ITEM_STACK_MAX.default;
}

export function defaultItemStack(itemType = 'default', quantity = 1) {
  return { current: Math.max(1, quantity || 1), max: defaultItemStackMax(itemType) };
}

export function createEmptyInventory(settings = {}) {
  return {
    version: INVENTORY_SCHEMA_VERSION,
    capacity: defaultCapacity(settings),
    placements: {}
  };
}

export function migrateInventory(raw, settings = {}) {
  if (!raw || typeof raw !== 'object') {
    return createEmptyInventory(settings);
  }

  const data = { ...raw };
  if (!Number.isInteger(data.version)) data.version = 0;

  // v0 -> v1
  if (data.version < 1) {
    data.version = 1;
    if (!data.capacity || typeof data.capacity !== 'object') {
      data.capacity = defaultCapacity(settings);
    }
    if (!data.placements || typeof data.placements !== 'object') {
      data.placements = {};
    }
    // legacy "items" map -> placements
    if (data.items && typeof data.items === 'object') {
      for (const [id, info] of Object.entries(data.items)) {
        if (!(id in data.placements)) {
          data.placements[id] = info && typeof info === 'object' ? (info.position ?? null) : null;
        }
      }
      delete data.items;
    }
  }

  data.capacity = { ...defaultCapacity(settings), ...(data.capacity || {}) };
  if (!data.placements || typeof data.placements !== 'object') data.placements = {};
  data.version = INVENTORY_SCHEMA_VERSION;
  return data;
}

export function normalizeActorInventory(raw, actorItemIds = [], settings = {}) {
  const inv = migrateInventory(raw, settings);
  const idSet = new Set(actorItemIds);

  for (const id of idSet) {
    if (!(id in inv.placements)) inv.placements[id] = null;
  }
  for (const id of Object.keys(inv.placements)) {
    if (!idSet.has(id)) delete inv.placements[id];
  }

  return inv;
}
