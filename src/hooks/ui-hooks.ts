import { log } from '../utils/logger';
import { InventoryApp } from '../apps/inventory-app';
import { DimensionsApp } from '../apps/dimensions-app';

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

  const injectDimensions = (app: any, html: any) => {
    if (!app || app instanceof DimensionsApp || app?.id === 'arpg-inventory-dimensions') return;
    const item = itemFromApp(app);
    if (!item) return;
    const root = sheetRoot(html);
    if (!root || root.classList?.contains('arpg-inventory')) return;
    if (root.querySelector('.arpg-dimensions-btn')) return;
    const header = headerIn(root);
    if (!header) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arpg-dimensions-btn';
    btn.textContent = 'Dimensiones';
    btn.addEventListener('click', () => {
      new DimensionsApp({ item }).render(true);
    });
    header.appendChild(btn);
    log('Injected dimensions button');
  };

  Hooks.on('renderActorSheet', injectInventory);
  Hooks.on('renderActorSheetV2', injectInventory);
  Hooks.on('renderItemSheet', injectDimensions);
  Hooks.on('renderItemSheetV2', injectDimensions);
  Hooks.on('renderApplicationV2', (app: any, html: any) => {
    injectInventory(app, html);
    injectDimensions(app, html);
  });
}
