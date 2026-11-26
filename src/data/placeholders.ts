// Core Foundry icons shown only while a slot or zone has no item assigned.
// Keeping them in a pure module makes the mapping easy to test and reuse.

export const SLOT_PLACEHOLDERS: Record<string, string> = {
  head: 'icons/equipment/head/helm-norman-rounded.webp',
  neck: 'icons/equipment/neck/amulet-round-silver-blue.webp',
  shoulders: 'icons/equipment/shoulder/pauldron-segmented-steel-brown.webp',
  body: 'icons/equipment/chest/breastplate-gorget-steel-purple.webp',
  back: 'icons/equipment/back/cloak-brown.webp',
  hands: 'icons/equipment/hand/glove-armored-leather-steel-brown.webp',
  wrist: 'icons/equipment/wrist/bracer-engraved-leather-black.webp',
  waist: 'icons/equipment/waist/belt-buckle-ring-leather-brown.webp',
  feet: 'icons/equipment/feet/boots-armored-red.webp',
  ring1: 'icons/equipment/finger/ring-band-engraved-scrolls-gold.webp',
  ring2: 'icons/equipment/finger/ring-band-engraved-scrolls-gold.webp',
  mainhand: 'icons/weapons/axes/axe-battle-broad-nooks.webp',
  offhand: 'icons/equipment/shield/heater-wooden-sword-green.webp',
  ammo: 'icons/weapons/ammunition/arrows-fletching.webp'
};

export const ZONE_PLACEHOLDERS: Record<string, string> = {
  main: 'icons/environment/people/infantry-armored.webp',
  backpack: 'icons/containers/bags/case-leather-tan.webp',
  quiver: 'icons/containers/ammunition/arrows-quiver-black.webp'
};

export function slotPlaceholder(slotId: string): string | null {
  return SLOT_PLACEHOLDERS[slotId] ?? null;
}

export function zonePlaceholder(zoneId: string): string {
  return ZONE_PLACEHOLDERS[zoneId] ?? ZONE_PLACEHOLDERS.main;
}
