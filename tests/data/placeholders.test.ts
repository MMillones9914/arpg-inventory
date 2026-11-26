import { describe, it, expect } from 'vitest';
import { EQUIPMENT_SLOTS } from '../../src/data/grid-model';
import { SLOT_PLACEHOLDERS, ZONE_PLACEHOLDERS, slotPlaceholder, zonePlaceholder } from '../../src/data/placeholders';

describe('empty-slot placeholders', () => {
  it('has a core icon for every equipment slot', () => {
    for (const slot of EQUIPMENT_SLOTS) {
      const icon = slotPlaceholder(slot.id);
      expect(icon, `missing placeholder for ${slot.id}`).toBeTruthy();
      expect(icon).toMatch(/^icons\/.+\.webp$/);
    }
    expect(Object.keys(SLOT_PLACEHOLDERS)).toHaveLength(EQUIPMENT_SLOTS.length);
  });

  it('does not keep a placeholder for the removed legs slot', () => {
    expect(slotPlaceholder('legs')).toBeNull();
    expect(slotPlaceholder('unknown')).toBeNull();
  });

  it('uses the same ring icon for both ring slots', () => {
    expect(slotPlaceholder('ring1')).toBe(slotPlaceholder('ring2'));
  });

  it('maps every zone button to a core icon', () => {
    expect(Object.keys(ZONE_PLACEHOLDERS)).toEqual(['main', 'backpack', 'quiver']);
    expect(zonePlaceholder('main')).toBe(ZONE_PLACEHOLDERS.main);
    expect(zonePlaceholder('backpack')).toBe(ZONE_PLACEHOLDERS.backpack);
    expect(zonePlaceholder('quiver')).toBe(ZONE_PLACEHOLDERS.quiver);
    expect(zonePlaceholder('unknown')).toBe(ZONE_PLACEHOLDERS.main);
  });
});
