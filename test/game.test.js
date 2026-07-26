import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computeFov } from '@glyphrogue/core';
import { cellAt, isWalkableInZone, isOpaqueInZone, classifyTerrainCell } from '../src/game.js';

const starterRoom = JSON.parse(
  readFileSync(fileURLToPath(new URL('../src/maps/templates/starter-room.json', import.meta.url)), 'utf8'),
);

test('cellAt reads the flat row-major cells array', () => {
  assert.equal(cellAt(starterRoom, 4, 3), 'floor');
  assert.equal(cellAt(starterRoom, 0, 0), 'wall');
});

test('cellAt returns undefined off the edge of the zone', () => {
  assert.equal(cellAt(starterRoom, -1, 0), undefined);
  assert.equal(cellAt(starterRoom, starterRoom.width, 0), undefined);
  assert.equal(cellAt(starterRoom, 0, starterRoom.height), undefined);
});

test('isWalkableInZone is true only for floor cells', () => {
  assert.equal(isWalkableInZone(starterRoom, 4, 3), true);
  assert.equal(isWalkableInZone(starterRoom, 0, 0), false);
  assert.equal(isWalkableInZone(starterRoom, -1, 0), false);
});

test('isOpaqueInZone is true for walls and out-of-bounds, false for floor', () => {
  assert.equal(isOpaqueInZone(starterRoom, 0, 0), true);
  assert.equal(isOpaqueInZone(starterRoom, 4, 3), false);
  assert.equal(isOpaqueInZone(starterRoom, -1, 0), true);
});

test('classifyTerrainCell hides a cell that has never been in FOV or remembered', () => {
  const fov = new Set(['4,3']);
  const remembered = new Set();

  assert.equal(classifyTerrainCell(starterRoom, fov, remembered, 4, 3).classification, 'visible');
  assert.equal(classifyTerrainCell(starterRoom, fov, remembered, 1, 1), null);
});

test('classifyTerrainCell reports remembered for a previously-seen, now out-of-FOV cell', () => {
  const fov = new Set(['4,3']);
  const remembered = new Set(['1,1']);

  const classified = classifyTerrainCell(starterRoom, fov, remembered, 1, 1);
  assert.equal(classified.classification, 'remembered');
  assert.equal(classified.cellType, 'floor');
});

test('classifyTerrainCell returns null past the zone edge even if the coordinate is technically in FOV', () => {
  const origin = { x: 4, y: 3 };
  const fov = computeFov(origin, 20, { isOpaque: (x, y) => isOpaqueInZone(starterRoom, x, y) });

  assert.equal(classifyTerrainCell(starterRoom, fov, new Set(), -1, 3), null);
});

test('a wall blocks FOV from reaching cells behind it', () => {
  const origin = { x: 4, y: 3 };
  // Every reachable cell here is walled in on all four sides, so FOV from
  // the room's center should never reach outside the room's floor.
  const fov = computeFov(origin, 20, { isOpaque: (x, y) => isOpaqueInZone(starterRoom, x, y) });

  assert.equal(fov.has('4,3'), true);
  assert.equal(fov.has(`${starterRoom.width + 5},3`), false);
});
