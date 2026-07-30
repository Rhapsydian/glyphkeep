import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '@glyphrogue/core';
import { registerEquipmentRules } from '../src/equipment.js';
import { registerAttackRule, PLAYER_ATTACK, PLAYER_DEFENSE, WEAPON_MIN_DAMAGE, WEAPON_MAX_DAMAGE } from '../src/rules.js';
import { ITEM_CATALOG } from '../src/items.js';

function buildPlayer(api) {
  const player = api.createEntity();
  api.addComponent(player, 'Attack', { value: PLAYER_ATTACK });
  api.addComponent(player, 'Defense', { value: PLAYER_DEFENSE });
  api.addComponent(player, 'Equipment', { weaponId: null, armorId: null });
  api.addComponent(player, 'Inventory', { itemIds: [] });
  return player;
}

test('equipping a weapon adds it to Inventory, sets Equipment.weaponId, and recomputes Attack/WeaponDamage', () => {
  const api = createApi();
  registerEquipmentRules(api);
  const player = buildPlayer(api);

  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'rusty_sword' });

  const item = ITEM_CATALOG.rusty_sword;
  assert.equal(api.getComponent(player, 'Equipment').weaponId, 'rusty_sword');
  assert.deepEqual(api.getComponent(player, 'Inventory').itemIds, ['rusty_sword']);
  assert.equal(api.getComponent(player, 'Attack').value, PLAYER_ATTACK + item.modifiers.attack);
  assert.deepEqual(api.getComponent(player, 'WeaponDamage'), item.modifiers.weaponDamage);
});

test('equipping armor sets Equipment.armorId and recomputes Defense only, leaving Attack untouched', () => {
  const api = createApi();
  registerEquipmentRules(api);
  const player = buildPlayer(api);

  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'chainmail' });

  const item = ITEM_CATALOG.chainmail;
  assert.equal(api.getComponent(player, 'Equipment').armorId, 'chainmail');
  assert.equal(api.getComponent(player, 'Defense').value, PLAYER_DEFENSE + item.modifiers.defense);
  assert.equal(api.getComponent(player, 'Attack').value, PLAYER_ATTACK);
});

test('re-equipping the same item does not duplicate it in Inventory', () => {
  const api = createApi();
  registerEquipmentRules(api);
  const player = buildPlayer(api);

  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'rusty_sword' });
  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'rusty_sword' });

  assert.deepEqual(api.getComponent(player, 'Inventory').itemIds, ['rusty_sword']);
});

test('equipping a second weapon swaps the slot instead of stacking, keeping both in Inventory', () => {
  const api = createApi();
  registerEquipmentRules(api);
  const player = buildPlayer(api);

  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'rusty_sword' });
  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'iron_mace' });

  const item = ITEM_CATALOG.iron_mace;
  assert.equal(api.getComponent(player, 'Equipment').weaponId, 'iron_mace');
  assert.equal(api.getComponent(player, 'Attack').value, PLAYER_ATTACK + item.modifiers.attack);
  assert.deepEqual(api.getComponent(player, 'Inventory').itemIds, ['rusty_sword', 'iron_mace']);
});

test('unequipping a weapon clears the slot and reverts Attack/WeaponDamage to baseline, keeping it in Inventory', () => {
  const api = createApi();
  registerEquipmentRules(api);
  const player = buildPlayer(api);

  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'rusty_sword' });
  api.dispatch({ type: 'UnequipItem', entity: player, slot: 'weapon' });

  assert.equal(api.getComponent(player, 'Equipment').weaponId, null);
  assert.equal(api.getComponent(player, 'Attack').value, PLAYER_ATTACK);
  assert.deepEqual(api.getComponent(player, 'WeaponDamage'), { min: WEAPON_MIN_DAMAGE, max: WEAPON_MAX_DAMAGE });
  assert.deepEqual(api.getComponent(player, 'Inventory').itemIds, ['rusty_sword']);
});

test('equipping an unknown itemId is a defensive no-op', () => {
  const api = createApi();
  registerEquipmentRules(api);
  const player = buildPlayer(api);

  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'nonexistent' });

  assert.deepEqual(api.getComponent(player, 'Equipment'), { weaponId: null, armorId: null });
  assert.deepEqual(api.getComponent(player, 'Inventory').itemIds, []);
});

test('an equipped weapon\'s WeaponDamage range actually changes a live Attack roll, not just the component value', () => {
  const api = createApi();
  registerEquipmentRules(api);
  registerAttackRule(api);
  const player = buildPlayer(api);
  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'hunting_bow' }); // weaponDamage 2-6, distinct from the 1-4 baseline

  const target = api.createEntity();
  api.addComponent(target, 'Health', { current: 20, max: 20 });
  api.addComponent(target, 'Defense', { value: 0 });

  // hit, then a roll just under 1 - floors to the top of the range (2-6 -> 6)
  // without hitting the "next() returns exactly 1" edge case real seeded rng
  // output never actually produces.
  const values = [0, 0.999];
  let index = 0;
  api.rng.next = () => values[index++];

  api.dispatch({ type: 'Attack', entity: player, target });

  const item = ITEM_CATALOG.hunting_bow;
  const expectedDamage = item.modifiers.weaponDamage.max + PLAYER_ATTACK + item.modifiers.attack;
  assert.equal(api.getComponent(target, 'Health').current, 20 - expectedDamage);
});
