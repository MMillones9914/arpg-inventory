import { MODULE_ID } from './constants';
import { refreshInventoryForActor } from './input/keybindings';

export function registerSettings() {
  game.settings.register(MODULE_ID, 'defaultCapacityMode', {
    name:'ARPGINV.Settings.CapacityMode.Name',
    hint:'ARPGINV.Settings.CapacityMode.Hint',
    scope:'world',
    config: true,
    type: String,
    choices: {
      strength:'ARPGINV.Settings.CapacityMode.ChoiceStrength',
      manual:'ARPGINV.Settings.CapacityMode.ChoiceManual'
    },
    default:'manual'
  });

  game.settings.register(MODULE_ID,'defaultCols', {
    name:'ARPGINV.Settings.DefaultCols.Name',
    hint:'ARPGINV.Settings.DefaultCols.Hint',
    scope:'world',
    config: true,
    type: Number,
    default: 10
  });

  game.settings.register(MODULE_ID,'defaultRows', {
    name:'ARPGINV.Settings.DefaultRows.Name',
    hint:'ARPGINV.Settings.DefaultRows.Hint',
    scope:'world',
    config: true,
    type: Number,
    default: 6
  });

  game.settings.register(MODULE_ID,'defaultMaxWeight', {
    name:'ARPGINV.Settings.DefaultMaxWeight.Name',
    hint:'ARPGINV.Settings.DefaultMaxWeight.Hint',
    scope:'world',
    config: true,
    type: Number,
    default: 100
  });

  game.settings.register(MODULE_ID, 'maxContainers', {
    name: 'ARPGINV.Settings.MaxContainers.Name',
    hint: 'ARPGINV.Settings.MaxContainers.Hint',
    scope: 'world',
    config: true,
    type: Number,
    default: 5
  });

  // M7 — UX, accessibility & theming.
  game.settings.register(MODULE_ID, 'theme', {
    name: 'ARPGINV.Settings.Theme.Name',
    hint: 'ARPGINV.Settings.Theme.Hint',
    scope: 'client',
    config: true,
    type: String,
    choices: {
      light: 'ARPGINV.Settings.Theme.ChoiceLight',
      dark: 'ARPGINV.Settings.Theme.ChoiceDark',
      highContrast: 'ARPGINV.Settings.Theme.ChoiceHighContrast'
    },
    default: 'light',
    onChange: () => refreshInventoryForActor()
  });

  game.settings.register(MODULE_ID, 'sounds', {
    name: 'ARPGINV.Settings.Sounds.Name',
    hint: 'ARPGINV.Settings.Sounds.Hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
  });
}
