import { describe, it, expect } from 'vitest';
import {
  EMPTY_FILTERS,
  filterOptions,
  itemMatches,
  itemRarity,
  itemType,
  itemWeight,
  matchingItemIds,
  normalizeText,
  tooltipLines,
  SHORTCUTS
} from '../../src/data/ux';

const longsword = {
  id: 'i1',
  name: 'Espada Larga',
  type: 'weapon',
  system: {
    rarity: 'rare',
    weight: { value: 3 },
    quantity: 1,
    damage: { parts: [['1d8+3', 'slashing']] },
    attack: { bonus: 5 },
    properties: { versatile: true },
    range: { value: 5 },
    attunement: 1
  }
};

const arrows = {
  id: 'i2',
  name: 'Flechas',
  type: 'consumable',
  system: {
    type: { value: 'ammunition' },
    rarity: 'common',
    weight: 1,
    quantity: 20
  }
};

describe('UX helpers (M7)', () => {
  it('normalizes text for accent-insensitive search', () => {
    expect(normalizeText('Espada Larga')).toBe('espada larga');
    expect(normalizeText('FLECHAS')).toBe('flechas');
  });

  it('reads type, rarity and total weight', () => {
    expect(itemType(arrows)).toBe('ammo');
    expect(itemRarity(longsword)).toBe('rare');
    expect(itemWeight(longsword)).toBe(3);
    expect(itemWeight(arrows)).toBe(20);
    expect(itemWeight({})).toBe(0);
  });

  it('matches by name, type and rarity', () => {
    expect(itemMatches(longsword, EMPTY_FILTERS)).toBe(true);
    expect(itemMatches(longsword, { query: 'espada', type: '', rarity: '' })).toBe(true);
    expect(itemMatches(longsword, { query: 'arco', type: '', rarity: '' })).toBe(false);
    expect(itemMatches(arrows, { query: '', type: 'ammo', rarity: 'common' })).toBe(true);
    expect(itemMatches(arrows, { query: '', type: 'weapon', rarity: '' })).toBe(false);
    expect(itemMatches(null, EMPTY_FILTERS)).toBe(false);
  });

  it('returns matching ids and select options', () => {
    expect(matchingItemIds([longsword, arrows], { query: '', type: 'ammo', rarity: '' })).toEqual(['i2']);
    expect(filterOptions([longsword, arrows], 'type')).toEqual(['ammo', 'weapon']);
    expect(filterOptions([longsword, arrows], 'rarity')).toEqual(['common', 'rare']);
  });

  it('builds a minimal tooltip with identity, type, equipment state and quantity', () => {
    expect(tooltipLines(longsword)).toEqual([
      { label: 'Nombre', value: 'Espada Larga' },
      { label: 'Rareza', value: 'rare', rarity: 'rare' },
      { label: 'Tipo', value: 'weapon' },
      { label: 'Cantidad', value: '1' }
    ]);
    expect(tooltipLines({ name: 'Poción', type: 'consumable', system: { quantity: 3, equipped: false } }))
      .toEqual([
        { label: 'Nombre', value: 'Poción' },
        { label: 'Rareza', value: 'common', rarity: 'common' },
        { label: 'Tipo', value: 'consumable' },
        { label: 'Cantidad', value: '3' },
        { label: 'Equipado', value: 'No' }
      ]);
    expect(tooltipLines(null)).toEqual([]);
  });

  it('documents the M7 shortcuts', () => {
    expect(SHORTCUTS.map((s) => s.keys)).toContain('B');
    expect(SHORTCUTS.map((s) => s.keys)).toContain('R');
    expect(SHORTCUTS.length).toBeGreaterThanOrEqual(6);
  });
});
