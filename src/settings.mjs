import { MODULE_ID } from './constants.mjs';

export function registerSettings() {
  game.settings.register(MODULE_ID, 'debug', {
    name: 'ARPGINV.Settings.Debug.Name',
    hint: 'ARPGINV.Settings.Debug.Hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });
}
