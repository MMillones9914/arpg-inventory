import { MODULE_ID } from '../constants';
import { warn } from '../utils/logger';
import { canEditInventory } from '../data/permissions';
import { syncAttackMode } from '../data/dnd5e';
import { syncActorItems } from '../data/inventory-service';
import { notifyRemoteInventoryUpdate, refreshInventoryForActor } from '../input/keybindings';

const syncing = new WeakSet();
const INVENTORY_FLAG = `flags.${MODULE_ID}.inventory`;

function ownsChange(actor: any, userId: string) {
  return game.user?.id === userId && canEditInventory(game.user, actor);
}

/** Local writers normalize the flag; every client refreshes its open panel. */
async function syncAndRefresh(actor: any, userId: string) {
  if (ownsChange(actor, userId)) await syncActorItems(actor);
  refreshInventoryForActor(actor);
}

function touchesInventoryFlag(changes: any): boolean {
  const keys = Object.keys(changes ?? {});
  return keys.some((key) => key === INVENTORY_FLAG || key.startsWith(`${INVENTORY_FLAG}.`));
}

export function registerDnd5eHooks() {
  Hooks.on('createActor', async (actor, options, userId) => {
    if (!actor?.isOwner && !game.user?.isGM) return;
    try {
      await syncAndRefresh(actor, userId);
    } catch (e) {
      warn('createActor sync failed', e);
    }
  });

  Hooks.on('createItem', async (item, options, userId) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !== 'Actor') return;
    if (!actor.isOwner && !game.user?.isGM) return;
    if (syncing.has(actor)) return;
    syncing.add(actor);
    try {
      await syncAndRefresh(actor, userId);
    } catch (e) {
      warn('createItem sync failed', e);
    } finally {
      syncing.delete(actor);
    }
  });

  Hooks.on('deleteItem', async (item, options, userId) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !== 'Actor') return;
    if (!actor.isOwner && !game.user?.isGM) return;
    if (syncing.has(actor)) return;
    syncing.add(actor);
    try {
      await syncAndRefresh(actor, userId);
    } catch (e) {
      warn('deleteItem sync failed', e);
    } finally {
      syncing.delete(actor);
    }
  });

  Hooks.on('updateActor', async (actor, changes, options, userId) => {
    if (!actor?.isOwner && !game.user?.isGM) return;
    const keys = Object.keys(changes ?? {});
    const touchesStrength = keys.some((key) => /^system\.(abilities\.str|attributes\.encumbrance)/.test(key))
      || !!changes?.system?.abilities?.str
      || !!changes?.system?.attributes?.encumbrance;
    const flagChange = touchesInventoryFlag(changes);
    if (!touchesStrength && !flagChange) return;
    if (syncing.has(actor)) return;
    syncing.add(actor);
    try {
      if (flagChange && game.user?.id !== userId) {
        // Another client won the revision race; keep its version and reload.
        notifyRemoteInventoryUpdate(actor);
      } else if (touchesStrength) {
        await syncAndRefresh(actor, userId);
      }
    } catch (e) {
      warn('updateActor sync failed', e);
    } finally {
      syncing.delete(actor);
    }
  });

  Hooks.on('updateItem', async (item, changes, options, userId) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !== 'Actor') return;
    if (!actor.isOwner && !game.user?.isGM) return;
    const fields = ['container', 'equipped', 'quantity', 'attunement', 'uses', 'type', 'rarity', 'damage', 'attack'];
    const keys = Object.keys(changes ?? {});
    const touchesData = keys
      .some((key) => fields.some((field) => key === `system.${field}` || key.startsWith(`system.${field}.`)))
      || fields.some((field) => field in (changes?.system ?? {}));
    const touchesHands = keys.some((key) => key === `flags.${MODULE_ID}.twoHanded`);
    const touchesGrid = keys.some((key) => key === `flags.${MODULE_ID}.grid`);
    if (!touchesData && !touchesHands && !touchesGrid) return;
    if (touchesHands && ownsChange(actor, userId)) {
      await syncAttackMode(item, item.getFlag?.(MODULE_ID, 'twoHanded') === true);
    }
    if (syncing.has(actor)) return;
    syncing.add(actor);
    try {
      await syncAndRefresh(actor, userId);
    } catch (e) {
      warn('updateItem sync failed', e);
    } finally {
      syncing.delete(actor);
    }
  });
}
