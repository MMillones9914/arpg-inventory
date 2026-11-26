import { describe, it, expect } from 'vitest';
import {
  applyRevision,
  isStaleWrite,
  newerInventory,
  nextRevision,
  revisionOf
} from '../../src/data/inventory-sync';

describe('inventory revisions', () => {
  it('treats missing and invalid revisions as zero', () => {
    expect(revisionOf(undefined)).toBe(0);
    expect(revisionOf({ revision: -2 })).toBe(0);
    expect(revisionOf({ revision: '3' })).toBe(3);
    expect(revisionOf({ revision: 4.9 })).toBe(4);
  });

  it('detects stale writes from older local copies', () => {
    expect(isStaleWrite({ revision: 5 }, { revision: 4 })).toBe(true);
    expect(isStaleWrite({ revision: 4 }, { revision: 5 })).toBe(false);
    expect(isStaleWrite({ revision: 4 }, { revision: 4 })).toBe(false);
  });

  it('stamps the next revision and writer metadata', () => {
    expect(nextRevision({ revision: 7 }, { revision: 6 })).toBe(8);
    const stamped = applyRevision({ placements: {} }, { revision: 7 }, 'u1', 1234);
    expect(stamped).toMatchObject({
      placements: {},
      revision: 8,
      updatedBy: 'u1',
      updatedAt: 1234
    });
  });

  it('keeps the newer copy when reconciling', () => {
    const local = { revision: 2, placements: { a: 1 } };
    const remote = { revision: 3, placements: { b: 2 } };
    expect(newerInventory(local, remote)).toBe(remote);
    expect(newerInventory(remote, local)).toBe(remote);
  });
});
