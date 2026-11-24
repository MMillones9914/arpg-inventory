import { log } from '../utils/logger.mjs';
import { InventoryApp } from '../apps/inventory-app.mjs';

export function registerUiHooks() {
  const inject = (app, html) => {
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.documentName !== 'Actor') return;
    const root = html instanceof HTMLElement ? html : (html?.[0] ?? html);
    if (!root || !root.querySelector) return;
    if (root.querySelector('.arpg-open-btn')) return;
    const header = root.querySelector('.window-header') || root.querySelector('header');
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

  Hooks.on('renderActorSheet', inject);
  Hooks.on('renderActorSheetV2', inject);
  Hooks.on('renderApplicationV2', (app, html) => {
    if (app?.document?.documentName === 'Actor' || app?.actor) inject(app, html);
  });
}
