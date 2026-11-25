import { MODULE_ID } from '../constants';
import { warn } from '../utils/logger';
import { syncActorItems } from '../data/inventory-service';
import { refreshInventoryForActor } from '../input/keybindings';

const syncing = new WeakSet();

export function registerDnd5eHooks() {
  Hooks.on('createActor', async (actor, options, userId) => {
    if (game.user?.id !== userId) return;
    if (!actor?.isOwner && !game.user?.isGM) return;
    try {
      await syncActorItems(actor);
      refreshInventoryForActor(actor);
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
      refreshInventoryForActor(actor);
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
      refreshInventoryForActor(actor);
    } catch (e) {
      warn('deleteItem sync failed', e);
    } finally {
      syncing.delete(actor);
    }
  });

  Hooks.on('updateActor', async (actor, changes, options, userId) => {
    if (game.user?.id !== userId) return;
    if (!actor?.isOwner && !game.user?.isGM) return;
    const changeKeys = Object.keys(changes ?? {});
    const touchesStrength = changeKeys.some((key) => /^system\.(abilities\.str|attributes\.encumbrance)/.test(key))
      || !!changes?.system?.abilities?.str
      || !!changes?.system?.attributes?.encumbrance;
    if (!touchesStrength) return;
    if (syncing.has(actor)) return;
    syncing.add(actor);
    try {
      await syncActorItems(actor);
      refreshInventoryForActor(actor);
    } catch (e) {
      warn('updateActor sync failed', e);
    } finally {
      syncing.delete(actor);
    }
  });

  Hooks.on('updateItem', async (item, changes, options, userId) => {
    const actor = item?.parent;
    if (!actor || actor.documentName !== 'Actor') return;
    if (game.user?.id !== userId) return;
    if (!actor.isOwner && !game.user?.isGM) return;
    const fields = ['quantity', 'attunement', 'uses', 'type', 'rarity', 'damage', 'attack'];
    const touchesData = Object.keys(changes ?? {})
      .some((key) => fields.some((field) => key === `system.${field}` || key.startsWith(`system.${field}.`)))
      || fields.some((field) => field in (changes?.system ?? {}));
    if (!touchesData) return;
    if (syncing.has(actor)) return;
    syncing.add(actor);
    try {
      await syncActorItems(actor);
      refreshInventoryForActor(actor);
    } catch (e) {
      warn('updateItem sync failed', e);
    } finally {
      syncing.delete(actor);
    }
  });
}
