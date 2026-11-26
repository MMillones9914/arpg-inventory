import { describe, it, expect } from 'vitest';
import {
  availableContainers,
  findContainerItem,
  hasContainer,
  isContainerAvailable
} from '../../src/data/containers';
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

  it('enables the backpack with any container-type item, but keeps quivers separate', () => {
    const sack = { id: 'sack', name: 'Sack', type: 'container' };
    const quiverContainer = { id: 'q', name: 'Quiver', type: 'container' };
    expect(hasContainer([sack], 'backpack')).toBe(true);
    expect(hasContainer([quiverContainer], 'backpack')).toBe(false);
    expect(hasContainer([quiverContainer], 'quiver')).toBe(true);
    expect(hasContainer([{ id: 'x', name: 'Carcaj' }], 'quiver')).toBe(true);
  });

  it('uses the carried container item image for the zone icon', () => {
    const inv = createEmptyInventory();
    const [bag, quiverZone] = inv.containers;
    const sack = { id: 'sack', name: 'Sack', type: 'container', img: 'icons/sack.webp' };
    const namedQuiver = { id: 'q', name: 'Quiver', type: 'equipment', img: 'icons/quiver.webp' };
    expect(findContainerItem(bag, [sack])).toBe(sack);
    expect(findContainerItem(bag, [sack])?.img).toBe('icons/sack.webp');
    expect(findContainerItem(quiverZone, [namedQuiver])).toBe(namedQuiver);
    expect(findContainerItem(bag, [])).toBeNull();
    expect(findContainerItem(quiverZone, [])).toBeNull();
  });

  it('matches custom container zones by item id or name', () => {
    expect(isContainerAvailable({ id: 'bag', name: 'Bag' }, [{ id: 'bag', name: 'Other' }])).toBe(true);
    expect(isContainerAvailable({ id: 'bag', name: 'Bag' }, [{ id: 'x', name: 'bag' }])).toBe(true);
    expect(isContainerAvailable({ id: 'bag', name: 'Bag' }, [])).toBe(false);
  });
});
