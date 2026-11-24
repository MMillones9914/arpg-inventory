// Pure grid engine. No Foundry globals. Unit-testable.

function cellKey(x, y) {
  return `${x},${y}`;
}

export function dimensions(grid, rotated = false) {
  return rotated
    ? { w: grid.h, h: grid.w }
    : { w: grid.w, h: grid.h };
}

export function occupiedCells(x, y, grid, rotated = false) {
  const { w, h } = dimensions(grid, rotated);
  const cells = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      cells.push({ x: x + dx, y: y + dy });
    }
  }
  return cells;
}

export function createGridState(cols, rows) {
  return { cols, rows, cells: {}, placements: {} };
}

export function canPlace(state, grid, x, y, rotated = false) {
  const { w, h } = dimensions(grid, rotated);
  if (x < 0 || y < 0 || x + w > state.cols || y + h > state.rows) return false;
  const cells = occupiedCells(x, y, grid, rotated);
  return cells.every((c) => !state.cells[cellKey(c.x, c.y)]);
}

export function placeItem(state, token, x, y, rotated = false) {
  if (!canPlace(state, token.grid, x, y, rotated)) return null;
  const { w, h } = dimensions(token.grid, rotated);
  const cells = occupiedCells(x, y, token.grid, rotated);
  const next = {
    cols: state.cols,
    rows: state.rows,
    cells: { ...state.cells },
    placements: { ...state.placements }
  };
  for (const c of cells) next.cells[cellKey(c.x, c.y)] = token.id;
  next.placements[token.id] = {
    x,
    y,
    rotated,
    w,
    h,
    stackKey: token.stackKey ?? token.id,
    stack: { current: token.stack?.current ?? 1, max: token.stack?.max ?? 1 }
  };
  return next;
}

export function removeItem(state, id) {
  const placement = state.placements[id];
  if (!placement) return state;
  const next = {
    cols: state.cols,
    rows: state.rows,
    cells: { ...state.cells },
    placements: { ...state.placements }
  };
  for (let dy = 0; dy < placement.h; dy++) {
    for (let dx = 0; dx < placement.w; dx++) {
      delete next.cells[cellKey(placement.x + dx, placement.y + dy)];
    }
  }
  delete next.placements[id];
  return next;
}

export function rotateItem(state, id) {
  const placement = state.placements[id];
  if (!placement) return null;
  // Need grid dims; derive from placement w/h (rotated dims stored). Rotating swaps back? We store current w/h already.
  // We need original rotatable; assume yes. Try remove + place with swapped dims.
  const currentGrid = { w: placement.w, h: placement.h, rotatable: true };
  const rotatedGrid = { w: placement.h, h: placement.w, rotatable: true };
  const removed = removeItem(state, id);
  const placed = placeItem(removed, { id, grid: rotatedGrid, stack: placement.stack, stackKey: placement.stackKey }, placement.x, placement.y, false);
  if (!placed) return null;
  // mark rotated flag: if original placement.rotated toggled
  placed.placements[id].rotated = !placement.rotated;
  return placed;
}

export function findFirstAvailable(state, grid, rotated = false) {
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      if (canPlace(state, grid, x, y, rotated)) return { x, y };
    }
  }
  return null;
}

// Stack-aware placement: if cannot place, try to stack onto an existing item
// occupying (x,y) with the same stackKey and enough remaining capacity.
export function placeOrStack(state, token, x, y, rotated = false) {
  if (canPlace(state, token.grid, x, y, rotated)) {
    return { state: placeItem(state, token, x, y, rotated), consumed: false, targetId: token.id };
  }

  // Determine target item at (x,y)
  const key = cellKey(x, y);
  const targetId = state.cells[key];
  if (!targetId) return null;
  const target = state.placements[targetId];
  if (!target) return null;
  if (target.stackKey !== (token.stackKey ?? token.id)) return null;
  const remaining = target.stack.max - target.stack.current;
  if (remaining < (token.stack?.current ?? 1)) return null;

  const next = {
    cols: state.cols,
    rows: state.rows,
    cells: { ...state.cells },
    placements: { ...state.placements }
  };
  next.placements[targetId] = {
    ...target,
    stack: {
      current: target.stack.current + (token.stack?.current ?? 1),
      max: target.stack.max
    }
  };
  return { state: next, consumed: true, targetId };
}

// Split a stack into a new item id, placing the split portion in the first
// available cell. Returns { state, placement } or null if not possible.
export function splitStack(state, id, amount, newId) {
  const placement = state.placements[id];
  if (!placement) return null;
  if (amount <= 0 || amount >= placement.stack.current) return null;
  if (placement.stack.current - amount < 1) return null;

  const grid = { w: placement.w, h: placement.h, rotatable: true };
  const spot = findFirstAvailable(state, grid, false);
  if (!spot) return null;

  const removed = removeItem(state, id);
  // re-add original with reduced stack
  const originalGrid = { w: placement.w, h: placement.h, rotatable: true };
  const originalToken = {
    id,
    grid: originalGrid,
    stack: { current: placement.stack.current - amount, max: placement.stack.max },
    stackKey: placement.stackKey
  };
  const afterOriginal = placeItem(removed, originalToken, placement.x, placement.y, placement.rotated);
  if (!afterOriginal) return null;

  const newToken = {
    id: newId,
    grid: originalGrid,
    stack: { current: amount, max: placement.stack.max },
    stackKey: placement.stackKey
  };
  const final = placeItem(afterOriginal, newToken, spot.x, spot.y, false);
  if (!final) return null;
  return { state: final, placement: final.placements[newId] };
}
