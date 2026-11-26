import { MODULE_ID } from '../constants';
import { MAX_ITEM_DIMENSION, itemDimensionsLabel, parseItemDimensions } from '../data/grid-model';
import {
  getItemGrid,
  getItemStack,
  isItemStackable,
  setItemProperties
} from '../data/inventory-service';

/** ApplicationV2 window to edit size and stacking properties of an item. */
export class ItemPropertiesApp extends foundry.applications.api.ApplicationV2 {
  item: any;

  constructor(options: any = {}) {
    super(options);
    this.item = options.item ?? null;
  }

  static DEFAULT_OPTIONS = {
    id: 'arpg-inventory-properties',
    classes: ['arpg-properties'],
    window: { title: 'ARPG Propiedades' },
    position: { width: 340, height: 'auto' }
  };

  get title() {
    return `ARPG Propiedades - ${this.item?.name ?? ''}`;
  }

  _themeClass() {
    const theme = game?.settings?.get?.(MODULE_ID, 'theme');
    return `arpginv-theme--${['light', 'dark', 'highContrast'].includes(theme) ? theme : 'light'}`;
  }

  async _renderHTML() {
    const root = document.createElement('div');
    root.className = `arpg-properties__root ${this._themeClass()}`;

    const form = document.createElement('form');
    form.className = 'arpg-properties__form';

    const sizeLabel = document.createElement('label');
    sizeLabel.className = 'arpg-properties__label';
    sizeLabel.textContent = 'Dimensiones (ancho x alto)';
    const sizeInput = document.createElement('input');
    sizeInput.type = 'text';
    sizeInput.name = 'dimensions';
    sizeInput.className = 'arpg-properties__input';
    sizeInput.value = itemDimensionsLabel(getItemGrid(this.item));
    sizeInput.placeholder = '2x4';
    sizeInput.maxLength = 10;
    sizeInput.autocomplete = 'off';
    sizeLabel.appendChild(sizeInput);

    const sizeHint = document.createElement('div');
    sizeHint.className = 'arpg-properties__hint';
    sizeHint.textContent = `Escribe por ejemplo 2x4. Valores de 1 a ${MAX_ITEM_DIMENSION}.`;

    const stackableLabel = document.createElement('label');
    stackableLabel.className = 'arpg-properties__check';
    const stackable = document.createElement('input');
    stackable.type = 'checkbox';
    stackable.name = 'stackable';
    stackable.checked = isItemStackable(this.item);
    stackableLabel.append(stackable, document.createTextNode(' Estaqueable'));

    const limitLabel = document.createElement('label');
    limitLabel.className = 'arpg-properties__label';
    limitLabel.textContent = 'Límite';
    const limit = document.createElement('input');
    limit.type = 'number';
    limit.name = 'stackLimit';
    limit.className = 'arpg-properties__input';
    limit.min = '1';
    limit.max = '99';
    limit.step = '1';
    const stack = getItemStack(this.item);
    limit.value = String(stackable.checked ? stack.max : Math.max(10, stack.max));
    limit.disabled = !stackable.checked;
    limitLabel.appendChild(limit);

    stackable.addEventListener('change', () => {
      limit.disabled = !stackable.checked;
    });

    const error = document.createElement('div');
    error.className = 'arpg-properties__error';
    error.setAttribute('role', 'alert');

    const actions = document.createElement('div');
    actions.className = 'arpg-properties__actions';
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
      const grid = parseItemDimensions(sizeInput.value);
      if (!grid) {
        error.textContent = `Usa el formato ancho x alto (1-${MAX_ITEM_DIMENSION}), por ejemplo 2x4.`;
        return;
      }
      if (stackable.checked && (!Number.isFinite(Number(limit.value)) || Number(limit.value) < 1)) {
        error.textContent = 'El límite de apilamiento debe ser al menos 1.';
        return;
      }
      const saved = await setItemProperties(this.item, {
        grid,
        stackable: stackable.checked,
        stackMax: stackable.checked ? Number(limit.value) : 1
      });
      if (!saved) {
        error.textContent = 'No tienes permiso para editar las propiedades de este objeto.';
        return;
      }
      await this.close();
    });

    form.append(sizeLabel, sizeHint, stackableLabel, limitLabel, error, actions);
    root.appendChild(form);
    return root;
  }

  _replaceHTML(element: HTMLElement, root: HTMLElement) {
    root.replaceChildren(element);
  }
}
