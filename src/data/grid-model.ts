// Pure data model for the ARPG Inventory.
// No Foundry globals. Safe to unit-test.

export const INVENTORY_SCHEMA_VERSION = 1;

const DEFAULT_CAPACITY = {
  mode: 'manual',
  cols: 10,
  rows: 6,
  maxWeight: 100
};

const ITEM_GRID_DEFAULTS: Record<string, { w: number; h: number }> = {
  weapon: { w: 2, h: 1 },
  equipment: { w: 2, h: 2 },
  consumable: { w: 1, h: 1 },
  tool: { w: 1, h: 1 },
  loot: { w: 1, h: 1 },
  default: { w: 1, h: 1 }
};

const ITEM_STACK_MAX: Record<string, number> = {
  consumable: 10,
  default: 1
};

function finiteNumber(value: any, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function positiveInt(value: any, fallback: number): number {
  const n = Math.floor(finiteNumber(value, fallback));
  return n > 0 ? n : fallback;
}

function clampInt(value: any, min: number, max: number): number {
  const n = Math.floor(finiteNumber(value, min));
  return Math.min(Math.max(n, min), max);
}

export function normalizeCapacity(raw: any = {}, settings: any = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const mode = source.mode ?? settings.defaultCapacityMode ?? DEFAULT_CAPACITY.mode;
  return {
    mode: mode === 'strength' ? 'strength' : 'manual',
    cols: positiveInt(source.cols ?? settings.defaultCols, DEFAULT_CAPACITY.cols),
    rows: positiveInt(source.rows ?? settings.defaultRows, DEFAULT_CAPACITY.rows),
    maxWeight: Math.max(0, finiteNumber(source.maxWeight ?? settings.defaultMaxWeight, DEFAULT_CAPACITY.maxWeight))
  };
}

export function defaultCapacity(settings: any = {}) {
  return normalizeCapacity({}, settings);
}

export function defaultItemGrid(itemType: string = 'default') {
  const size = ITEM_GRID_DEFAULTS[itemType] ?? ITEM_GRID_DEFAULTS.default;
  return { w: size.w, h: size.h, rotatable: true };
}

export function defaultItemStackMax(itemType: string = 'default') {
  return ITEM_STACK_MAX[itemType] ?? ITEM_STACK_MAX.default;
}

export function defaultItemStack(itemType: string = 'default', quantity = 1) {
  return { current: Math.max(1, quantity || 1), max: defaultItemStackMax(itemType) };
}

/**
 * Normalize a saved placement. `w`/`h` are always the effective on-grid size
 * (already swapped when rotated), so this never swaps them again.
 */
export function normalizePlacement(
  placement: any,
  fallbackGrid: any = {},
  cols = Infinity,
  rows = Infinity
): any {
  if (!placement || typeof placement !== 'object') return null;
  const w = positiveInt(placement.w, positiveInt(fallbackGrid.w, 1));
  const h = positiveInt(placement.h, positiveInt(fallbackGrid.h, 1));
  const maxX = Number.isFinite(cols) ? Math.max(0, cols - w) : Infinity;
  const maxY = Number.isFinite(rows) ? Math.max(0, rows - h) : Infinity;
  const normalized: any = {
    ...placement,
    x: clampInt(placement.x, 0, maxX),
    y: clampInt(placement.y, 0, maxY),
    w,
    h,
    rotated: placement.rotated === true
  };
  const stack = placement.stack;
  if (stack && typeof stack === 'object') {
    const current = Math.max(1, Math.floor(finiteNumber(stack.current, 1)));
    const max = Math.max(current, Math.floor(finiteNumber(stack.max, current)));
    normalized.stack = { current, max };
  }
  if (typeof placement.stackKey === 'string') normalized.stackKey = placement.stackKey;
  return normalized;
}

export function createEmptyInventory(settings: any = {}) {
  return {
    version: INVENTORY_SCHEMA_VERSION,
    capacity: defaultCapacity(settings),
    placements: {}
  };
}

export function migrateInventory(raw: any, settings: any = {}) {
  if (!raw || typeof raw !== 'object') {
    return createEmptyInventory(settings);
  }

  const data: any = { ...raw };
  if (!Number.isInteger(data.version)) data.version = 0;

  // v0 -> v1
  if (data.version < 1) {
    data.version = 1;
    if (!data.placements || typeof data.placements !== 'object') {
      data.placements = {};
    }
    // legacy "items" map -> placements
    if (data.items && typeof data.items === 'object') {
      for (const [id, info] of Object.entries(data.items)) {
        if (!(id in data.placements)) {
          data.placements[id] = info && typeof info === 'object'
            ? ((info as any).position ?? null)
            : null;
        }
      }
      delete data.items;
    }
  }

  data.capacity = normalizeCapacity(data.capacity, settings);
  if (!data.placements || typeof data.placements !== 'object') data.placements = {};
  data.version = INVENTORY_SCHEMA_VERSION;
  return data;
}

export function normalizeActorInventory(raw: any, actorItemIds: any = [], settings: any = {}) {
  const inv = migrateInventory(raw, settings);
  const idSet = new Set<string>(actorItemIds.map((id: any) => String(id)));

  for (const id of idSet) {
    if (!(id in inv.placements)) inv.placements[id] = null;
  }
  for (const id of Object.keys(inv.placements)) {
    if (!idSet.has(id)) delete inv.placements[id];
  }

  return inv;
}
