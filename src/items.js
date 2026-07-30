// Phase 3's item catalog (DESIGN.md's Equipment/Progression sections,
// scoped live with the user to Weapon + Armor slots, flat modifiers only -
// no rarity/set bonuses yet, deliberately lean per DESIGN.md's own framing).
// Plain data table, same shape convention as enemy-plugin's ENEMY_ARCHETYPES
// - not a registerEntity/registerEntityType plugin, since items aren't
// spawned as world entities until Phase 5 floor loot; this phase they only
// ever exist as data referenced by id from Inventory/Equipment components.
//
// Weapon modifiers bump both the flat Attack.value and the weaponDamage
// roll range (rules.js's WEAPON_MIN_DAMAGE/MAX_DAMAGE baseline) - giving
// weapons real identity beyond a flat number, reusing the roll mechanic
// that's already there. Armor modifiers only ever touch Defense.value.
export const ITEM_CATALOG = {
  rusty_sword: {
    name: 'Rusty Sword',
    slot: 'weapon',
    modifiers: { attack: 1, weaponDamage: { min: 1, max: 5 } },
  },
  iron_mace: {
    name: 'Iron Mace',
    slot: 'weapon',
    modifiers: { attack: 3, weaponDamage: { min: 1, max: 4 } },
  },
  hunting_bow: {
    name: 'Hunting Bow',
    slot: 'weapon',
    modifiers: { attack: 0, weaponDamage: { min: 2, max: 6 } },
  },
  leather_vest: {
    name: 'Leather Vest',
    slot: 'armor',
    modifiers: { defense: 1 },
  },
  chainmail: {
    name: 'Chainmail',
    slot: 'armor',
    modifiers: { defense: 3 },
  },
  wooden_buckler: {
    name: 'Wooden Buckler',
    slot: 'armor',
    modifiers: { defense: 2 },
  },
};
