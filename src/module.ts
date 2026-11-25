import { MODULE_ID, MODULE_TITLE } from './constants';
import { registerSettings } from './settings';
import { registerDnd5eHooks } from './hooks/dnd5e-hooks';
import { registerUiHooks } from './hooks/ui-hooks';
import { registerKeybindings, registerFallbackKeydown } from './input/keybindings';
import { log } from './utils/logger';

// Ensure the grid engine is bundled with the module.
import './engine/grid-engine';

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
