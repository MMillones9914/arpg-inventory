import { describe, it, expect } from 'vitest';
import { availableContainers, hasContainer, isContainerAvailable } from '../../src/data/containers';
import { createEmptyInventory } from '../../src/data/grid-model';

const backpack = { id: 'bag-item', name: 'Backpack', type: 'container' };
const quiver = { id: 'quiver-item', name: 'Quiver', type: 'equipment' };

describe('container availability', () => {
  it('detects container items by name, type or localized name', () => {
    expect(hasContainer([backpack], 'backpack')).toBe(true);
    expect(hasContainer([backpack], 'quiver')).toBe(false);
    expect(hasContainer([quiver], 'quiver')).toBe(true);
    expect(hasContainer([{ id: 'm1', name: 'Mochila', type: 'container' }], 'backpack')).toBe(true);
    expect(hasContainer([], 'backpack')).toBe(false);
  });

  it('only enables a container zone when the matching item is carried', () => {
    const inv = createEmptyInventory();
    const [bag, quiverZone] = inv.containers;
    expect(isContainerAvailable(bag, [])).toBe(false);
    expect(isContainerAvailable(quiverZone, [])).toBe(false);
    expect(isContainerAvailable(bag, [backpack])).toBe(true);
    expect(isContainerAvailable(quiverZone, [backpack])).toBe(false);
    expect(isContainerAvailable(quiverZone, [backpack, quiver])).toBe(true);
    expect(availableContainers(inv.containers, [backpack])).toEqual([bag]);
    expect(availableContainers(inv.containers, [backpack, quiver])).toEqual([bag, quiverZone]);
  });

  it('matches custom container zones by item id or name', () => {
    expect(isContainerAvailable({ id: 'bag', name: 'Bag' }, [{ id: 'bag', name: 'Other' }])).toBe(true);
    expect(isContainerAvailable({ id: 'bag', name: 'Bag' }, [{ id: 'x', name: 'bag' }])).toBe(true);
    expect(isContainerAvailable({ id: 'bag', name: 'Bag' }, [])).toBe(false);
  });
});
