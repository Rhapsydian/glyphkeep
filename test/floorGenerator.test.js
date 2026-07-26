import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, loadPlugins } from '@glyphrogue/core';
import floorPlugin from '../src/plugins/floor-plugin/index.js';
import { FLOOR_WIDTH, FLOOR_HEIGHT } from '../src/generators/floorGenerator.js';

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
