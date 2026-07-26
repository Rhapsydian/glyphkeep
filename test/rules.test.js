import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '@glyphrogue/core';
import { registerMoveRule, MOVE_COST } from '../src/rules.js';

// A 3-wide, 1-tall strip: floor, floor, wall - just enough to exercise
// blocked vs. open movement without needing a real zone/tileset.
const CELLS = ['floor', 'floor', 'wall'];

function buildApi() {
  const api = createApi({
    isWalkable: (x, y) => y === 0 && x >= 0 && x < CELLS.length && CELLS[x] === 'floor',
    isOpaque: (x, y) => !(y === 0 && x >= 0 && x < CELLS.length && CELLS[x] === 'floor'),
  });
  registerMoveRule(api);
  return api;
}

test('moveRule updates Position when the target cell is open floor', () => {
  const api = buildApi();
  const entity = api.createEntity();
  api.addComponent(entity, 'Position', { x: 0, y: 0 });

  const { resolved, vetoed } = api.dispatch({ type: 'Move', entity, to: { x: 1, y: 0 }, cost: MOVE_COST });

  assert.equal(vetoed.length, 0);
  assert.equal(resolved.length, 1);
  assert.deepEqual(api.getComponent(entity, 'Position'), { x: 1, y: 0 });
});

test('moveRule leaves Position unchanged when the target cell is a wall', () => {
  const api = buildApi();
  const entity = api.createEntity();
  api.addComponent(entity, 'Position', { x: 1, y: 0 });

  api.dispatch({ type: 'Move', entity, to: { x: 2, y: 0 }, cost: MOVE_COST });

  assert.deepEqual(api.getComponent(entity, 'Position'), { x: 1, y: 0 });
});

test('moveRule leaves Position unchanged for an out-of-bounds target', () => {
  const api = buildApi();
  const entity = api.createEntity();
  api.addComponent(entity, 'Position', { x: 0, y: 0 });

  api.dispatch({ type: 'Move', entity, to: { x: 0, y: 1 }, cost: MOVE_COST });

  assert.deepEqual(api.getComponent(entity, 'Position'), { x: 0, y: 0 });
});

test('moveRule redirects to an Attack follow-on instead of moving, when the target cell holds a Health-bearing entity', () => {
  const api = buildApi();
  const mover = api.createEntity();
  api.addComponent(mover, 'Position', { x: 0, y: 0 });

  const target = api.createEntity();
  api.addComponent(target, 'Position', { x: 1, y: 0 });
  api.addComponent(target, 'Health', { current: 5, max: 5 });

  const { resolved } = api.dispatch({ type: 'Move', entity: mover, to: { x: 1, y: 0 }, cost: MOVE_COST });

  // Mover's own position is unchanged - the Move became an Attack, not a step.
  assert.deepEqual(api.getComponent(mover, 'Position'), { x: 0, y: 0 });
  assert.deepEqual(resolved.map((action) => action.type), ['Move', 'Attack']);
  assert.equal(resolved[1].target, target);
});

test('moveRule does not redirect into itself when the mover itself carries Health', () => {
  const api = buildApi();
  const entity = api.createEntity();
  api.addComponent(entity, 'Position', { x: 0, y: 0 });
  api.addComponent(entity, 'Health', { current: 5, max: 5 });

  const { resolved } = api.dispatch({ type: 'Move', entity, to: { x: 1, y: 0 }, cost: MOVE_COST });

  assert.deepEqual(resolved.map((action) => action.type), ['Move']);
  assert.deepEqual(api.getComponent(entity, 'Position'), { x: 1, y: 0 });
});
