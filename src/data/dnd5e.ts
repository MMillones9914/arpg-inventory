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

/** Normalize dnd5e properties (Set, array or legacy object). */
export function itemProperties(item: any): string[] {
  const raw = item?.system?.properties;
  if (Array.isArray(raw)) return raw.map((value) => String(value).toLowerCase());
  if (raw instanceof Set) return [...raw].map((value) => String(value).toLowerCase());
  if (!raw || typeof raw !== 'object') return [];
  return Object.keys(raw).filter((key) => !!raw[key]).map((key) => key.toLowerCase());
}

export type WeaponHands = 'one' | 'two' | 'versatile' | null;

/** How many hands a weapon uses, from dnd5e property keys (`two`, `ver`). */
export function weaponHands(item: any): WeaponHands {
  if (dnd5eItemType(item).toLowerCase() !== 'weapon') return null;
  const props = itemProperties(item);
  if (props.includes('two') || props.includes('two-handed') || props.includes('twohanded')) return 'two';
  if (props.includes('ver') || props.includes('versatile')) return 'versatile';
  return 'one';
}

/** Versatile weapons only take both slots when explicitly set to two hands. */
export function isTwoHandedWeapon(item: any, versatileTwoHanded = false): boolean {
  const hands = weaponHands(item);
  return hands === 'two' || (hands === 'versatile' && versatileTwoHanded === true);
}

/** True when the actor has weapon mastery for this item's base id. */
export function hasWeaponMastery(item: any, actor: any): boolean {
  const base = String(item?.system?.type?.baseItem ?? '');
  if (!base) return false;
  const mastered = actor?.system?.traits?.weaponProf?.mastery?.value;
  if (mastered instanceof Set) return mastered.has(base);
  if (Array.isArray(mastered)) return mastered.includes(base);
  if (mastered && typeof mastered === 'object') return !!mastered[base];
  return false;
}

/** Candidate equipment slots for an item equipped in Foundry, in priority order. */
export function equipmentSlotsForItem(item: any): string[] {
  if (item?.system?.equipped !== true) return [];
  const type = dnd5eItemType(item).toLowerCase();
  const subtype = String(item?.system?.type?.value ?? '').toLowerCase();
  const name = String(item?.name ?? '').toLowerCase();
  const label = `${subtype} ${name}`;

  if (type === 'ammo') return ['ammo'];
  // Two-handed weapons are expanded to both slots by the caller; one-handed
  // weapons use the first free hand.
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

function propertyNames(item: any): string[] {
  return itemProperties(item);
}

/** Compact data for the single weapon-info space. */
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
    properties: propertyNames(item).slice(0, 4),
    range: range ? String(range) : null,
    attunement: attunementState(item),
    uses: usesLabel(item)
  };
}

export interface EquippedInfo {
  name: string;
  itemType: string;
  rarity: string;
  damage: string | null;
  damageTypes: string[];
  altDamage: string | null;
  damageModifiers: string | null;
  range: string | null;
  throwRange: string | null;
  mastery: string | null;
  hasMastery: boolean;
  attunement: AttunementState;
  properties: string[];
}

function damageFormula(raw: any): string | null {
  if (typeof raw === 'string') return raw || null;
  const formula = String(raw?.formula ?? '').trim();
  const bonus = String(raw?.bonus ?? '').trim();
  if (formula && bonus && bonus !== '@mod') return `${formula} ${bonus}`;
  return formula || null;
}

function damageTypeKeys(raw: any): string[] {
  if (raw instanceof Set) return [...raw].map((value) => String(value).toLowerCase());
  if (Array.isArray(raw)) return raw.map((value) => String(value).toLowerCase());
  return [];
}

function rangeUnits(system: any): string {
  return String(system?.range?.units ?? '').trim();
}

function distanceLabel(value: number, long: number, units: string): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const suffix = units ? ` ${units}` : '';
  return Number.isFinite(long) && long > value ? `${value}/${long}${suffix}` : `${value}${suffix}`;
}

/** Normal reach/attack range; thrown weapons use their melee reach here. */
function rangeLabel(system: any, thrown: boolean): string | null {
  const range = system?.range;
  if (!range) return null;
  if (typeof range !== 'object') return String(range);
  const units = rangeUnits(system);
  if (thrown) return distanceLabel(Number(range.reach), 0, units);
  return distanceLabel(Number(range.value), Number(range.long), units)
    ?? distanceLabel(Number(range.reach), 0, units);
}

/** The two distances of a thrown weapon, shown next to the `thr` property. */
function thrownRangeLabel(system: any): string | null {
  return distanceLabel(Number(system?.range?.value), Number(system?.range?.long), rangeUnits(system));
}

