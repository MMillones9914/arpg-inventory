import { describe, it, expect } from 'vitest';
import { containerCapacity, containerSpaces, countSlot, squareGrid } from '../../src/data/container-capacity';
import { normalizedContainerLimit } from '../../src/data/containers';

describe('container capacity', () => {
  it('turns 4 lb into one cell and 40 lb into ten cells', () => {
    const small = { system: { capacity: { weight: { value: 4, units: 'lb' } } } };
    const large = { system: { capacity: { weight: { value: 40, units: 'lb' } } } };
    expect(containerSpaces(small)).toEqual({ spaces: 1, mode: 'weight', maxWeight: 4, maxCount: 0 });
    expect(containerSpaces(large)).toEqual({ spaces: 10, mode: 'weight', maxWeight: 40, maxCount: 0 });
    expect(containerCapacity(large)).toEqual({
      cols: 5, rows: 2, maxWeight: 40, spaces: 10, mode: 'weight', maxCount: 0
    });
  });

  it('caps large containers to the shared 10-column width', () => {
    const huge = { system: { capacity: { weight: { value: 300, units: 'lb' } } } };
    expect(containerCapacity(huge)).toMatchObject({ cols: 10, rows: 8, spaces: 75 });
  });

  it('uses one item-sized slot for count capacity, not one cell per item', () => {
    const quiver = {
      name: 'Quiver',
      system: { description: { value: '<p>Holds up to 20 Arrows.</p>' }, capacity: { count: 20 } }
    };
    expect(containerSpaces(quiver)).toEqual({ spaces: 1, mode: 'count', maxWeight: 0, maxCount: 20 });
    expect(countSlot(quiver)).toEqual({ cols: 1, rows: 2 });
    expect(containerCapacity(quiver)).toEqual({
      cols: 1, rows: 2, maxWeight: 0, spaces: 1, mode: 'count', maxCount: 20
    });
  });

  it('reads legacy weight and count capacities', () => {
    expect(containerSpaces({ system: { capacity: { type: 'weight', value: 30 } } }).spaces).toBe(7);
    expect(containerSpaces({ system: { capacity: { type: 'items', value: 20 } } })).toEqual({
      spaces: 1, mode: 'count', maxWeight: 0, maxCount: 20
    });
    expect(countSlot({ name: 'Generic Pouch' })).toEqual({ cols: 1, rows: 1 });
    expect(containerCapacity({ name: 'Generic Pouch', system: { capacity: { count: 10 } } })).toEqual({
      cols: 1, rows: 1, maxWeight: 0, spaces: 1, mode: 'count', maxCount: 10
    });
  });

  it('converts kilograms and parses capacity from the description', () => {
    expect(containerSpaces({ system: { capacity: { weight: { value: 1, units: 'kg' } } } }).spaces).toBe(1);
    expect(containerSpaces({ system: { description: { value: '<p>Holds up to 40 pounds.</p>' } } }).maxWeight).toBe(40);
  });

  it('keeps at least one cell for containers without declared capacity', () => {
    expect(containerCapacity({})).toEqual({ cols: 1, rows: 1, maxWeight: 4, spaces: 1, mode: 'weight', maxCount: 0 });
  });

  it('uses the most square exact factor pair', () => {
    expect(squareGrid(1)).toEqual({ cols: 1, rows: 1 });
    expect(squareGrid(10)).toEqual({ cols: 5, rows: 2 });
    expect(squareGrid(20)).toEqual({ cols: 5, rows: 4 });
    expect(squareGrid(7)).toEqual({ cols: 7, rows: 1 });
    expect(squareGrid(0)).toEqual({ cols: 1, rows: 1 });
  });

  it('clamps the GM container limit to at least one', () => {
    expect(normalizedContainerLimit(3)).toBe(3);
    expect(normalizedContainerLimit(0)).toBe(1);
    expect(normalizedContainerLimit(-5)).toBe(1);
    expect(normalizedContainerLimit(undefined)).toBe(1);
    expect(normalizedContainerLimit(2.9)).toBe(2);
  });
});
