// Pure dnd5e container capacity helpers. No Foundry globals, safe to unit-test.
// One inventory cell represents 4 lb of declared carry capacity.

export const POUNDS_PER_SPACE = 4;

export type CapacityMode = 'weight' | 'count';

export interface DerivedCapacity {
  cols: number;
  rows: number;
  maxWeight: number;
  spaces: number;
  mode: CapacityMode;
}

const KG_TO_LB = 2.2046226218;

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

/** Declared item capacity as a number of 1-cell spaces. */
export function containerSpaces(item: any): { spaces: number; mode: CapacityMode; maxWeight: number } {
  const capacity = item?.system?.capacity ?? {};
  const count = finitePositive(capacity.count)
    ?? (capacity.type === 'items' ? finitePositive(capacity.value) : null);
  if (count !== null) {
    const spaces = Math.floor(count);
    return { spaces, mode: 'count', maxWeight: spaces };
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
  return { spaces, mode: 'weight', maxWeight: spaces * POUNDS_PER_SPACE };
}

/** Full grid capacity derived from a dnd5e container item. */
export function containerCapacity(item: any): DerivedCapacity {
  const { spaces, mode, maxWeight } = containerSpaces(item);
  return { ...squareGrid(spaces), maxWeight, spaces, mode };
}
