import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, loadPlugins } from '@glyphrogue/core';
import floorPlugin from '../src/plugins/floor-plugin/index.js';
import { createFloorState } from '../src/floor.js';
import { FLOOR_COUNT } from '../src/generators/floorGenerator.js';

function buildApiWithPlayer() {
  const api = createApi();
  loadPlugins(api, [floorPlugin]);

  const player = api.createEntity();
  api.addComponent(player, 'PlayerControlled', {});
  api.addActor(player, 0);

  return { api, player };
}

test('createFloorState generates floor 1 and places nothing until placePlayerAtEntry is called', () => {
  const { api } = buildApiWithPlayer();
  const floor = createFloorState(api);

  assert.equal(floor.getCurrentFloor(), 1);
  assert.ok(floor.getZone().anchors.find((anchor) => anchor.id === 'entry'));
});

test('placePlayerAtEntry moves the player onto the current floor\'s entry anchor', () => {
  const { api, player } = buildApiWithPlayer();
  const floor = createFloorState(api);

  floor.placePlayerAtEntry(player);

  const entry = floor.getZone().anchors.find((anchor) => anchor.id === 'entry');
  assert.deepEqual(api.getComponent(player, 'Position'), { x: entry.x, y: entry.y });
});

test('checkForDescent is a no-op when the player is not on the stairs', () => {
  const { api, player } = buildApiWithPlayer();
  const floor = createFloorState(api);
  api.addComponent(player, 'Position', { x: -1, y: -1 });

  assert.equal(floor.checkForDescent(player), null);
  assert.equal(floor.getCurrentFloor(), 1);
});

test('checkForDescent advances to the next floor and repositions the player at its entry', () => {
  const { api, player } = buildApiWithPlayer();
  const floor = createFloorState(api);
  const stairs = floor.getZone().anchors.find((anchor) => anchor.id === 'stairs');
  api.addComponent(player, 'Position', { x: stairs.x, y: stairs.y });

  const outcome = floor.checkForDescent(player);

  assert.equal(outcome, 'descended');
  assert.equal(floor.getCurrentFloor(), 2);
  const newEntry = floor.getZone().anchors.find((anchor) => anchor.id === 'entry');
  assert.deepEqual(api.getComponent(player, 'Position'), { x: newEntry.x, y: newEntry.y });
});

test('descending replaces the previous floor\'s stairs entity rather than leaving it behind', () => {
  const { api, player } = buildApiWithPlayer();
  const floor = createFloorState(api);
  const stairs = floor.getZone().anchors.find((anchor) => anchor.id === 'stairs');
  api.addComponent(player, 'Position', { x: stairs.x, y: stairs.y });

  floor.checkForDescent(player);

  const stairsEntities = api.query(['EntityType']).filter((entity) => api.getComponent(entity, 'EntityType').type === 'stairs');
  assert.equal(stairsEntities.length, 1);
});

test('checkForDescent reports "won" on reaching the last floor\'s stairs', () => {
  const { api, player } = buildApiWithPlayer();
  const floor = createFloorState(api);

  for (let expectedFloor = 2; expectedFloor <= FLOOR_COUNT; expectedFloor++) {
    const stairs = floor.getZone().anchors.find((anchor) => anchor.id === 'stairs');
    api.addComponent(player, 'Position', { x: stairs.x, y: stairs.y });
    const outcome = floor.checkForDescent(player);
    assert.equal(outcome, 'descended');
    assert.equal(floor.getCurrentFloor(), expectedFloor);
  }

  const finalStairs = floor.getZone().anchors.find((anchor) => anchor.id === 'stairs');
  api.addComponent(player, 'Position', { x: finalStairs.x, y: finalStairs.y });
  assert.equal(floor.checkForDescent(player), 'won');
  // Winning doesn't generate an 11th floor.
  assert.equal(floor.getCurrentFloor(), FLOOR_COUNT);
});
