import { describe, it, expect } from 'vitest';
import { pointToCell } from '../../src/engine/grid-geometry';

const geometry = { left: 100, top: 200, stepX: 36, stepY: 36, cols: 3, rows: 2 };

describe('grid-geometry', () => {
  it('maps viewport coordinates to the correct cell', () => {
    expect(pointToCell(geometry, 110, 210)).toEqual({ x: 0, y: 0 });
    expect(pointToCell(geometry, 150, 210)).toEqual({ x: 1, y: 0 });
    expect(pointToCell(geometry, 187, 245)).toEqual({ x: 2, y: 1 });
  });

  it('resolves the CSS gap to the nearest cell and never falls back to (0,0)', () => {
    expect(pointToCell(geometry, 135, 210)).toEqual({ x: 0, y: 0 });
    expect(pointToCell(geometry, 136, 210)).toEqual({ x: 1, y: 0 });
  });

  it('returns null outside the grid or with invalid geometry', () => {
    expect(pointToCell(geometry, 99, 210)).toBeNull();
    expect(pointToCell(geometry, 208, 210)).toBeNull();
    expect(pointToCell(geometry, 110, 272)).toBeNull();
    expect(pointToCell({ ...geometry, stepX: 0 }, 110, 210)).toBeNull();
  });
});
