import { MODULE_ID } from '../constants';
import { log, warn } from '../utils/logger';
import { syncActorItems } from '../data/inventory-service';

const syncing = new WeakSet();

export function registerDnd5eHooks() {
  Hooks.on('createActor', async (actor, options, userId) => {
    if (game.user?.id !== userId) return;
    if (!actor?.isOwner && !game.user?.isGM) return;
    try {
      await syncActorItems(actor);
    } catch (e) {
      warn('createActor sync failed', e);
    }
  });

  Hooks.on('createItem', async (item, options, userId) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !=='Actor') return;
    if (game.user?.id !== userId) return;
    if (!actor.isOwner && !game.user?.isGM) return;
    if (syncing.has(actor)) return;
    syncing.add(actor);
    try {
      await syncActorItems(actor);
    } catch (e) {
      warn('createItem sync failed', e);
    } finally {
      syncing.delete(actor);
    }
  });

  Hooks.on('deleteItem', async (item, options, userId) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !=='Actor') return;
    if (game.user?.id !== userId) return;
    if (!actor.isOwner && !game.user?.isGM) return;
    if (syncing.has(actor)) return;
    syncing.add(actor);
    try {
      await syncActorItems(actor);
    } catch (e) {
      warn('deleteItem sync failed', e);
    } finally {
      syncing.delete(actor);
    }
  });

  Hooks.on('updateActor', async (actor, changes, options, userId) => {
    if (game.user?.id !== userId) return;
    if (!actor?.isOwner && !game.user?.isGM) return;
    const touchesStrength = changes?.system?.abilities?.str || changes?.system?.attributes?.encumbrance;
    if (!touchesStrength) return;
    if (syncing.has(actor)) return;
    syncing.add(actor);
    try {
      await syncActorItems(actor);
    } catch (e) {
      warn('updateActor sync failed', e);
    } finally {
      syncing.delete(actor);
    }
  });
}
