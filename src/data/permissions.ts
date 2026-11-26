// Pure Foundry permission rules. No direct Foundry globals, safe to unit-test.

/** Owner-level permission, including GMs on any actor. */
export function isActorOwner(user: any, actor: any): boolean {
  if (!user) return false;
  if (user.isGM) return true;
  if (!actor) return false;
  if (typeof actor.isOwner === 'boolean') return actor.isOwner;
  if (typeof actor.testUserPermission === 'function') {
    return actor.testUserPermission(user, 'OWNER') === true;
  }
  const ownership = actor.ownership ?? actor.permission;
  if (ownership && typeof ownership === 'object') {
    const level = Number(ownership[user.id] ?? ownership.default ?? 0);
    return level >= 3;
  }
  return false;
}

/** The GM edits every actor; a player only edits actors they own. */
export function canEditInventory(user: any, actor?: any): boolean {
  if (!user) return false;
  if (user.isGM) return true;
  return isActorOwner(user, actor);
}

/** Read-only access is enough to open the panel and inspect the inventory. */
export function canViewInventory(user: any, actor?: any): boolean {
  if (!user) return false;
  if (user.isGM) return true;
  if (!actor) return false;
  if (typeof actor.isVisible === 'boolean' && actor.isVisible === false) return false;
  return isActorOwner(user, actor)
    || (typeof actor.testUserPermission === 'function'
      ? actor.testUserPermission(user, 'OBSERVER') === true
      : false);
}
