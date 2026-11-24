import { MODULE_ID, MODULE_TITLE } from './constants.mjs';
import { registerSettings } from './settings.mjs';
import { registerDnd5eHooks } from './hooks/dnd5e-hooks.mjs';
import { registerUiHooks } from './hooks/ui-hooks.mjs';
import { registerKeybindings, registerFallbackKeydown } from './input/keybindings.mjs';
import { log } from './utils/logger.mjs';

// Ensure the grid engine is bundled with the module.
import './engine/grid-engine.mjs';

Hooks.once('init', () => {
  log(`Initializing ${MODULE_TITLE}`);
  registerSettings();
  registerUiHooks();
});

Hooks.once('ready', () => {
  log('Ready');
  registerDnd5eHooks();
  registerKeybindings();
  registerFallbackKeydown();
});
