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

  game.settings.register(MODULE_ID, 'defaultCapacityMode', {
    name: 'ARPGINV.Settings.CapacityMode.Name',
    hint: 'ARPGINV.Settings.CapacityMode.Hint',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      strength: 'ARPGINV.Settings.CapacityMode.ChoiceStrength',
      manual: 'ARPGINV.Settings.CapacityMode.ChoiceManual'
    },
    default: 'manual'
  });

  game.settings.register(MODULE_ID, 'defaultCols', {
    name: 'ARPGINV.Settings.DefaultCols.Name',
    hint: 'ARPGINV.Settings.DefaultCols.Hint',
    scope: 'world',
    config: true,
    type: Number,
    default: 10
  });

  game.settings.register(MODULE_ID, 'defaultRows', {
    name: 'ARPGINV.Settings.DefaultRows.Name',
    hint: 'ARPGINV.Settings.DefaultRows.Hint',
    scope: 'world',
    config: true,
    type: Number,
    default: 6
  });

  game.settings.register(MODULE_ID, 'defaultMaxWeight', {
    name: 'ARPGINV.Settings.DefaultMaxWeight.Name',
    hint: 'ARPGINV.Settings.DefaultMaxWeight.Hint',
    scope: 'world',
    config: true,
    type: Number,
    default: 100
  });
}
