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

test('every spawned enemy is within its own archetype\'s minFloor/maxFloor range for the requested depth', () => {
  for (const depth of [1, 5, 10]) {
    const zone = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: `floor-${depth}`, params: { depth } });
    for (const entity of zone.entities) {
      const archetype = ENEMY_ARCHETYPES[entity.type];
      if (!archetype) continue; // 'stairs' isn't a bestiary archetype
      assert.ok(
        depth >= archetype.minFloor && depth <= archetype.maxFloor,
        `${entity.type} shouldn't spawn on floor ${depth} (range ${archetype.minFloor}-${archetype.maxFloor})`,
      );
    }
  }
});

test('undead archetypes never spawn on the shallowest floor, and shallow-only archetypes never spawn on the deepest', () => {
  const shallow = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-1', params: { depth: 1 } });
  const shallowTypes = new Set(shallow.entities.map((entity) => entity.type));
  assert.equal(shallowTypes.has('skeleton'), false);
  assert.equal(shallowTypes.has('wraith'), false);

  const deep = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-10', params: { depth: 10 } });
  const deepTypes = new Set(deep.entities.map((entity) => entity.type));
  assert.equal(deepTypes.has('wanderer'), false);
  assert.equal(deepTypes.has('mouse'), false);
});

test('the same (worldSeed, zoneId, depth) reproduces an identical enemy distribution', () => {
  const first = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-5', params: { depth: 5 } });
  const second = buildApi().generateZone({ generatorId: 'glyphkeep-floor', zoneId: 'floor-5', params: { depth: 5 } });

  assert.deepEqual(first, second);
});
