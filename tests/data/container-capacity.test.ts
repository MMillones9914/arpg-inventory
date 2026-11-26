import { describe, it, expect } from 'vitest';
import { containerCapacity, containerSpaces, squareGrid } from '../../src/data/container-capacity';
import { normalizedContainerLimit } from '../../src/data/containers';

describe('container capacity', () => {
  it('turns 4 lb into one cell and 40 lb into ten cells', () => {
    const small = { system: { capacity: { weight: { value: 4, units: 'lb' } } } };
    const large = { system: { capacity: { weight: { value: 40, units: 'lb' } } } };
    expect(containerSpaces(small)).toEqual({ spaces: 1, mode: 'weight', maxWeight: 4 });
    expect(containerSpaces(large)).toEqual({ spaces: 10, mode: 'weight', maxWeight: 40 });
    expect(containerCapacity(large)).toEqual({ cols: 5, rows: 2, maxWeight: 40, spaces: 10, mode: 'weight' });
  });

  it('reads legacy weight and count capacities', () => {
    expect(containerSpaces({ system: { capacity: { type: 'weight', value: 30 } } }).spaces).toBe(7);
    expect(containerSpaces({ system: { capacity: { type: 'items', value: 20 } } })).toEqual({
      spaces: 20, mode: 'count', maxWeight: 20
    });
    expect(containerCapacity({ system: { capacity: { count: 20 } } })).toEqual({
      cols: 5, rows: 4, maxWeight: 20, spaces: 20, mode: 'count'
    });
  });

  it('converts kilograms and parses capacity from the description', () => {
    expect(containerSpaces({ system: { capacity: { weight: { value: 1, units: 'kg' } } } }).spaces).toBe(1);
    expect(containerSpaces({ system: { description: { value: '<p>Holds up to 40 pounds.</p>' } } }).maxWeight).toBe(40);
  });

  it('keeps at least one cell for containers without declared capacity', () => {
    expect(containerCapacity({})).toEqual({ cols: 1, rows: 1, maxWeight: 4, spaces: 1, mode: 'weight' });
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
