import { describe, it, expect } from 'vitest';
import {
  strengthCapacity,
  dnd5eItemType,
  attunementState,
  usesLabel,
  weaponSummary,
  canEditInventory
} from '../../src/data/dnd5e';
import { defaultItemGrid, defaultItemStackMax } from '../../src/data/grid-model';

describe('dnd5e helpers', () => {
  it('resolves strength capacity from encumbrance or STR score', () => {
    expect(strengthCapacity({ system: { attributes: { encumbrance: { max: 150 } } } })).toBe(150);
    expect(strengthCapacity({ system: { abilities: { str: { value: 14 } } } })).toBe(210);
    expect(strengthCapacity({})).toBeNull();
  });

  it('maps dnd5e types to inventory types', () => {
    expect(dnd5eItemType({ type: 'consumable', system: { type: { value: 'ammunition' } } })).toBe('ammo');
    expect(dnd5eItemType({ type: 'equipment', system: { type: { value: 'spellcastingFocus' } } })).toBe('spellcastingFocus');
    expect(dnd5eItemType({ type: 'armor' })).toBe('armor');
    expect(defaultItemGrid('armor')).toEqual({ w: 2, h: 3, rotatable: true });
    expect(defaultItemStackMax('ammo')).toBe(20);
  });

  it('reads attunement and uses', () => {
    expect(attunementState({ system: { attunement: 2 } })).toBe('attuned');
    expect(attunementState({ system: { attunement: 1 } })).toBe('required');
    expect(attunementState({})).toBe('none');
    expect(usesLabel({ system: { uses: { value: 2, max: 3, per: 'day' } } })).toBe('2/3/day');
    expect(usesLabel({})).toBeNull();
  });

  it('builds a compact weapon summary', () => {
    const item = {
      name: 'Longsword',
      system: {
        rarity: 'rare',
        damage: { parts: [['1d8+3', 'slashing']] },
        attack: { bonus: 5 },
        properties: { versatile: true, twoHanded: false },
        range: { value: 5 },
        attunement: 0,
        uses: { value: 1, max: 1 }
      }
    };
    expect(weaponSummary(item)).toEqual({
      name: 'Longsword',
      rarity: 'rare',
      damage: '1d8+3',
      attack: '+5',
      properties: ['versatile'],
      range: '5',
      attunement: 'none',
      uses: '1/1'
    });
    expect(weaponSummary(null)).toBeNull();
  });

  it('restricts inventory editing to GM users', () => {
    expect(canEditInventory({ isGM: true })).toBe(true);
    expect(canEditInventory({ isGM: false, isOwner: true })).toBe(false);
  });
});
