// Pure D&D 5e helpers. No Foundry globals, safe to unit-test.

export { canEditInventory, canViewInventory } from './permissions';

/** Maximum carried weight for a dnd5e actor in pounds. */
export function strengthCapacity(actor: any): number | null {
  const encumbrance = Number(actor?.system?.attributes?.encumbrance?.max);
  if (Number.isFinite(encumbrance) && encumbrance > 0) return encumbrance;
  const str = Number(actor?.system?.abilities?.str?.value ?? actor?.system?.abilities?.str);
  if (Number.isFinite(str) && str > 0) return str * 15;
  return null;
}

/** Map a dnd5e item to our inventory type key (used for default grid/stack). */
export function dnd5eItemType(item: any): string {
  const type = String(item?.type ?? 'default');
  const subtype = String(item?.system?.type?.value ?? item?.system?.subtype ?? '').toLowerCase();
  if (type === 'consumable' && /amm|ammunition|arrow|bolt/.test(subtype)) return 'ammo';
  if (type === 'equipment' && /focus/.test(subtype)) return 'spellcastingFocus';
  return type;
}

/** Candidate equipment slots for an item equipped in Foundry, in priority order. */
export function equipmentSlotsForItem(item: any): string[] {
  if (item?.system?.equipped !== true) return [];
  const type = dnd5eItemType(item).toLowerCase();
  const subtype = String(item?.system?.type?.value ?? '').toLowerCase();
  const name = String(item?.name ?? '').toLowerCase();
  const label = `${subtype} ${name}`;

  if (type === 'ammo') return ['ammo'];
  if (type === 'weapon') return ['mainhand', 'offhand'];
  if (type === 'shield' || subtype === 'shield') return ['offhand', 'mainhand'];
  if (/ring/.test(label)) return ['ring1', 'ring2'];
  if (/amulet|necklace|torc|pendant/.test(label)) return ['neck'];
  if (/cloak|mantle|cape/.test(label)) return ['back'];
  if (/boot|shoe|foot/.test(label)) return ['feet'];
  if (/glove|gauntlet/.test(label)) return ['hands'];
  if (/bracer|wrist|vambrace/.test(label)) return ['wrist'];
  if (/belt|girdle/.test(label)) return ['waist'];
  if (/helmet|helm|headband|circlet/.test(label)) return ['head'];
  if (/shoulder|pauldron/.test(label)) return ['shoulders'];
  if (/armor|breastplate|plate|chainmail|leather/.test(label) || type === 'armor') return ['body'];
  return ['body'];
}

/** Pick the first candidate slot that is free (or already holds this item). */
export function equipmentSlotForItem(item: any, occupied: Record<string, any> = {}) {
  const candidates = equipmentSlotsForItem(item);
  if (!candidates.length) return null;
  const id = String(item?.id ?? '');
  return candidates.find((slot) => !occupied[slot] || String(occupied[slot]) === id) ?? candidates[0];
}

export type AttunementState = 'none' | 'required' | 'attuned';

export function attunementState(item: any): AttunementState {
  const raw = item?.system?.attunement;
  if (Number(raw) === 2 || raw === true) return 'attuned';
  if (Number(raw) === 1) return 'required';
  return 'none';
}

export function usesLabel(item: any): string | null {
  const uses = item?.system?.uses;
  if (!uses || typeof uses !== 'object') return null;
  const value = Number(uses.value);
  const max = Number(uses.max);
  if (!Number.isFinite(value) && !Number.isFinite(max)) return null;
  const per = uses.per ? `/${String(uses.per)}` : '';
  return `${Number.isFinite(value) ? value : 0}/${Number.isFinite(max) ? max : 0}${per}`;
}

export interface WeaponSummary {
  name: string;
  rarity: string;
  damage: string | null;
  attack: string | null;
  properties: string[];
  range: string | null;
  attunement: AttunementState;
  uses: string | null;
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function propertyNames(raw: any): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (!raw || typeof raw !== 'object') return [];
  return Object.keys(raw).filter((key) => !!raw[key]);
}

/** Compact data for the reserved spaces beside mainhand/offhand slots. */
export function weaponSummary(item: any): WeaponSummary | null {
  if (!item) return null;
  const system = item.system ?? {};
  const parts = Array.isArray(system.damage?.parts) ? system.damage.parts : [];
  const damage = parts
    .map((part: any) => String(part?.[0] ?? part?.formula ?? ''))
    .filter(Boolean)
    .join(' + ');
  const bonus = Number(system.attack?.bonus);
  const range = system.range?.value ?? system.range;
  return {
    name: String(item.name ?? ''),
    rarity: String(system.rarity ?? ''),
    damage: damage || null,
    attack: Number.isFinite(bonus) ? signed(bonus) : null,
    properties: propertyNames(system.properties).slice(0, 4),
    range: range ? String(range) : null,
    attunement: attunementState(item),
    uses: usesLabel(item)
  };
}

