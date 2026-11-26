// Pure UX helpers for M7. No Foundry globals, safe to unit-test.

import { dnd5eItemType } from './dnd5e';

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
  /** Optional rarity key so the value can use the matching colour. */
  rarity?: string;
}

/** Minimal tooltip: identity, type, equipment state and quantity only. */
export function tooltipLines(item: any): TooltipLine[] {
  if (!item) return [];
  const rarity = itemRarity(item);
  const quantity = Number(item?.system?.quantity ?? 1);
  const lines: TooltipLine[] = [
    { label: 'Nombre', value: String(item.name ?? '') },
    { label: 'Rareza', value: rarity, rarity },
    { label: 'Tipo', value: itemType(item) },
    { label: 'Cantidad', value: String(Number.isFinite(quantity) ? quantity : 1) }
  ];
  if (item?.system?.equipped !== undefined) {
    lines.push({ label: 'Equipado', value: item.system.equipped === true ? 'Sí' : 'No' });
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
  { keys: 'Enter', action: 'Move focused item / unequip focused slot' },
  { keys: 'Drag tab', action: 'Reorder container tabs' },
  { keys: 'Drag bag', action: 'Swap two bags in the grid' }
];
