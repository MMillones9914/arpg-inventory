import { MODULE_ID } from '../constants';
import { MAX_ITEM_DIMENSION, itemDimensionsLabel, parseItemDimensions } from '../data/grid-model';
import { getItemGrid, setItemGrid } from '../data/inventory-service';

/** Small ApplicationV2 window to edit an item's grid size as `WxH`. */
export class DimensionsApp extends foundry.applications.api.ApplicationV2 {
  item: any;

  constructor(options: any = {}) {
    super(options);
    this.item = options.item ?? null;
  }

  static DEFAULT_OPTIONS = {
    id: 'arpg-inventory-dimensions',
    classes: ['arpg-dimensions'],
    window: { title: 'Dimensiones del objeto' },
    position: { width: 320, height: 'auto' }
  };

  get title() {
    return `Dimensiones - ${this.item?.name ?? ''}`;
  }

  _themeClass() {
    const theme = game?.settings?.get?.(MODULE_ID, 'theme');
    return `arpginv-theme--${['light', 'dark', 'highContrast'].includes(theme) ? theme : 'light'}`;
  }

  async _renderHTML() {
    const root = document.createElement('div');
    root.className = `arpg-dimensions__root ${this._themeClass()}`;

    const form = document.createElement('form');
    form.className = 'arpg-dimensions__form';

    const label = document.createElement('label');
    label.className = 'arpg-dimensions__label';
    label.textContent = 'Dimensiones (ancho x alto)';

    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'dimensions';
    input.className = 'arpg-dimensions__input';
    input.value = itemDimensionsLabel(getItemGrid(this.item));
    input.placeholder = '2x4';
    input.maxLength = 10;
    input.autocomplete = 'off';
    label.appendChild(input);

    const hint = document.createElement('div');
    hint.className = 'arpg-dimensions__hint';
    hint.textContent = `Escribe por ejemplo 2x4. Valores de 1 a ${MAX_ITEM_DIMENSION}.`;

    const error = document.createElement('div');
    error.className = 'arpg-dimensions__error';
    error.setAttribute('role', 'alert');

    const actions = document.createElement('div');
    actions.className = 'arpg-dimensions__actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancelar';
    cancel.addEventListener('click', () => void this.close());
    const save = document.createElement('button');
    save.type = 'submit';
    save.textContent = 'Guardar';
    actions.append(cancel, save);

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      error.textContent = '';
      const parsed = parseItemDimensions(input.value);
      if (!parsed) {
        error.textContent = `Usa el formato ancho x alto (1-${MAX_ITEM_DIMENSION}), por ejemplo 2x4.`;
        return;
      }
      const saved = await setItemGrid(this.item, parsed);
      if (!saved) {
        error.textContent = 'No tienes permiso para editar las dimensiones de este objeto.';
        return;
      }
      await this.close();
    });

    form.append(label, hint, error, actions);
    root.appendChild(form);
    return root;
  }

  _replaceHTML(element: HTMLElement, root: HTMLElement) {
    root.replaceChildren(element);
  }
}
