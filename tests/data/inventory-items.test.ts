import { describe, it, expect } from 'vitest';
import { inventoryItemIds, isInventoryItem } from '../../src/data/inventory-items';

describe('inventory item filter', () => {
  it('excludes non-physical dnd5e item types', () => {
    const types = [
      'background', 'class', 'facility', 'feat', 'feature', 'race',
      'species', 'renown', 'spell', 'subclass'
    ];
    for (const type of types) {
      expect(isInventoryItem({ id: type, type, name: type })).toBe(false);
    }
  });

  it('keeps physical dnd5e types and derived grid keys', () => {
    for (const type of ['weapon', 'equipment', 'armor', 'shield', 'consumable', 'tool', 'loot', 'container']) {
      expect(isInventoryItem({ id: type, type, name: type })).toBe(true);
    }
    expect(isInventoryItem({
      type: 'consumable', system: { type: { value: 'ammunition' } }
    })).toBe(true);
    expect(isInventoryItem({
      type: 'equipment', system: { type: { value: 'spellcastingFocus' } }
    })).toBe(true);
  });

  it('allows custom module types but filters actor item ids', () => {
    expect(isInventoryItem({ id: 'custom', type: 'customPhysical' })).toBe(true);
    expect(isInventoryItem(null)).toBe(false);
    expect(inventoryItemIds([
      { id: 'spell-1', type: 'spell' },
      { id: 'feature-1', type: 'feat' },
      { id: 'sword-1', type: 'weapon' },
      { id: 'bag-1', type: 'container' }
    ])).toEqual(['sword-1', 'bag-1']);
  });
});
