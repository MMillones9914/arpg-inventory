import { describe, it, expect } from 'vitest';
import { canEditInventory, canViewInventory, isActorOwner } from '../../src/data/permissions';

describe('inventory permissions', () => {
  it('lets the GM edit every actor, even without an explicit actor', () => {
    expect(canEditInventory({ isGM: true })).toBe(true);
    expect(canEditInventory({ isGM: true }, { isOwner: false })).toBe(true);
    expect(isActorOwner({ isGM: true }, null)).toBe(true);
  });

  it('lets a player edit only actors they own', () => {
    const player = { id: 'p1', isGM: false };
    expect(canEditInventory(player, { isOwner: true })).toBe(true);
    expect(canEditInventory(player, { isOwner: false })).toBe(false);
    expect(canEditInventory(player)).toBe(false);
  });

  it('reads ownership from the ownership map as a fallback', () => {
    const player = { id: 'p1', isGM: false };
    expect(isActorOwner(player, { ownership: { p1: 3, default: 0 } })).toBe(true);
    expect(isActorOwner(player, { ownership: { p1: 2, default: 0 } })).toBe(false);
    expect(isActorOwner(player, { ownership: { default: 3 } })).toBe(true);
  });

  it('allows observers to view but not edit', () => {
    const player = { id: 'p1', isGM: false };
    const actor = { isOwner: false, isVisible: true, testUserPermission: (u: any, level: string) => level === 'OBSERVER' };
    expect(canViewInventory(player, actor)).toBe(true);
    expect(canEditInventory(player, actor)).toBe(false);
    expect(canViewInventory(player, { isVisible: false, isOwner: true })).toBe(false);
  });
});
