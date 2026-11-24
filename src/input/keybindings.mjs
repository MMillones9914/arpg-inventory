import { MODULE_ID } from '../constants.mjs';
import { log, warn } from '../utils/logger.mjs';
import { InventoryApp } from '../apps/inventory-app.mjs';

let appInstance = null;

export function registerKeybindings() {
  if (!game?.keybindings) return;
  try {
    game.keybindings.register(MODULE_ID, 'openInventory', {
      name: 'ARPGINV.Keybindings.OpenInventory.Name',
      hint: 'ARPGINV.Keybindings.OpenInventory.Hint',
      editable: [{ key: 'KeyB' }],
      onDown: () => {
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
        return true;
      },
      restricted: false
    });
    log('Keybinding registered (B)');
  } catch (e) {
    warn('Keybinding registration failed', e);
  }
}
