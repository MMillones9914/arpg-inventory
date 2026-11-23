import { describe, it, expect } from 'vitest';
import {
  migrateInventory,
  normalizeActorInventory,
  defaultItemGrid,
  defaultItemStack,
  createEmptyInventory
} from '../../src/data/grid-model.mjs';

describe('grid-model', () => {
  it('creates empty inventory with defaults', () => {
    const inv = createEmptyInventory({ defaultCols: 5, defaultRows: 4 });
    expect(inv.version).toBe(1);
    expect(inv.capacity.cols).toBe(5);
    expect(inv.capacity.rows).toBe(4);
    expect(inv.placements).toEqual({});
  });

  it('migrates v0 with items map', () => {
    const raw = { items: { a: { position: { x: 1, y: 2 } } } };
    const inv = migrateInventory(raw);
    expect(inv.version).toBe(1);
    expect(inv.placements.a).toEqual({ x: 1, y: 2 });
  });

  it('normalizes placements to actor items', () => {
    const raw = { version: 1, capacity: { mode: 'manual', cols: 2, rows: 2, maxWeight: 10 }, placements: { a: null, stale: null } };
    const inv = normalizeActorInventory(raw, ['a', 'b']);
    expect(inv.placements.a).toBeNull();
    expect(inv.placements.b).toBeNull();
    expect(inv.placements.stale).toBeUndefined();
  });

  it('defaults item grid by type', () => {
    expect(defaultItemGrid('weapon')).toEqual({ w: 2, h: 1, rotatable: true });
    expect(defaultItemGrid('unknown')).toEqual({ w: 1, h: 1, rotatable: true });
  });

  it('defaults item stack', () => {
    expect(defaultItemStack('consumable', 3)).toEqual({ current: 3, max: 10 });
  });
});
