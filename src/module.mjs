import { MODULE_ID, MODULE_TITLE } from './constants.mjs';
import { registerSettings } from './settings.mjs';
import { log } from './utils/logger.mjs';

Hooks.once('init', () => {
  log(`Initializing ${MODULE_TITLE}`);
  registerSettings();
});

Hooks.once('ready', () => {
  log('Ready');
  // Bootstrap placeholder: InventoryApp is available for later milestones.
});
