import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  getActorInventory,
  getItemGrid,
  itemContainerId,
  setItemGrid,
  syncDynamicContainers
} from '../../src/data/inventory-service';
import { createEmptyInventory } from '../../src/data/grid-model';

const backpack = {
  id: 'bag-item', name: 'Backpack', type: 'container', img: 'icons/bag.webp',
  system: { capacity: { weight: { value: 40, units: 'lb' } } }
};
const waterskin = {
  id: 'skin-item', name: 'Waterskin', type: 'container', img: 'icons/skin.webp',
  system: { capacity: { weight: { value: 4, units: 'lb' } } }
};
const quiver = {
  id: 'quiver-item', name: 'Quiver', type: 'container', img: 'icons/quiver.webp',
  system: { capacity: { count: 20 } }
};

describe('dynamic container zones', () => {
  it('reads dnd5e container ids in both stored forms', () => {
    expect(itemContainerId({ system: { container: 'bag-item' } })).toBe('bag-item');
    expect(itemContainerId({ system: { container: { id: 'bag-item' } } })).toBe('bag-item');
    expect(itemContainerId({ system: { container: null } })).toBeNull();
  });

  it('creates one zone per carried container with capacity-derived grids', () => {
    const inv = createEmptyInventory();
    syncDynamicContainers({ items: [backpack, waterskin, quiver] }, inv, { maxContainers: 5 });
    const containers = inv.containers as any[];
    expect(containers.map((c) => c.id)).toEqual(['bag-item', 'skin-item', 'quiver-item']);
    expect(containers.map((c) => c.available)).toEqual([true, true, true]);
    expect(containers[0].capacity).toMatchObject({ cols: 5, rows: 2, maxWeight: 40, spaces: 10 });
    expect(containers[1].capacity).toMatchObject({ cols: 1, rows: 1, maxWeight: 4, spaces: 1 });
    expect(containers[2].capacity).toMatchObject({ cols: 1, rows: 2, maxCount: 20, spaces: 1, mode: 'count' });
    expect(containers[0].img).toBe('icons/bag.webp');
  });

  it('keeps inactive placeholders for zones without a dedicated container', () => {
    const inv = createEmptyInventory();
    syncDynamicContainers({ items: [waterskin] }, inv, { maxContainers: 1 });
    const containers = inv.containers as any[];
    expect(containers.map((c) => c.id)).toEqual(['skin-item', 'backpack', 'quiver']);
    expect(containers.map((c) => c.available)).toEqual([true, false, false]);
  });

  it('keeps the user-defined tab order across syncs', () => {
    const inv = createEmptyInventory();
    const items = [backpack, waterskin, quiver];
    syncDynamicContainers({ items }, inv, { maxContainers: 5 });
    (inv as any).containerOrder = ['quiver-item', 'bag-item', 'skin-item'];
    syncDynamicContainers({ items }, inv, { maxContainers: 5 });
    const containers = inv.containers as any[];
    expect(containers.map((c) => c.id)).toEqual(['quiver-item', 'bag-item', 'skin-item']);
  });

  it('sizes the main grid from carry weight at 4 lb per cell', () => {
    const actor: any = {
      getFlag: () => ({
        capacity: { mode: 'strength', maxWeight: 100 },
        placements: {}, equipment: {}, containers: []
      }),
      items: [],
      system: { abilities: { str: { value: 20 } } }
    };
    const inv: any = getActorInventory(actor);
    expect(inv.capacity.maxWeight).toBe(300);
    expect(inv.capacity.spaces).toBe(75);
    expect(inv.capacity.cols).toBe(10);
    expect(inv.capacity.rows).toBe(8);
  });

  it('reflows placements that no longer fit the weight-derived grid', () => {
    const sword = { id: 'sword', name: 'Sword', type: 'weapon', system: {}, getFlag: () => null };
    const actor: any = {
      getFlag: () => ({
        capacity: { mode: 'manual', maxWeight: 40, cols: 10, rows: 6 },
        placements: { sword: { x: 9, y: 5, w: 2, h: 1, rotated: false, stack: { current: 1, max: 1 } } },
        equipment: {}, containers: []
      }),
      items: [sword]
    };
    actor.items.get = (id: string) => actor.items.find((item: any) => item.id === id);
    const inv: any = getActorInventory(actor);
    expect(inv.capacity.cols).toBe(10);
    expect(inv.capacity.rows).toBe(1);
    expect(inv.placements.sword).toMatchObject({ x: 8, y: 0, w: 2, h: 1 });
    expect(inv.placements.sword.x + inv.placements.sword.w).toBeLessThanOrEqual(inv.capacity.cols);
  });

  it('moves an equipped item out of every grid and into its equipment slot', () => {
    const armor = {
      id: 'armor', name: 'Plate', type: 'equipment',
      system: { equipped: true, type: { value: 'heavy' } }, getFlag: () => null
    };
    const actor: any = {
      getFlag: () => ({
        capacity: { mode: 'manual', maxWeight: 100, cols: 10, rows: 6 },
        placements: { armor: { x: 0, y: 0, w: 2, h: 1, rotated: false, stack: { current: 1, max: 1 } } },
        equipment: {}, containers: []
      }),
      items: [armor]
    };
    actor.items.get = (id: string) => actor.items.find((item: any) => item.id === id);
    const inv: any = getActorInventory(actor);
    expect(inv.equipment.body).toBe('armor');
    expect(inv.placements.armor).toBeUndefined();
  });

  it('puts a two-handed weapon in both hand slots', () => {
    const glaive = {
      id: 'glaive', name: 'Glaive', type: 'weapon',
      system: { equipped: true, properties: new Set(['two']) }, getFlag: () => null
    };
    const actor: any = {
      getFlag: () => ({
        capacity: { mode: 'manual', maxWeight: 100, cols: 10, rows: 6 },
        placements: { glaive: null }, equipment: {}, containers: []
      }),
      items: [glaive]
    };
    actor.items.get = (id: string) => actor.items.find((item: any) => item.id === id);
    const inv: any = getActorInventory(actor);
    expect(inv.equipment.mainhand).toBe('glaive');
    expect(inv.equipment.offhand).toBe('glaive');
    expect(inv.placements.glaive).toBeUndefined();
  });

  it('returns an unequipped item to the main grid', () => {
    const sword = {
      id: 'sword', name: 'Sword', type: 'weapon',
      system: { equipped: false }, getFlag: () => null
    };
    const actor: any = {
      getFlag: () => ({
        capacity: { mode: 'manual', maxWeight: 100, cols: 10, rows: 6 },
        placements: {},
        equipment: { mainhand: 'sword' }, containers: []
      }),
      items: [sword]
    };
    actor.items.get = (id: string) => actor.items.find((item: any) => item.id === id);
    const inv: any = getActorInventory(actor);
    expect(inv.equipment.mainhand).toBeNull();
    expect(inv.placements.sword).toBeUndefined();
  });

  it('keeps an item only in the zone dnd5e says contains it', () => {
    const bag = { ...backpack, getFlag: () => null };
    const sword = {
      id: 'sword', name: 'Sword', type: 'weapon',
      system: { container: 'bag-item' }, getFlag: () => null
    };
    const actor: any = {
      getFlag: () => ({
        capacity: { mode: 'manual', maxWeight: 100, cols: 10, rows: 6 },
        placements: { sword: { x: 0, y: 0, w: 2, h: 1, rotated: false, stack: { current: 1, max: 1 } } },
        equipment: {},
        containers: [{
          id: 'bag-item', name: 'Backpack',
          capacity: { cols: 5, rows: 2, maxWeight: 40 },
          placements: { sword: { x: 1, y: 0, w: 2, h: 1, rotated: false, stack: { current: 1, max: 1 } } }
        }]
      }),
      items: [bag, sword]
    };
    actor.items.get = (id: string) => actor.items.find((item: any) => item.id === id);
    const inv: any = getActorInventory(actor);
    expect(inv.placements.sword).toBeUndefined();
    expect(inv.containers.find((c: any) => c.id === 'bag-item').placements.sword)
      .toMatchObject({ x: 1, y: 0 });
  });

  it('returns an item to the main grid when its container field is cleared', () => {
    const bag = { ...backpack, getFlag: () => null };
    const sword = {
      id: 'sword', name: 'Sword', type: 'weapon',
      system: { container: null }, getFlag: () => null
    };
    const actor: any = {
      getFlag: () => ({
        capacity: { mode: 'manual', maxWeight: 100, cols: 10, rows: 6 },
        placements: {},
        equipment: {},
        containers: [{
          id: 'bag-item', name: 'Backpack',
          capacity: { cols: 5, rows: 2, maxWeight: 40 },
          placements: { sword: { x: 1, y: 0, w: 2, h: 1, rotated: false, stack: { current: 1, max: 1 } } }
        }]
      }),
      items: [bag, sword]
    };
    actor.items.get = (id: string) => actor.items.find((item: any) => item.id === id);
    const inv: any = getActorInventory(actor);
    expect(inv.containers.find((c: any) => c.id === 'bag-item').placements.sword).toBeUndefined();
    expect(inv.placements.sword).toBeUndefined();
  });

  it('drops zones when the container item disappears', () => {
    const inv = createEmptyInventory();
    syncDynamicContainers({ items: [backpack] }, inv, { maxContainers: 5 });
    syncDynamicContainers({ items: [] }, inv, { maxContainers: 5 });
    const containers = inv.containers as any[];
    expect(containers.map((c) => c.id)).toEqual(['backpack', 'quiver']);
    expect(containers.every((c) => c.available === false)).toBe(true);
  });
});

