import { describe, it, expect } from 'vitest';
import {
  migrateInventory,
  normalizeActorInventory,
  defaultItemGrid,
  defaultItemStack,
  createEmptyInventory,
  normalizePlacement,
  normalizeCapacity,
  getInventoryZone,
  findItemLocation,
  removeItemFromInventory,
  zoneUsedCells,
  EQUIPMENT_SLOTS
} from '../../src/data/grid-model';

describe('grid-model', () => {
  it('creates empty inventory with defaults, slots and containers', () => {
    const inv = createEmptyInventory({ defaultCols: 5, defaultRows: 4 });
    expect(inv.version).toBe(2);
    expect(inv.capacity.cols).toBe(5);
    expect(inv.capacity.rows).toBe(4);
    expect(inv.placements).toEqual({});
    expect(Object.keys(inv.equipment)).toEqual(EQUIPMENT_SLOTS.map((s) => s.id));
    expect(EQUIPMENT_SLOTS).toHaveLength(14);
    expect(EQUIPMENT_SLOTS.filter((s) => s.side === 'bottom').map((s) => s.id))
      .toEqual(['mainhand', 'offhand', 'ranged', 'ammo']);
    expect(inv.containers).toHaveLength(2);
    expect(inv.containers[0].capacity.cols).toBe(6);
  });

  it('migrates v0 with items map', () => {
    const raw = { items: { a: { position: { x: 1, y: 2 } } } };
    const inv = migrateInventory(raw);
    expect(inv.version).toBe(2);
    expect(inv.placements.a).toEqual({ x: 1, y: 2 });
  });

  it('normalizes placements to actor items and prunes stale ids everywhere', () => {
    const raw = {
      version: 2,
      capacity: { mode: 'manual', cols: 2, rows: 2, maxWeight: 10 },
      placements: { a: null, stale: null },
      equipment: { body: 'b', mainhand: 'gone' },
      containers: [{
        id: 'bag', name: 'Bag', capacity: { cols: 3, rows: 2, maxWeight: 5 },
        placements: { stale: null }
      }]
    };
    const inv = normalizeActorInventory(raw, ['a', 'b']);
    expect(inv.placements.a).toBeNull();
    expect(inv.placements.stale).toBeUndefined();
    expect(inv.equipment.body).toBe('b');
    expect(inv.equipment.mainhand).toBeNull();
    expect(inv.containers[0].placements.stale).toBeUndefined();
  });

  it('defaults item grid by type', () => {
    expect(defaultItemGrid('weapon')).toEqual({ w: 2, h: 1, rotatable: true });
    expect(defaultItemGrid('unknown')).toEqual({ w: 1, h: 1, rotatable: true });
  });

  it('defaults item stack', () => {
    expect(defaultItemStack('consumable', 3)).toEqual({ current: 3, max: 10 });
  });

  it('coerces string coordinates and clamps to grid bounds', () => {
    const p = normalizePlacement({ x: '3', y: '2', w: '2', h: '1' }, {}, 4, 3);
    expect(p).toMatchObject({ x: 2, y: 2, w: 2, h: 1 });
  });

  it('does not swap already-rotated dimensions again', () => {
    const p = normalizePlacement({ x: 0, y: 0, w: 1, h: 2, rotated: true }, { w: 2, h: 1 }, 10, 6);
    expect(p).toMatchObject({ w: 1, h: 2, rotated: true });
  });

  it('normalizes capacity values saved as strings', () => {
    expect(normalizeCapacity({ mode: 'strength', cols: '8', rows: '4', maxWeight: '250' }))
      .toEqual({ mode: 'strength', cols: 8, rows: 4, maxWeight: 250 });
  });

  it('finds and removes items from any zone', () => {
    const inv: any = createEmptyInventory();
    inv.placements.a = { x: 0, y: 0, w: 1, h: 1 };
    inv.containers[0].placements.b = { x: 1, y: 1, w: 1, h: 1 };
    inv.equipment.body = 'c';

    expect(getInventoryZone(inv, 'backpack')).toBe(inv.containers[0]);
    expect(findItemLocation(inv, 'a')).toEqual({ kind: 'main', zoneId: 'main' });
    expect(findItemLocation(inv, 'b')).toEqual({ kind: 'container', zoneId: 'backpack' });
    expect(findItemLocation(inv, 'c')).toEqual({ kind: 'equipment', slot: 'body' });

    expect(removeItemFromInventory(inv, 'b')).toBe(true);
    expect(findItemLocation(inv, 'b')).toBeNull();
    expect(zoneUsedCells(inv.containers[0])).toBe(0);

    inv.placements.a = null;
    expect(findItemLocation(inv, 'a')).toBeNull();
  });
});
