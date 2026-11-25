import { MODULE_ID } from '../constants';
import { log, warn } from '../utils/logger';
import { InventoryApp } from '../apps/inventory-app';

let appInstance = null;

export function openInventory() {
  try {
    let actor = null;
    try {
      const controlled = canvas?.tokens?.controlled?.[0]?.actor;
      if (controlled) actor = controlled;
      else if (game.user?.character) actor = game.user.character;
    } catch (e) {}
    if (!appInstance || (actor && appInstance.actor !== actor)) {
      appInstance = new InventoryApp({ actor });
    }
    appInstance.render(true);
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
    const target = ev.target as any;
    if (target && (target.tagName ==='INPUT' || target.tagName ==='TEXTAREA' || target.isContentEditable)) return;
    openInventory();
  });
  log('Fallback keydown (B) registered');
}
