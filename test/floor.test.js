import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, loadPlugins, wandersPlugin } from '@glyphrogue/core';
import floorPlugin from '../src/plugins/floor-plugin/index.js';
import enemyPlugin from '../src/plugins/enemy-plugin/index.js';
import { createFloorState } from '../src/floor.js';
import { FLOOR_COUNT } from '../src/generators/floorGenerator.js';

function buildApiWithPlayer() {
  const api = createApi();
  loadPlugins(api, [floorPlugin, wandersPlugin, enemyPlugin]);

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

function descendToFloor(api, player, floor, targetFloor) {
  for (let expectedFloor = 2; expectedFloor <= targetFloor; expectedFloor++) {
    const stairs = floor.getZone().anchors.find((anchor) => anchor.id === 'stairs');
    api.addComponent(player, 'Position', { x: stairs.x, y: stairs.y });
    const outcome = floor.checkForDescent(player);
    assert.equal(outcome, 'descended');
    assert.equal(floor.getCurrentFloor(), expectedFloor);
  }
}

test('checkForDescent advances through every floor up to FLOOR_COUNT, which has a boss anchor instead of stairs', () => {
  const { api, player } = buildApiWithPlayer();
  const floor = createFloorState(api);

  descendToFloor(api, player, floor, FLOOR_COUNT);

  assert.equal(floor.getCurrentFloor(), FLOOR_COUNT);
  assert.equal(floor.getZone().anchors.find((anchor) => anchor.id === 'stairs'), undefined);
  assert.ok(floor.getZone().anchors.find((anchor) => anchor.id === 'boss'));
  // No stairs on the boss floor - checkForDescent is a no-op there, not a
  // crash, regardless of where the player stands.
  assert.equal(floor.checkForDescent(player), null);
});

test('isBossDefeated is false before FLOOR_COUNT, and false while Duke Glyphmund still lives there', () => {
  const { api, player } = buildApiWithPlayer();
  const floor = createFloorState(api);

  assert.equal(floor.isBossDefeated(), false);

  descendToFloor(api, player, floor, FLOOR_COUNT);

  assert.equal(floor.isBossDefeated(), false);
});

test('isBossDefeated is true once Duke Glyphmund has been destroyed on FLOOR_COUNT', () => {
  const { api, player } = buildApiWithPlayer();
  const floor = createFloorState(api);

  descendToFloor(api, player, floor, FLOOR_COUNT);

  const [boss] = api.query(['Boss']);
  assert.ok(boss, 'a Boss-marked entity should exist on the boss floor');
  api.destroyEntity(boss); // simulates dieRule's real cleanup on a killing blow

  assert.equal(floor.isBossDefeated(), true);
});