function firstAttackActivity(item: any): any {
  const activities = item?.system?.activities ?? [];
  return [...activities].find((entry: any) => !!entry && (!entry.type || entry.type === 'attack')) ?? null;
}

function abilityModifier(actor: any, key: string): number | null {
  const raw = actor?.system?.abilities?.[key]?.mod ?? actor?.system?.abilities?.[key]?.value;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function isRangedWeapon(item: any): boolean {
  const type = String(item?.system?.type?.value ?? '').toLowerCase();
  return firstAttackActivity(item)?.attack?.type?.value === 'ranged' || /r$|ranged|siege/.test(type);
}

function damageAbility(item: any, actor: any): string {
  const explicit = firstAttackActivity(item)?.attack?.ability;
  if (explicit && explicit !== 'none') return String(explicit);
  if (itemProperties(item).includes('fin')) {
    const str = abilityModifier(actor, 'str') ?? -Infinity;
    const dex = abilityModifier(actor, 'dex') ?? -Infinity;
    return dex > str ? 'dex' : 'str';
  }
  return isRangedWeapon(item) ? 'dex' : 'str';
}

function signedFormula(raw: any): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return signed(raw);
  const text = String(raw).trim();
  if (!text) return null;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(text)) return signed(Number(text));
  return /^[+-]/.test(text) ? text : `+${text}`;
}

/** Ability modifier and actor-wide damage bonus appended to the weapon die. */
function damageModifiers(item: any, actor: any): string | null {
  if (dnd5eItemType(item).toLowerCase() !== 'weapon') return null;
  const parts: string[] = [];
  const ability = damageAbility(item, actor);
  const modifier = abilityModifier(actor, ability);
  if (modifier !== null && modifier !== 0) parts.push(signed(modifier));
  const kind = isRangedWeapon(item) ? 'rwak' : 'mwak';
  const bonus = actor?.system?.rolls?.damage?.[kind]?.bonus
    ?? actor?.system?.bonuses?.[kind]?.damage;
  const bonusLabel = signedFormula(bonus);
  if (bonusLabel && bonusLabel !== '+0') parts.push(bonusLabel);
  return parts.length ? parts.join(' ') : null;
}

/** Everything the equipment-info panel needs, in pure data form. */
export function equippedInfo(item: any, actor: any): EquippedInfo | null {
  if (!item) return null;
  const system = item.system ?? {};
  const parts = Array.isArray(system.damage?.parts) ? system.damage.parts : [];
  const type = dnd5eItemType(item).toLowerCase();
  const baseDamage = system.damage?.base ?? parts[0];
  const properties = itemProperties(item);
  const thrown = type === 'weapon' && properties.includes('thr');
  return {
    name: String(item.name ?? ''),
    itemType: String(item.type ?? ''),
    rarity: String(system.rarity ?? item.rarity ?? ''),
    damage: type === 'weapon' ? (damageFormula(baseDamage) ?? null) : null,
    damageTypes: type === 'weapon'
      ? damageTypeKeys(system.damage?.base?.types ?? (Array.isArray(parts[0]) ? parts[0][1] : null))
      : [],
    altDamage: type === 'weapon' ? damageFormula(system.damage?.versatile) : null,
    damageModifiers: damageModifiers(item, actor),
    range: type === 'weapon' ? rangeLabel(system, thrown) : null,
    throwRange: thrown ? thrownRangeLabel(system) : null,
    mastery: type === 'weapon' ? (String(system.mastery ?? '') || null) : null,
    hasMastery: type === 'weapon' ? hasWeaponMastery(item, actor) : false,
    attunement: attunementState(item),
    properties
  };
}

/** dnd5e attack mode that matches how the module is holding this weapon. */
export function attackModeForItem(item: any, twoHandedFlag = false): 'oneHanded' | 'twoHanded' | null {
  const hands = weaponHands(item);
  if (!hands) return null;
  if (hands === 'two') return 'twoHanded';
  if (hands === 'versatile') return twoHandedFlag ? 'twoHanded' : 'oneHanded';
  return 'oneHanded';
}

/**
 * Mirror the holding mode into dnd5e's own per-activity attack-mode flag so a
 * subsequent attack/damage roll uses the versatile die automatically.
 */
export async function syncAttackMode(item: any, twoHandedFlag = false) {
  if (!item?.setFlag) return;
  const mode = attackModeForItem(item, twoHandedFlag);
  if (!mode) return;
  const validModes = new Set((item.system?.attackModes ?? []).map((option: any) => option?.value));
  const activities = item.system?.activities ?? [];
  for (const activity of activities) {
    if (!activity || (activity.type && activity.type !== 'attack') || !activity.id) continue;
    if (validModes.size && !validModes.has(mode)) continue;
    await item.setFlag('dnd5e', `last.${activity.id}.attackMode`, mode);
  }
}

