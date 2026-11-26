// Pure revision helpers for optimistic inventory writes. No Foundry globals.

export interface InventoryWriteResult {
  applied: boolean;
  conflict?: boolean;
  data?: any;
  current?: any;
}

export function revisionOf(inv: any): number {
  const value = Math.floor(Number(inv?.revision));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** True when another client already wrote a newer version of the inventory. */
export function isStaleWrite(current: any, incoming: any): boolean {
  return revisionOf(current) > revisionOf(incoming);
}

export function nextRevision(current: any, incoming: any): number {
  return Math.max(revisionOf(current), revisionOf(incoming)) + 1;
}

/** Stamp an inventory with the next revision before persisting it. */
export function applyRevision(inv: any, current: any, userId: string | null, now = Date.now()) {
  return {
    ...inv,
    revision: nextRevision(current, inv),
    updatedBy: userId ?? null,
    updatedAt: now
  };
}

/** Prefer the newer inventory when reconciling local and remote copies. */
export function newerInventory(local: any, remote: any) {
  return revisionOf(remote) > revisionOf(local) ? remote : local;
}
