import { describe, it, expect } from 'vitest';
import {
  strengthCapacity,
  dnd5eItemType,
  attunementState,
  usesLabel,
  weaponSummary,
  canEditInventory,
  equipmentSlotsForItem,
  equipmentSlotForItem,
  weaponHands,
  isTwoHandedWeapon,
  hasWeaponMastery,
  equippedInfo,
  infoDescription,
  attackModeForItem,
  syncAttackMode
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

  it('maps equipped items to our equipment slots', () => {
    const weapon = { id: 'w', type: 'weapon', name: 'Longsword', system: { equipped: true } };
    expect(equipmentSlotsForItem(weapon)).toEqual(['mainhand', 'offhand']);
    expect(equipmentSlotForItem(weapon, {})).toBe('mainhand');
    expect(equipmentSlotForItem(weapon, { mainhand: 'other' })).toBe('offhand');
    expect(equipmentSlotsForItem({ ...weapon, system: { equipped: false } })).toEqual([]);

    const shield = { id: 's', type: 'equipment', name: 'Shield', system: { equipped: true, type: { value: 'shield' } } };
    expect(equipmentSlotsForItem(shield)).toEqual(['offhand', 'mainhand']);

    const armor = { id: 'a', type: 'equipment', name: 'Plate', system: { equipped: true, type: { value: 'heavy' } } };
    expect(equipmentSlotForItem(armor, {})).toBe('body');
  });

  it('detects two-handed and versatile weapons', () => {
    const glaive = {
      type: 'weapon', name: 'Glaive', system: { equipped: true, properties: new Set(['two', 'rch']) }
    };
    expect(weaponHands(glaive)).toBe('two');
    expect(isTwoHandedWeapon(glaive)).toBe(true);

    const longsword = {
      type: 'weapon', name: 'Longsword', system: { equipped: true, properties: new Set(['ver']) }
    };
    expect(weaponHands(longsword)).toBe('versatile');
    expect(isTwoHandedWeapon(longsword)).toBe(false);
    expect(isTwoHandedWeapon(longsword, true)).toBe(true);

    const dagger = { type: 'weapon', name: 'Dagger', system: { equipped: true, properties: new Set(['lgt']) } };
    expect(weaponHands(dagger)).toBe('one');
    expect(isTwoHandedWeapon(dagger)).toBe(false);
  });

  it('builds equipped info with damage, mastery and properties', () => {
    const weapon = {
      name: 'Glaive',
      type: 'weapon',
      system: {
        equipped: true,
        rarity: 'rare',
        mastery: 'graze',
        properties: new Set(['two', 'rch']),
        type: { baseItem: 'glaive' },
        activities: [{ id: 'atk', type: 'attack', attack: { bonus: '7' } }],
        range: { value: 10, units: 'ft' },
        damage: { base: { formula: '1d10', bonus: '', types: new Set(['slashing']) } }
      }
    };
    const actor = { system: { traits: { weaponProf: { mastery: { value: new Set(['glaive']) } } } } };
    const info = equippedInfo(weapon, actor);
    expect(info?.damage).toBe('1d10');
    expect(info?.damageTypes).toEqual(['slashing']);
    expect(info?.attack).toBe('+7');
    expect(info?.range).toBe('10 ft');
    expect(info?.rarity).toBe('rare');
    expect(info?.mastery).toBe('graze');
    expect(info?.hasMastery).toBe(true);
    expect(info?.properties).toEqual(['two', 'rch']);
    expect(info).not.toHaveProperty('uses');
    expect(info).not.toHaveProperty('hands');

    const shield = {
      name: 'Shield', type: 'equipment',
      system: { equipped: true, armor: { value: 2 }, properties: new Set(['shl']) }
    };
    expect(equippedInfo(shield, actor)).not.toHaveProperty('ac');
    expect(equippedInfo(shield, actor)?.damage).toBeNull();
    expect(hasWeaponMastery(weapon, {})).toBe(false);
  });

  it('reads thrown distance separately from normal reach', () => {
    const dart = {
      name: 'Dart',
      type: 'weapon',
      system: {
        properties: new Set(['thr', 'lgt']),
        range: { value: 20, long: 60, reach: 5, units: 'ft' },
        damage: { base: { formula: '1d4', types: new Set(['piercing']) } }
      }
    };
    const info = equippedInfo(dart, {});
    expect(info?.range).toBe('5 ft');
    expect(info?.throwRange).toBe('20/60 ft');
    expect(info?.properties).toEqual(['thr', 'lgt']);

    const bow = {
      name: 'Shortbow',
      type: 'weapon',
      system: {
        properties: new Set([]),
        range: { value: 80, long: 320, units: 'ft' }
      }
    };
    expect(equippedInfo(bow, {})?.range).toBe('80/320 ft');
    expect(equippedInfo(bow, {})?.throwRange).toBeNull();
  });

  it('maps holding mode to the dnd5e attack mode used by rolls', async () => {
    const versatile = { type: 'weapon', system: { properties: new Set(['ver']) } };
    const glaive = { type: 'weapon', system: { properties: new Set(['two']) } };
    const dagger = { type: 'weapon', system: { properties: new Set(['fin']) } };
    expect(attackModeForItem(versatile, false)).toBe('oneHanded');
    expect(attackModeForItem(versatile, true)).toBe('twoHanded');
    expect(attackModeForItem(glaive, false)).toBe('twoHanded');
    expect(attackModeForItem(dagger, true)).toBe('oneHanded');
    expect(attackModeForItem({ type: 'consumable' }, true)).toBeNull();

    const flags: string[] = [];
    const item = {
      ...versatile,
      setFlag: async (scope: string, key: string, value: string) => {
        flags.push(`${scope}.${key}=${value}`);
      },
      system: {
        ...versatile.system,
        activities: [
          { id: 'atk1', type: 'attack' },
          { id: 'dmg1', type: 'damage' }
        ]
      }
    };
    await syncAttackMode(item, true);
    expect(flags).toEqual(['dnd5e.last.atk1.attackMode=twoHanded']);
  });

  it('exposes hover descriptions for properties, masteries and damage', () => {
    expect(infoDescription('property', 'two')).toContain('dos manos');
    expect(infoDescription('mastery', 'graze')).toContain('fallas');
    expect(infoDescription('damageType', 'slashing')).toContain('cortante');
    expect(infoDescription('versatileDamage', 'base')).toContain('versátil');
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

  it('re-exports the shared GM/owner permission rules', () => {
    expect(canEditInventory({ isGM: true })).toBe(true);
    expect(canEditInventory({ isGM: false }, { isOwner: true })).toBe(true);
    expect(canEditInventory({ isGM: false }, { isOwner: false })).toBe(false);
  });
});