type DescriptionKind = 'property' | 'mastery' | 'damageType' | 'damage' | 'versatileDamage';

const DESCRIPTIONS: Record<DescriptionKind, Record<string, string>> = {
  property: {
    ada: 'Ignora resistencias e inmunidades al daño de armas no mágicas.',
    amm: 'Necesita munición para realizar el ataque.',
    fin: 'Puedes usar Fuerza o Destreza para las tiradas de ataque y daño.',
    fir: 'Arma de fuego: requiere munición y sigue las reglas de armas de fuego.',
    foc: 'Puede servir como foco de conjuro.',
    gear: 'Equipo utilizable fuera del combate.',
    hvy: 'Con desventaja en ataques si eres Pequeño o Mediano.',
    lgt: 'Arma ligera: puedes empuñar otra arma ligera en la otra mano.',
    lod: 'Solo puedes disparar una vez por acción o reacción antes de recargar.',
    mgc: 'Arma mágica: supera resistencias al daño no mágico.',
    rch: 'Alcance: suma 10 pies a tu alcance cuerpo a cuerpo con esta arma.',
    rel: 'Requiere una acción para recargarla.',
    ret: 'Tras lanzarla, el arma vuelve mágicamente a tu mano.',
    sil: 'Arma de plata: ignora resistencias al daño de plata.',
    spc: 'Tiene una regla especial descrita en el objeto.',
    stealthDisadvantage: 'Impone desventaja en las tiradas de Sigilo mientras la llevas.',
    thr: 'Puedes lanzarla para hacer un ataque a distancia.',
    two: 'Requiere dos manos para empuñarla y atacar.',
    ver: 'Puede usarse con una o dos manos; a dos manos usa el dado versátil.',
    shl: 'Escudo: otorga +2 a la Clase de Armadura cuando está equipado.'
  },
  mastery: {
    cleave: 'Tras golpear a una criatura, puedes atacar a otra criatura adyacente.',
    graze: 'Si fallas el ataque, infliges daño de arma a la criatura.',
    nick: 'Tras atacar con esta arma, puedes hacer un ataque con arma ligera como acción de bonificación.',
    push: 'Tras golpear, puedes empujar al objetivo 5 pies directamente alejándolo de ti.',
    sap: 'El objetivo tiene desventaja en su próxima tirada de ataque.',
    slow: 'Reduce la velocidad del objetivo 10 pies hasta el final de tu próximo turno.',
    topple: 'Puedes derribar al objetivo tumbado si falla su salvación.',
    vex: 'Tu siguiente ataque contra el objetivo tiene ventaja.'
  },
  damageType: {
    acid: 'Daño ácido: disuelve materiales y afecta a criaturas vulnerables al ácido.',
    bludgeoning: 'Daño contundente: golpes, martillazos y caídas.',
    cold: 'Daño de frío: congela y ralentiza.',
    fire: 'Daño de fuego: quemaduras y calor intenso.',
    force: 'Daño de fuerza: energía mágica pura.',
    lightning: 'Daño de rayo: descargas eléctricas.',
    necrotic: 'Daño necrótico: energía de la no-muerte.',
    piercing: 'Daño perforante: puntas, flechas y dagas.',
    poison: 'Daño de veneno: toxinas y ponzoñas.',
    psychic: 'Daño psíquico: ataques mentales.',
    radiant: 'Daño radiante: luz sagrada y energía solar.',
    slashing: 'Daño cortante: hojas y garras.',
    thunder: 'Daño de trueno: ondas de sonido ensordecedoras.'
  },
  damage: {
    base: 'Daño base del arma. Con un arma versátil empuñada a dos manos, Foundry usa automáticamente el dado versátil.'
  },
  versatileDamage: {
    base: 'Dado que sustituye al daño base cuando empuñas el arma versátil con dos manos.'
  }
};

/** Spanish hover text for item properties, masteries and damage. */
export function infoDescription(kind: DescriptionKind, key = ''): string {
  const fallback: Record<DescriptionKind, string> = {
    property: 'Propiedad de dnd5e sin descripción adicional.',
    mastery: 'Maestría de dnd5e sin descripción adicional.',
    damageType: 'Tipo de daño de dnd5e.',
    damage: 'Daño del arma.',
    versatileDamage: 'Daño alternativo del arma.'
  };
  return DESCRIPTIONS[kind][key] ?? fallback[kind];
}

