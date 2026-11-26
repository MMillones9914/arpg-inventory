// Pure data model for the ARPG Inventory.
// No Foundry globals. Safe to unit-test.

export const INVENTORY_SCHEMA_VERSION = 2;

const DEFAULT_CAPACITY = {
  mode: 'manual',
  cols: 10,
  rows: 6,
  maxWeight: 100
};

export const EQUIPMENT_SLOTS = [
  { id: 'head', label: 'Cabeza', side: 'left' },
  { id: 'neck', label: 'Cuello', side: 'left' },
  { id: 'shoulders', label: 'Hombreras', side: 'left' },
  { id: 'body', label: 'Cuerpo', side: 'left' },
  { id: 'back', label: 'Espalda', side: 'left' },
  { id: 'hands', label: 'Manos', side: 'left' },
  { id: 'wrist', label: 'Brazaletes', side: 'right' },
  { id: 'waist', label: 'Cinturón', side: 'right' },
  { id: 'feet', label: 'Zapatos', side: 'right' },
  { id: 'ring1', label: 'Anillo 1', side: 'right' },
  { id: 'ring2', label: 'Anillo 2', side: 'right' },
  { id: 'mainhand', label: 'Arma principal', side: 'weapon' },
  { id: 'offhand', label: 'Arma secundaria', side: 'weapon' },
  { id: 'ammo', label: 'Municiones', side: 'weapon' }
] as const;

const DEFAULT_CONTAINERS = [
  { id: 'backpack', name: 'Backpack', capacity: { cols: 6, rows: 4, maxWeight: 40 } },
  { id: 'quiver', name: 'Quiver', capacity: { cols: 2, rows: 4, maxWeight: 10 } }
];

const ITEM_GRID_DEFAULTS: Record<string, { w: number; h: number }> = {
  weapon: { w: 2, h: 1 },
  equipment: { w: 2, h: 2 },
  armor: { w: 2, h: 3 },
  shield: { w: 2, h: 2 },
  consumable: { w: 1, h: 1 },
  tool: { w: 1, h: 2 },
  loot: { w: 1, h: 1 },
  treasure: { w: 1, h: 1 },
  ammo: { w: 1, h: 1 },
  container: { w: 2, h: 2 },
  backpack: { w: 2, h: 2 },
  spellcastingFocus: { w: 1, h: 1 },
  default: { w: 1, h: 1 }
};

const ITEM_STACK_MAX: Record<string, number> = {
  consumable: 10,
  ammo: 20,
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

function normalizeContainer(raw: any, index: number, settings: any = {}) {
  const fallback = DEFAULT_CONTAINERS[index] ?? {
    id: `container-${index + 1}`,
    name: `Container ${index + 1}`,
    capacity: { cols: 6, rows: 4, maxWeight: 40 }
  };
  const source = raw && typeof raw === 'object' ? raw : {};
  const containerSettings = {
    ...settings,
    defaultCapacityMode: 'manual',
    defaultCols: fallback.capacity.cols,
    defaultRows: fallback.capacity.rows,
    defaultMaxWeight: fallback.capacity.maxWeight
  };
  return {
    id: typeof source.id === 'string' && source.id ? source.id : fallback.id,
    name: typeof source.name === 'string' && source.name ? source.name : fallback.name,
    capacity: normalizeCapacity(source.capacity, containerSettings),
    placements: source.placements && typeof source.placements === 'object' ? { ...source.placements } : {}
  };
}

function normalizeEquipment(raw: any) {
  const equipment: Record<string, string | null> = {};
  const source = raw && typeof raw === 'object' ? raw : {};
  for (const slot of EQUIPMENT_SLOTS) {
    const value = source[slot.id];
    equipment[slot.id] = typeof value === 'string' && value ? value : null;
  }
  return equipment;
}

export function createEmptyInventory(settings: any = {}) {
  return {
    version: INVENTORY_SCHEMA_VERSION,
    capacity: defaultCapacity(settings),
    placements: {},
    equipment: normalizeEquipment({}),
    containers: DEFAULT_CONTAINERS.map((c, i) => normalizeContainer(c, i, settings))
  };
}

export function migrateInventory(raw: any, settings: any = {}) {
  if (!raw || typeof raw !== 'object') return createEmptyInventory(settings);

  const data: any = { ...raw };
  if (!Number.isInteger(data.version)) data.version = 0;

  // v0 -> v1: legacy "items" map -> placements.
  if (data.version < 1) {
    if (!data.placements || typeof data.placements !== 'object') data.placements = {};
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

  // v1 -> v2: equipment slots + container sub-grids.
  if (data.version < 2) {
    data.equipment = data.equipment ?? {};
    data.containers = data.containers ?? DEFAULT_CONTAINERS;
  }

  data.capacity = normalizeCapacity(data.capacity, settings);
  if (!data.placements || typeof data.placements !== 'object') data.placements = {};
  data.equipment = normalizeEquipment(data.equipment);
  const savedContainers = Array.isArray(data.containers) ? data.containers : DEFAULT_CONTAINERS;
  data.containers = savedContainers.map((c: any, i: number) => normalizeContainer(c, i, settings));
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

  for (const container of inv.containers) {
    for (const id of Object.keys(container.placements)) {
      if (!idSet.has(id)) delete container.placements[id];
    }
  }
  for (const slot of EQUIPMENT_SLOTS) {
    if (inv.equipment[slot.id] && !idSet.has(inv.equipment[slot.id])) {
      inv.equipment[slot.id] = null;
    }
  }

  return inv;
}

export function getInventoryZone(inv: any, zoneId: string) {
  if (!inv) return null;
  if (zoneId === 'main') return inv;
  return inv.containers?.find((c: any) => c.id === zoneId) ?? null;
}

export function findItemLocation(inv: any, itemId: string) {
  if (!inv || !itemId) return null;
  for (const slot of EQUIPMENT_SLOTS) {
    if (inv.equipment?.[slot.id] === itemId) return { kind: 'equipment', slot: slot.id };
  }
  if (inv.placements?.[itemId]) return { kind: 'main', zoneId: 'main' };
  for (const container of inv.containers ?? []) {
    if (container.placements?.[itemId]) {
      return { kind: 'container', zoneId: container.id };
    }
  }
  return null;
}

/** Remove an item from every zone (in-memory; callers persist explicitly). */
export function removeItemFromInventory(inv: any, itemId: string) {
  if (!inv || !itemId) return false;
  let removed = false;
  for (const slot of EQUIPMENT_SLOTS) {
    if (inv.equipment?.[slot.id] === itemId) {
      inv.equipment[slot.id] = null;
      removed = true;
    }
  }
  if (itemId in (inv.placements ?? {})) {
    delete inv.placements[itemId];
    removed = true;
  }
  for (const container of inv.containers ?? []) {
    if (itemId in (container.placements ?? {})) {
      delete container.placements[itemId];
      removed = true;
    }
  }
  return removed;
}

export function zoneUsedCells(zone: any) {
  let used = 0;
  for (const p of Object.values(zone?.placements ?? {})) {
    if (p) used += (p as any).w * (p as any).h;
  }
  return used;
}
