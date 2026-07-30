import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_CATALOG } from '../src/items.js';

test('every catalog entry has a name, a weapon/armor slot, and matching modifiers', () => {
  for (const [id, item] of Object.entries(ITEM_CATALOG)) {
    assert.equal(typeof item.name, 'string', `${id} should have a name`);
    assert.ok(['weapon', 'armor'].includes(item.slot), `${id}'s slot should be 'weapon' or 'armor'`);

    if (item.slot === 'weapon') {
      assert.equal(typeof item.modifiers.attack, 'number', `${id} should have a numeric attack modifier`);
      assert.equal(typeof item.modifiers.weaponDamage?.min, 'number', `${id} should have a weaponDamage.min`);
      assert.equal(typeof item.modifiers.weaponDamage?.max, 'number', `${id} should have a weaponDamage.max`);
      assert.ok(item.modifiers.weaponDamage.min <= item.modifiers.weaponDamage.max, `${id}'s weaponDamage range should be valid`);
    } else {
      assert.equal(typeof item.modifiers.defense, 'number', `${id} should have a numeric defense modifier`);
    }
  }
});

test('the catalog has at least one weapon and one armor entry', () => {
  const slots = Object.values(ITEM_CATALOG).map((item) => item.slot);
  assert.ok(slots.includes('weapon'));
  assert.ok(slots.includes('armor'));
});
