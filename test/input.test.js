import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '@glyphrogue/core';
import { registerMoveRule } from '../src/rules.js';
import { wireKeyboardInput } from '../src/input.js';

// createKeyboardSource is duck-typed against addEventListener/
// removeEventListener (keyboardSource.js's own doc comment) precisely so
// tests can inject a fake instead of needing a real DOM.
function createFakeTarget() {
  const handlers = {};
  return {
    addEventListener(type, handler) {
      handlers[type] = handler;
    },
    removeEventListener(type) {
      delete handlers[type];
    },
    fireKeyDown(code) {
      handlers.keydown?.({ code, repeat: false });
    },
  };
}

const OPEN_FLOOR = () => true;

function buildApi() {
  const api = createApi({ isWalkable: OPEN_FLOOR, isOpaque: () => false });
  registerMoveRule(api);
  return api;
}

test('an arrow-key press moves the player one cell and re-renders', () => {
  const api = buildApi();
  const player = api.createEntity();
  api.addComponent(player, 'Position', { x: 5, y: 5 });
  api.addComponent(player, 'PlayerControlled', {});
  api.addActor(player, 0);
  api.run();

  const target = createFakeTarget();
  let renderCount = 0;
  wireKeyboardInput({ target, api, player, onMove: () => renderCount++ });

  target.fireKeyDown('ArrowUp');

  assert.deepEqual(api.getComponent(player, 'Position'), { x: 5, y: 4 });
  assert.equal(renderCount, 1);
});

test('WASD is bound to the same movement as the arrow keys', () => {
  const api = buildApi();
  const player = api.createEntity();
  api.addComponent(player, 'Position', { x: 5, y: 5 });
  api.addComponent(player, 'PlayerControlled', {});
  api.addActor(player, 0);
  api.run();

  const target = createFakeTarget();
  wireKeyboardInput({ target, api, player, onMove: () => {} });

  target.fireKeyDown('KeyD');

  assert.deepEqual(api.getComponent(player, 'Position'), { x: 6, y: 5 });
});

test('an unbound key is a no-op', () => {
  const api = buildApi();
  const player = api.createEntity();
  api.addComponent(player, 'Position', { x: 5, y: 5 });
  api.addComponent(player, 'PlayerControlled', {});
  api.addActor(player, 0);
  api.run();

  const target = createFakeTarget();
  let renderCount = 0;
  wireKeyboardInput({ target, api, player, onMove: () => renderCount++ });

  target.fireKeyDown('KeyQ');

  assert.deepEqual(api.getComponent(player, 'Position'), { x: 5, y: 5 });
  assert.equal(renderCount, 0);
});

test('pressing I invokes onOpenInventory instead of moving', () => {
  const api = buildApi();
  const player = api.createEntity();
  api.addComponent(player, 'Position', { x: 5, y: 5 });
  api.addComponent(player, 'PlayerControlled', {});
  api.addActor(player, 0);
  api.run();

  const target = createFakeTarget();
  let opened = 0;
  wireKeyboardInput({ target, api, player, onMove: () => {}, onOpenInventory: () => opened++ });

  target.fireKeyDown('KeyI');

  assert.equal(opened, 1);
  assert.deepEqual(api.getComponent(player, 'Position'), { x: 5, y: 5 });
});

test('a non-empty capture stack blocks movement fallthrough (e.g. a screen is open)', () => {
  const api = buildApi();
  const player = api.createEntity();
  api.addComponent(player, 'Position', { x: 5, y: 5 });
  api.addComponent(player, 'PlayerControlled', {});
  api.addActor(player, 0);
  api.run();

  const target = createFakeTarget();
  const { captureStack } = wireKeyboardInput({ target, api, player, onMove: () => {} });

  captureStack.push('inventory');
  target.fireKeyDown('ArrowUp');

  assert.deepEqual(api.getComponent(player, 'Position'), { x: 5, y: 5 });
});
