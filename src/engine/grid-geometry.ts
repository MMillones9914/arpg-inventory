// Pure geometry helpers for the inventory grid. No Foundry globals.

export interface GridPoint {
  x: number;
  y: number;
}

export interface GridGeometry {
  left: number;
  top: number;
  stepX: number;
  stepY: number;
  cols: number;
  rows: number;
}

/**
 * Convert viewport coordinates into a grid cell.
 * `stepX/stepY` include the CSS gap so clicks in the gutter resolve to the
 * nearest real cell instead of falling through to (0,0).
 */
export function pointToCell(geometry: GridGeometry, clientX: number, clientY: number): GridPoint | null {
  const { left, top, stepX, stepY, cols, rows } = geometry;
  if (!Number.isFinite(stepX) || !Number.isFinite(stepY) || stepX <= 0 || stepY <= 0) return null;
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
  if (cols <= 0 || rows <= 0) return null;

  const x = Math.floor((clientX - left) / stepX);
  const y = Math.floor((clientY - top) / stepY);
  if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
  return { x, y };
}
