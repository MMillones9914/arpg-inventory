// Pure rules for which dnd5e items may occupy the ARPG inventory.
// No Foundry globals, safe to unit-test.

import { dnd5eItemType } from './dnd5e';

/** dnd5e types with a PhysicalItemTemplate (plus our derived grid keys). */
const PHYSICAL_TYPES = new Set([
  'weapon', 'equipment', 'armor', 'shield', 'consumable', 'ammo',
  'tool', 'loot', 'treasure', 'container', 'backpack', 'spellcastingfocus'
]);

/** dnd5e types that are rules/character data, never carried objects. */
const NON_PHYSICAL_TYPES = new Set([
  'background', 'class', 'facility', 'feat', 'feature', 'race', 'species',
  'renown', 'spell', 'subclass'
]);

const KNOWN_TYPES = new Set([...PHYSICAL_TYPES, ...NON_PHYSICAL_TYPES]);

/** Spells, features, classes and similar progression items are excluded. */
export function isInventoryItem(item: any): boolean {
  if (!item) return false;
  const type = dnd5eItemType(item).toLocaleLowerCase();
  if (NON_PHYSICAL_TYPES.has(type)) return false;
  if (PHYSICAL_TYPES.has(type)) return true;
  // Custom types from other modules are kept unless explicitly non-physical.
  return !KNOWN_TYPES.has(type);
}

/** Actor item ids that are allowed to have inventory placements. */
export function inventoryItemIds(items: any[] = []): string[] {
  return items.filter(isInventoryItem).map((item) => String(item.id));
}