describe('item dimensions', () => {
  const previousGame = (globalThis as any).game;
  afterEach(() => {
    (globalThis as any).game = previousGame;
  });

  it('reads grid flags and clamps them to the usable grid', () => {
    const item = { type: 'weapon', getFlag: () => ({ w: 20, h: 4, rotatable: false }) };
    expect(getItemGrid(item)).toEqual({ w: 10, h: 4, rotatable: false });
    expect(getItemGrid({ type: 'weapon', getFlag: () => null }))
      .toEqual({ w: 2, h: 1, rotatable: true });
  });

  it('saves edited dimensions on the item only when permitted', async () => {
    const setFlag = vi.fn();
    const item = {
      type: 'weapon',
      parent: { isOwner: true },
      getFlag: () => null,
      setFlag
    };
    (globalThis as any).game = { user: { isGM: false, id: 'u1' } };
    expect(await setItemGrid(item, { w: 2, h: 4 })).toBe(true);
    expect(setFlag).toHaveBeenCalledWith('arpg-inventory', 'grid', { w: 2, h: 4, rotatable: true });

    setFlag.mockClear();
    item.parent = { isOwner: false };
    expect(await setItemGrid(item, { w: 3, h: 3 })).toBe(false);
    expect(setFlag).not.toHaveBeenCalled();
  });
});
