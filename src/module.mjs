import { MODULE_ID, MODULE_TITLE } from './constants.mjs';
import { registerSettings } from './settings.mjs';
import { registerDnd5eHooks } from './hooks/dnd5e-hooks.mjs';
import { log } from './utils/logger.mjs';

Hooks.once('init', () => {
  log(`Initializing ${MODULE_TITLE}`);
  registerSettings();
});

Hooks.once('ready', () => {
  log('Ready');
  registerDnd5eHooks();
});
