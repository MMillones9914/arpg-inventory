// Pure UX helpers for M7. No Foundry globals, safe to unit-test.

import { attunementState, dnd5eItemType, usesLabel, weaponSummary } from './dnd5e';

export interface ItemFilters {
  query: string;
  type: string;
  rarity: string;
}

export const EMPTY_FILTERS: ItemFilters = { query: '', type: '', rarity: '' };

/** Accent-insensitive lowercase text for name search. */
export function normalizeText(value: any): string {
  return String(value ?? '')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function itemRarity(item: any): string {
  return String(item?.system?.rarity ?? item?.rarity ?? 'common').toLocaleLowerCase();
}

export function itemType(item: any): string {
  return dnd5eItemType(item);
}

export function itemWeight(item: any): number {
  const weight = item?.system?.weight?.value ?? item?.system?.weight ?? 0;
  const quantity = item?.system?.quantity ?? 1;
  return (Number(weight) || 0) * (Number(quantity) || 1);
}

/** True when an item passes every active filter. Empty filters match everything. */
export function itemMatches(item: any, filters: ItemFilters = EMPTY_FILTERS): boolean {
  if (!item) return false;
  const { query, type, rarity } = filters;
  if (query && !normalizeText(item.name).includes(normalizeText(query))) return false;
  if (type && itemType(item) !== type) return false;
  if (rarity && itemRarity(item) !== rarity) return false;
  return true;
}

export function matchingItemIds(items: any[], filters: ItemFilters = EMPTY_FILTERS): string[] {
  return items.filter((item) => itemMatches(item, filters)).map((item) => String(item.id));
}

/** Distinct sorted values for a filter <select>, including an "All" entry. */
export function filterOptions(items: any[], key: 'type' | 'rarity'): string[] {
  const values = new Set<string>();
  for (const item of items ?? []) {
    values.add(key === 'type' ? itemType(item) : itemRarity(item));
  }
  return [...values].sort();
}

export interface TooltipLine {
  label: string;
  value: string;
}

/** Compact rich tooltip content shared by grid items and equipment slots. */
export function tooltipLines(item: any): TooltipLine[] {
  if (!item) return [];
  const lines: TooltipLine[] = [
    { label: 'Name', value: String(item.name ?? '') },
    { label: 'Type', value: itemType(item) },
    { label: 'Rarity', value: itemRarity(item) },
    { label: 'Weight', value: `${itemWeight(item).toFixed(1)} lb` }
  ];
  const quantity = Number(item?.system?.quantity ?? 1);
  if (quantity > 1) lines.push({ label: 'Qty', value: String(quantity) });
  const uses = usesLabel(item);
  if (uses) lines.push({ label: 'Uses', value: uses });
  const attunement = attunementState(item);
  if (attunement !== 'none') lines.push({ label: 'Attunement', value: attunement });

  const summary = weaponSummary(item);
  if (summary?.damage) lines.push({ label: 'Damage', value: summary.damage });
  if (summary?.attack) lines.push({ label: 'Attack', value: summary.attack });
  if (summary?.range) lines.push({ label: 'Range', value: summary.range });
  if (summary?.properties?.length) {
    lines.push({ label: 'Properties', value: summary.properties.join(', ') });
  }
  return lines;
}

export interface Shortcut {
  keys: string;
  action: string;
}

export const SHORTCUTS: Shortcut[] = [
  { keys: 'B', action: 'Open / close inventory' },
  { keys: 'R', action: 'Rotate item while dragging' },
  { keys: 'Esc', action: 'Close inventory' },
  { keys: '1 / 2 / 3', action: 'Switch inventory zone' },
  { keys: 'Tab', action: 'Move focus between slots and items' },
  { keys: 'Enter', action: 'Move focused item / unequip focused slot' }
];
