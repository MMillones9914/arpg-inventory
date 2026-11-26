// Pure container availability rules. No Foundry globals, safe to unit-test.

export type ContainerKind = 'backpack' | 'quiver';

const BACKPACK_PATTERN = /backpack|mochila/i;
const QUIVER_PATTERN = /quiver|carcaj/i;
const CONTAINER_TYPE_PATTERN = /^container$/i;

function itemType(item: any): string {
  if (!item) return '';
  if (item.type && typeof item.type === 'object') return String(item.type.value ?? '');
  return String(item.type ?? '');
}

function itemMatchesPattern(item: any, pattern: RegExp): boolean {
  if (!item) return false;
  const subtype = String(item.system?.type?.value ?? item.system?.subtype ?? '');
  const name = String(item.name ?? '');
  return pattern.test(itemType(item)) || pattern.test(subtype) || pattern.test(name);
}

function isQuiverItem(item: any): boolean {
  return itemMatchesPattern(item, QUIVER_PATTERN);
}

/** True when the actor carries an item that can provide that container zone. */
export function hasContainer(items: any[] = [], kind: ContainerKind): boolean {
  if (kind === 'quiver') return items.some((item) => isQuiverItem(item));
  // Any dnd5e "container" item is enough for the backpack; a named quiver is
  // reserved for the quiver zone instead.
  return items.some((item) => item && !isQuiverItem(item) && (
    CONTAINER_TYPE_PATTERN.test(itemType(item)) || itemMatchesPattern(item, BACKPACK_PATTERN)
  ));
}

/** The actor item that provides a zone, used for its tab icon. */
export function findContainerItem(container: any, items: any[] = []): any | null {
  if (!container) return null;
  const key = `${container.id ?? ''} ${container.name ?? ''}`;
  const matches = BACKPACK_PATTERN.test(key)
    ? (item: any) => hasContainer([item], 'backpack')
    : QUIVER_PATTERN.test(key)
      ? (item: any) => hasContainer([item], 'quiver')
      : (item: any) => item && (
        item.id === container.id
        || String(item.name).toLocaleLowerCase() === String(container.name).toLocaleLowerCase()
      );
  return items.find(matches) ?? null;
}

export function isContainerAvailable(container: any, items: any[] = []): boolean {
  return !!findContainerItem(container, items);
}

export function availableContainers(containers: any[] = [], items: any[] = []): any[] {
  return containers.filter((container) => isContainerAvailable(container, items));
}
