import { MODULE_ID } from '../constants';
import { log, warn } from '../utils/logger';
import { InventoryApp } from '../apps/inventory-app';
import { playInventorySound } from '../utils/sound';

let appInstance = null;

export function refreshInventoryForActor(actor?: any) {
  if (appInstance?.rendered && (!actor || appInstance.actor === actor)) appInstance.render();
}

function isTypingTarget(target: any): boolean {
  return !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
}

export function openInventory() {
  try {
    if (isTypingTarget(document.activeElement)) return;
    let actor = null;
    try {
      const controlled = canvas?.tokens?.controlled?.[0]?.actor;
      if (controlled) actor = controlled;
      else if (game.user?.character) actor = game.user.character;
    } catch (e) {}
    if (appInstance?.rendered && (!actor || appInstance.actor === actor)) {
      appInstance.close();
      playInventorySound('close');
      return;
    }
    if (!appInstance || (actor && appInstance.actor !== actor)) {
      if (appInstance?.rendered) appInstance.close();
      appInstance = new InventoryApp({ actor });
    }
    appInstance.render(true);
    playInventorySound('open');
  } catch (e) {
    warn('Failed to open inventory', e);
  }
}

export function registerKeybindings() {
  if (!game?.keybindings) return false;
  try {
    game.keybindings.register(MODULE_ID,'openInventory', {
      name:'ARPGINV.Keybindings.OpenInventory.Name',
      hint:'ARPGINV.Keybindings.OpenInventory.Hint',
      editable: [{ key:'KeyB' }],
      onDown: () => {
        openInventory();
        return true;
      },
      restricted: false
    });
    log('Keybinding registered (B)');
    return true;
  } catch (e) {
    warn('Keybinding registration failed', e);
    return false;
  }
}

export function registerFallbackKeydown() {
  document.addEventListener('keydown', (ev) => {
    if (ev.code !=='KeyB' || ev.repeat) return;
    if (isTypingTarget(ev.target)) return;
    openInventory();
  });
  log('Fallback keydown (B) registered');
}
