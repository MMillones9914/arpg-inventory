import { describe, it, expect } from 'vitest';
import { syncDynamicContainers } from '../../src/data/inventory-service';
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

  it('drops zones when the container item disappears', () => {
    const inv = createEmptyInventory();
    syncDynamicContainers({ items: [backpack] }, inv, { maxContainers: 5 });
    syncDynamicContainers({ items: [] }, inv, { maxContainers: 5 });
    const containers = inv.containers as any[];
    expect(containers.map((c) => c.id)).toEqual(['backpack', 'quiver']);
    expect(containers.every((c) => c.available === false)).toBe(true);
  });
});
