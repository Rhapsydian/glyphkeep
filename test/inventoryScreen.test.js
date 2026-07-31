import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '@glyphrogue/core';
import { registerEquipmentRules } from '../src/equipment.js';
import { describeEquipment } from '../src/inventoryScreen.js';
import { ITEM_CATALOG } from '../src/items.js';

function buildPlayer(api) {
  const player = api.createEntity();
  api.addComponent(player, 'Equipment', { weaponId: null, armorId: null });
  api.addComponent(player, 'Inventory', { itemIds: [] });
  return player;
}

test('an empty loadout describes null weapon/armor and no owned items', () => {
  const api = createApi();
  const player = buildPlayer(api);

  assert.deepEqual(describeEquipment(api, player), { weapon: null, armor: null, owned: [] });
});

test('an equipped weapon and armor are described with their catalog data', () => {
  const api = createApi();
  registerEquipmentRules(api);
  const player = buildPlayer(api);

  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'rusty_sword' });
  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'chainmail' });

  const view = describeEquipment(api, player);

  assert.equal(view.weapon.itemId, 'rusty_sword');
  assert.equal(view.weapon.name, ITEM_CATALOG.rusty_sword.name);
  assert.equal(view.armor.itemId, 'chainmail');
  assert.equal(view.armor.name, ITEM_CATALOG.chainmail.name);
});

test('owned lists every inventory item, flagging which are currently equipped', () => {
  const api = createApi();
  registerEquipmentRules(api);
  const player = buildPlayer(api);

  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'rusty_sword' });
  api.dispatch({ type: 'EquipItem', entity: player, itemId: 'iron_mace' }); // swaps the weapon slot, both still owned

  const view = describeEquipment(api, player);

  assert.deepEqual(
    view.owned.map((item) => ({ itemId: item.itemId, equipped: item.equipped })),
    [
      { itemId: 'rusty_sword', equipped: false },
      { itemId: 'iron_mace', equipped: true },
    ],
  );
});
