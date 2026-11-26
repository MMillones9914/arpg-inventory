// Pure dnd5e container capacity helpers. No Foundry globals, safe to unit-test.
// Weight capacity: one inventory cell represents 4 lb of declared carry capacity.
// Count capacity: one item-sized slot (arrows are 1x2); the declared count is the
// maximum number of stacked items that slot can hold, not a number of cells.

export const POUNDS_PER_SPACE = 4;

export type CapacityMode = 'weight' | 'count';

export interface DerivedCapacity {
  cols: number;
  rows: number;
  maxWeight: number;
  spaces: number;
  mode: CapacityMode;
  maxCount: number;
}

const KG_TO_LB = 2.2046226218;
const AMMO_SLOT = { cols: 1, rows: 2 };

function finitePositive(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toPounds(value: number, units: any): number {
  return String(units ?? 'lb').toLowerCase() === 'kg' ? value * KG_TO_LB : value;
}

/** Most square factor pair with exactly `spaces` cells, wider side first. */
export function squareGrid(spaces: number): { cols: number; rows: number } {
  const total = Math.max(1, Math.floor(Number.isFinite(spaces) ? spaces : 1));
  let cols = total;
  let rows = 1;
  let best = total - 1;
  for (let candidate = 1; candidate * candidate <= total; candidate += 1) {
    if (total % candidate !== 0) continue;
    const width = total / candidate;
    const diff = width - candidate;
    if (diff < best) {
      cols = width;
      rows = candidate;
      best = diff;
    }
  }
  return { cols, rows };
}

/** A count container holds one stack of its contents, sized for that item. */
export function countSlot(item: any): { cols: number; rows: number } {
  const text = `${item?.name ?? ''} ${item?.system?.description?.value ?? ''}`.toLocaleLowerCase();
  return /arrow|bolt|dart|quiver|fletch/.test(text) ? AMMO_SLOT : { cols: 1, rows: 1 };
}

/** Declared item capacity as spaces (weight) or as a stack limit (count). */
export function containerSpaces(item: any): {
  spaces: number; mode: CapacityMode; maxWeight: number; maxCount: number
} {
  const capacity = item?.system?.capacity ?? {};
  const count = finitePositive(capacity.count)
    ?? (capacity.type === 'items' ? finitePositive(capacity.value) : null);
  if (count !== null) {
    return { spaces: 1, mode: 'count', maxWeight: 0, maxCount: Math.floor(count) };
  }

  const declaredWeight = finitePositive(capacity.weight?.value)
    ?? (capacity.type === 'weight' ? finitePositive(capacity.value) : null);
  const fromDescription = declaredWeight === null
    ? String(item?.system?.description?.value ?? '').replace(/<[^>]*>/g, ' ').match(
      /holds\s+up\s+to\s+(\d+(?:\.\d+)?)\s*(pounds?|lbs?|kilograms?|kgs?)/i
    )
    : null;
  const pounds = declaredWeight !== null
    ? toPounds(declaredWeight, capacity.weight?.units)
    : fromDescription
      ? toPounds(Number(fromDescription[1]), fromDescription[2])
      : POUNDS_PER_SPACE;

  const spaces = Math.max(1, Math.floor(pounds / POUNDS_PER_SPACE));
  return { spaces, mode: 'weight', maxWeight: spaces * POUNDS_PER_SPACE, maxCount: 0 };
}

/** Full grid capacity derived from a dnd5e container item. */
export function containerCapacity(item: any): DerivedCapacity {
  const { spaces, mode, maxWeight, maxCount } = containerSpaces(item);
  const grid = mode === 'count' ? countSlot(item) : squareGrid(spaces);
  return { ...grid, maxWeight, spaces, mode, maxCount };
}
