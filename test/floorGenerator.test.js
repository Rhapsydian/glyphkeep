import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, loadPlugins } from '@glyphrogue/core';
import floorPlugin from '../src/plugins/floor-plugin/index.js';
import { FLOOR_WIDTH, FLOOR_HEIGHT } from '../src/generators/floorGenerator.js';
import { ENEMY_ARCHETYPES } from '../src/plugins/enemy-plugin/index.js';

function buildApi() {
  const api = createApi();
  loadPlugins(api, [floorPlugin]);
  return api;
}

test('generateZone produces a zone with an entry anchor, a stairs anchor, and a stairs entity in the same place', () => {
  const zone = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-1' });

  assert.equal(zone.width, FLOOR_WIDTH);
  assert.equal(zone.height, FLOOR_HEIGHT);

  const entry = zone.anchors.find((anchor) => anchor.id === 'entry');
  const stairs = zone.anchors.find((anchor) => anchor.id === 'stairs');
  assert.ok(entry);
  assert.ok(stairs);
  assert.notDeepEqual(entry, stairs);

  const stairsEntity = zone.entities.find((entity) => entity.type === 'stairs');
  assert.ok(stairsEntity);
  assert.deepEqual({ x: stairsEntity.x, y: stairsEntity.y }, { x: stairs.x, y: stairs.y });
});

test('the entry and stairs anchors both land on real floor cells', () => {
  const zone = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-1' });
  const entry = zone.anchors.find((anchor) => anchor.id === 'entry');
  const stairs = zone.anchors.find((anchor) => anchor.id === 'stairs');

  assert.equal(zone.cells[entry.y * zone.width + entry.x], 'floor');
  assert.equal(zone.cells[stairs.y * zone.width + stairs.x], 'floor');
});

test('the same (worldSeed, zoneId) pair reproduces an identical floor', () => {
  const first = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-4' });
  const second = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-4' });

  assert.deepEqual(first, second);
});

test('different floor ids produce different layouts', () => {
  const floorOne = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-1' });
  const floorTwo = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-2' });

  assert.notDeepEqual(floorOne.cells, floorTwo.cells);
});

test('enemies are placed on real floor cells, never on the entry or stairs cells', () => {
  const zone = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-1' });
  const entry = zone.anchors.find((anchor) => anchor.id === 'entry');
  const stairs = zone.anchors.find((anchor) => anchor.id === 'stairs');
  const enemyTypes = new Set(Object.keys(ENEMY_ARCHETYPES));
  const enemies = zone.entities.filter((entity) => enemyTypes.has(entity.type));

  assert.ok(enemies.length > 0);
  for (const enemy of enemies) {
    assert.equal(zone.cells[enemy.y * zone.width + enemy.x], 'floor');
    assert.notDeepEqual({ x: enemy.x, y: enemy.y }, { x: entry.x, y: entry.y });
    assert.notDeepEqual({ x: enemy.x, y: enemy.y }, { x: stairs.x, y: stairs.y });
  }
});

test('every solo archetype appears somewhere across a floor with enough rooms', () => {
  const zone = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-1' });
  const spawnedTypes = new Set(zone.entities.map((entity) => entity.type));

  for (const type of Object.keys(ENEMY_ARCHETYPES)) {
    assert.ok(spawnedTypes.has(type), `expected ${type} to spawn on floor-1`);
  }
});
