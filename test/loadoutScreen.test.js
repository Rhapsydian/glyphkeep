import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canPick, buildEquipAction, LOADOUT_PICK_COUNT } from '../src/loadoutScreen.js';

test('LOADOUT_PICK_COUNT is 2, per DESIGN.md\'s "the player picks 2"', () => {
  assert.equal(LOADOUT_PICK_COUNT, 2);
});

test('canPick is true for an unpicked item while under the pick limit', () => {
  assert.equal(canPick([], 'rusty_sword'), true);
  assert.equal(canPick(['iron_mace'], 'rusty_sword'), true);
});

test('canPick is false for an item already picked', () => {
  assert.equal(canPick(['rusty_sword'], 'rusty_sword'), false);
});

test('canPick is false once the pick limit is reached, even for an unpicked item', () => {
  assert.equal(canPick(['rusty_sword', 'iron_mace'], 'chainmail'), false);
});

test('buildEquipAction produces a well-formed EquipItem action', () => {
  assert.deepEqual(buildEquipAction('player-1', 'rusty_sword'), {
    type: 'EquipItem',
    entity: 'player-1',
    itemId: 'rusty_sword',
  });
});
