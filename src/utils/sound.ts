import { MODULE_ID } from '../constants';
import { warn } from './logger';

export type InventorySound = 'open' | 'close' | 'equip' | 'place' | 'stack' | 'invalid';

// Foundry core asset only: no extra files are required by the module.
// A single known-present source keeps every feedback type reliable.
const SOUND_SOURCE = 'sounds/dice.wav';

const SOUND_VOLUME: Record<InventorySound, number> = {
  open: 0.2,
  close: 0.2,
  equip: 0.35,
  place: 0.3,
  stack: 0.25,
  invalid: 0.3
};

/** Play optional UI feedback. Never throws: audio is purely cosmetic. */
export function playInventorySound(kind: InventorySound) {
  try {
    if (!game?.settings?.get?.(MODULE_ID, 'sounds')) return;
    const helper = (foundry as any)?.audio?.AudioHelper ?? (globalThis as any)?.AudioHelper;
    helper?.play?.({ src: SOUND_SOURCE, volume: SOUND_VOLUME[kind] ?? 0.3 }, true);
  } catch (e) {
    warn(`Sound "${kind}" skipped`, e);
  }
}
