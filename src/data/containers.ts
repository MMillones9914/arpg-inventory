// Pure container availability rules. No Foundry globals, safe to unit-test.

export type ContainerKind = 'backpack' | 'quiver';

const CONTAINER_PATTERNS: Record<ContainerKind, RegExp> = {
  backpack: /backpack|mochila/i,
  quiver: /quiver|carcaj/i
};

function itemMatchesPattern(item: any, pattern: RegExp): boolean {
  if (!item) return false;
  const type = String(item.type ?? '');
  const subtype = String(item.system?.type?.value ?? item.system?.subtype ?? '');
  const name = String(item.name ?? '');
  return pattern.test(type) || pattern.test(subtype) || pattern.test(name);
}

/** True when the actor actually carries an item of that container kind. */
export function hasContainer(items: any[] = [], kind: ContainerKind): boolean {
  return items.some((item) => itemMatchesPattern(item, CONTAINER_PATTERNS[kind]));
}

/**
 * A configured container zone is only usable when the actor owns the matching
 * item. Custom containers fall back to an exact id or name match.
 */
export function isContainerAvailable(container: any, items: any[] = []): boolean {
  if (!container) return false;
  const key = `${container.id ?? ''} ${container.name ?? ''}`;
  if (CONTAINER_PATTERNS.backpack.test(key)) return hasContainer(items, 'backpack');
  if (CONTAINER_PATTERNS.quiver.test(key)) return hasContainer(items, 'quiver');
  return items.some((item) => item && (
    item.id === container.id
    || String(item.name).toLocaleLowerCase() === String(container.name).toLocaleLowerCase()
  ));
}

export function availableContainers(containers: any[] = [], items: any[] = []): any[] {
  return containers.filter((container) => isContainerAvailable(container, items));
}
