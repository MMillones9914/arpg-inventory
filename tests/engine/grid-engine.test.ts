import { describe, it, expect } from 'vitest';
import {
  createGridState,
  canPlace,
  placeItem,
  removeItem,
  rotateItem,
  findFirstAvailable,
  placeOrStack,
  splitStack,
  dimensions
} from '../../src/engine/grid-engine';

describe('grid-engine', () => {
  it('places and removes items', () => {
    const state = createGridState(5, 5);
    const grid = { w: 2, h: 1, rotatable: true };
    const placed = placeItem(state, { id:'a', grid, stack: { current: 1, max: 1 } }, 0, 0);
    expect(placed).not.toBeNull();
    expect(canPlace(placed, grid, 0, 0)).toBe(false);
    const removed = removeItem(placed,'a');
    expect(canPlace(removed, grid, 0, 0)).toBe(true);
  });

  it('detects collision and bounds', () => {
    const state = createGridState(3, 3);
    const grid = { w: 2, h: 2, rotatable: true };
    const placed = placeItem(state, { id:'a', grid, stack: { current: 1, max: 1 } }, 2, 2);
    expect(placed).toBeNull(); // out of bounds
    const placed2 = placeItem(state, { id:'a', grid, stack: { current: 1, max: 1 } }, 0, 0);
    const placed3 = placeItem(placed2, { id:'b', grid, stack: { current: 1, max: 1 } }, 1, 1);
    expect(placed3).toBeNull(); // overlap
  });

  it('rotates item', () => {
    const state = createGridState(5, 5);
    const grid = { w: 2, h: 1, rotatable: true };
    const placed = placeItem(state, { id:'a', grid, stack: { current: 1, max: 1 } }, 0, 0);
    const rotated = rotateItem(placed,'a');
    expect(rotated).not.toBeNull();
    expect(rotated.placements.a.w).toBe(1);
    expect(rotated.placements.a.h).toBe(2);
  });

  it('finds first available', () => {
    const state = createGridState(3, 3);
    const grid = { w: 1, h: 1, rotatable: true };
    const placed = placeItem(state, { id:'a', grid, stack: { current: 1, max: 1 } }, 0, 0);
    const spot = findFirstAvailable(placed, grid);
    expect(spot).toEqual({ x: 1, y: 0 });
  });

  it('stacks items', () => {
    const state = createGridState(5, 5);
    const grid = { w: 1, h: 1, rotatable: true };
    const placed = placeItem(state, { id:'a', grid, stack: { current: 1, max: 5 }, stackKey:'potion' }, 0, 0);
    const res = placeOrStack(placed, { id:'b', grid, stack: { current: 2, max: 5 }, stackKey:'potion' }, 0, 0);
    expect(res).not.toBeNull();
    expect(res.consumed).toBe(true);
    expect(res.state.placements.a.stack.current).toBe(3);
  });

  it('splits stack', () => {
    const state = createGridState(5, 5);
    const grid = { w: 1, h: 1, rotatable: true };
    const placed = placeItem(state, { id:'a', grid, stack: { current: 5, max: 5 }, stackKey:'potion' }, 0, 0);
    const res = splitStack(placed,'a', 2,'b');
    expect(res).not.toBeNull();
    expect(res.state.placements.a.stack.current).toBe(3);
    expect(res.state.placements.b.stack.current).toBe(2);
  });

  it('dimensions helper', () => {
    expect(dimensions({ w: 2, h: 3 }, true)).toEqual({ w: 3, h: 2 });
  });
});
