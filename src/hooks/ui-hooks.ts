import { log } from '../utils/logger';
import { InventoryApp } from '../apps/inventory-app';
import { ItemPropertiesApp } from '../apps/item-properties-app';

const PROPERTIES_LABEL = 'ARPG Propiedades';
const PROPERTIES_ICON = 'icons/svg/stone-path.svg';

function sheetRoot(html: any): HTMLElement | null {
  if (html instanceof HTMLElement) return html;
  const root = html?.[0] ?? html;
  return root?.querySelector ? root : null;
}

function headerIn(root: HTMLElement): HTMLElement | null {
  return root.querySelector('.window-header') ?? root.querySelector('header');
}

function itemFromApp(app: any): any {
  const candidate = app?.item ?? app?.document;
  return candidate?.documentName === 'Item' ? candidate : null;
}

function propertiesButton(item: any, className: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  const icon = document.createElement('img');
  icon.src = PROPERTIES_ICON;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  btn.append(icon, document.createTextNode(` ${PROPERTIES_LABEL}`));
  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    new ItemPropertiesApp({ item }).render(true);
  });
  return btn;
}

/** Foundry 14 exposes the header 3-dots menu through `window.controls`. */
function addToOpenControlsMenu(item: any) {
  const menus = Array.from(document.querySelectorAll<HTMLElement>(
    '.context-menu, [class*="context-menu"], .dropdown-menu'
  )).filter((menu) => menu.getClientRects().length > 0);
  const menu = menus[menus.length - 1];
  if (!menu || menu.textContent?.includes(PROPERTIES_LABEL)) return;
  const list = menu.querySelector<HTMLElement>('ol, ul, [role="list"]') ?? menu;
  const entry = document.createElement('li');
  entry.className = 'context-item arpg-properties-menu-item';
  entry.appendChild(propertiesButton(item, 'arpg-properties-menu-btn'));
  list.appendChild(entry);
}

function bindControlsMenu(control: any, item: any) {
  if (!(control instanceof HTMLElement) || control.dataset.arpgPropertiesBound === '1') return;
  control.dataset.arpgPropertiesBound = '1';
  control.addEventListener('click', () => {
    setTimeout(() => addToOpenControlsMenu(item), 40);
  }, true);
}

export function registerUiHooks() {
  const injectInventory = (app: any, html: any) => {
    // Never inject into the inventory window itself (it also has `actor`).
    if (!app || app instanceof InventoryApp || app?.id === 'arpg-inventory-inventory') return;
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.documentName !== 'Actor') return;
    const root = sheetRoot(html);
    if (!root || root.classList?.contains('arpg-inventory')) return;
    if (root.querySelector('.arpg-open-btn')) return;
    const header = headerIn(root);
    if (!header) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arpg-open-btn';
    btn.textContent = 'Inventory (B)';
    btn.addEventListener('click', () => {
      new InventoryApp({ actor }).render(true);
    });
    header.appendChild(btn);
    log('Injected inventory button');
  };

  const injectProperties = (app: any, html: any) => {
    if (!app || app instanceof ItemPropertiesApp || app?.id === 'arpg-inventory-properties') return;
    const item = itemFromApp(app);
    if (!item) return;
    const root = sheetRoot(html);
    if (!root || root.classList?.contains('arpg-inventory')) return;
    if (!root.querySelector('.arpg-properties-btn')) {
      const header = headerIn(root);
      if (header) {
        header.appendChild(propertiesButton(item, 'arpg-properties-btn'));
        log('Injected ARPG properties button');
      }
    }
    bindControlsMenu(app?.window?.controls, item);
    root.querySelectorAll<HTMLElement>('[data-context-menu]').forEach((control) => {
      bindControlsMenu(control, item);
    });
  };

  Hooks.on('renderActorSheet', injectInventory);
  Hooks.on('renderActorSheetV2', injectInventory);
  Hooks.on('renderItemSheet', injectProperties);
  Hooks.on('renderItemSheetV2', injectProperties);
  Hooks.on('renderApplicationV2', (app: any, html: any) => {
    injectInventory(app, html);
    injectProperties(app, html);
  });
}
