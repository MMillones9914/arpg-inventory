const PREFIX = '[ARPG Inventory]';

export function log(...args: any[]) {
  console.log(PREFIX, ...args);
}

export function warn(...args: any[]) {
  console.warn(PREFIX, ...args);
}
