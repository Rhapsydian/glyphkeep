// Phase 3 equipment: Weapon + Armor slots, flat modifiers only (resolved
// live with the user - see the Phase 3 plan's Decisions section). Equipment
// { weaponId, armorId } and Inventory { itemIds } are new, plain
// string-keyed components (glyphrogue's world.js needs no registration
// step for either). WeaponDamage { min, max } is the per-entity override
// rules.js's createAttackRule reads, falling back to its own module
// baseline (WEAPON_MIN_DAMAGE/MAX_DAMAGE) whenever it's absent - so no
// enemy archetype needs to change at all.
import { ITEM_CATALOG } from './items.js';
import { PLAYER_ATTACK, PLAYER_DEFENSE, WEAPON_MIN_DAMAGE, WEAPON_MAX_DAMAGE } from './rules.js';

const EMPTY_EQUIPMENT = { weaponId: null, armorId: null };

// Pure, and deliberately recomputes from baseline every call rather than
// accumulating bonuses in place on Equip/Unequip - equip/unequip can never
// drift out of sync with whatever's actually equipped this way.
export function deriveStats(equipment, catalog = ITEM_CATALOG) {
  const weapon = equipment.weaponId ? catalog[equipment.weaponId] : undefined;
  const armor = equipment.armorId ? catalog[equipment.armorId] : undefined;

  return {
    attack: PLAYER_ATTACK + (weapon?.modifiers.attack ?? 0),
    defense: PLAYER_DEFENSE + (armor?.modifiers.defense ?? 0),
    weaponDamage: weapon?.modifiers.weaponDamage ?? { min: WEAPON_MIN_DAMAGE, max: WEAPON_MAX_DAMAGE },
  };
}

function applyDerivedStats(ctx, entity, equipment) {
  const stats = deriveStats(equipment);
  ctx.addComponent(entity, 'Attack', { value: stats.attack });
  ctx.addComponent(entity, 'Defense', { value: stats.defense });
  ctx.addComponent(entity, 'WeaponDamage', { ...stats.weaponDamage });
}

function slotKeyFor(slot) {
  return slot === 'weapon' ? 'weaponId' : 'armorId';
}

// Equipping an item that isn't already owned adds it to Inventory too - the
// loadout roll is Phase 3's only item source (no shops/floor loot until
// Phase 5), so "pick" and "equip" are the same action; a later phase adding
// a real AddToInventory path wouldn't need to change this.
function equipItemRule(action, ctx) {
  const { entity, itemId } = action;
  const item = ITEM_CATALOG[itemId];
  if (!item) return undefined; // unknown itemId - defensive no-op

  const inventory = ctx.getComponent(entity, 'Inventory') ?? { itemIds: [] };
  if (!inventory.itemIds.includes(itemId)) {
    ctx.addComponent(entity, 'Inventory', { itemIds: [...inventory.itemIds, itemId] });
  }

  const equipment = ctx.getComponent(entity, 'Equipment') ?? EMPTY_EQUIPMENT;
  const nextEquipment = { ...equipment, [slotKeyFor(item.slot)]: itemId };
  ctx.addComponent(entity, 'Equipment', nextEquipment);
  applyDerivedStats(ctx, entity, nextEquipment);
  return undefined;
}

function unequipItemRule(action, ctx) {
  const { entity, slot } = action;
  const equipment = ctx.getComponent(entity, 'Equipment') ?? EMPTY_EQUIPMENT;
  const nextEquipment = { ...equipment, [slotKeyFor(slot)]: null };
  ctx.addComponent(entity, 'Equipment', nextEquipment);
  applyDerivedStats(ctx, entity, nextEquipment);
  return undefined;
}

export function registerEquipmentRules(api) {
  api.registerRule('equip-item', 'EquipItem', equipItemRule);
  api.registerRule('unequip-item', 'UnequipItem', unequipItemRule);
}
