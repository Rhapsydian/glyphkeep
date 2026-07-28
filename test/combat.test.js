import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '@glyphrogue/core';
import { registerAttackRule, registerDieRule, HIT_CHANCE, WEAPON_MIN_DAMAGE } from '../src/rules.js';

// ctx.rng is the same live object as api.rng, so a scripted deterministic
// sequence (instead of a real seeded stream) is injected by monkey-patching
// api.rng.next directly - each test controls exactly which branch (hit/miss,
// min/max damage roll) it exercises.
function buildCombatants(rngValues) {
  const api = createApi();
  let index = 0;
  api.rng.next = () => rngValues[index++];
  registerAttackRule(api);
  registerDieRule(api);

  const attacker = api.createEntity();
  api.addComponent(attacker, 'Attack', { value: 0 });

  const target = api.createEntity();
  api.addComponent(target, 'Health', { current: 5, max: 5 });
  api.addComponent(target, 'Defense', { value: 0 });

  return { api, attacker, target };
}

test('a roll at or above HIT_CHANCE is a miss - no damage, no follow-on', () => {
  const { api, attacker, target } = buildCombatants([HIT_CHANCE]);

  const { resolved } = api.dispatch({ type: 'Attack', entity: attacker, target });

  assert.deepEqual(resolved.map((a) => a.type), ['Attack']);
  assert.equal(api.getComponent(target, 'Health').current, 5);
});

test('a roll below HIT_CHANCE hits and applies the minimum weapon damage on a 0 damage roll', () => {
  const { api, attacker, target } = buildCombatants([0, 0]);

  api.dispatch({ type: 'Attack', entity: attacker, target });

  assert.equal(api.getComponent(target, 'Health').current, 5 - WEAPON_MIN_DAMAGE);
});

test('damage is never less than 1, even when Defense would otherwise zero it out', () => {
  const { api, attacker, target } = buildCombatants([0, 0]);
  api.addComponent(target, 'Defense', { value: 99 });

  api.dispatch({ type: 'Attack', entity: attacker, target });

  assert.equal(api.getComponent(target, 'Health').current, 4);
});

test('Attack/Defense stats shift damage up or down around the weapon roll', () => {
  const { api, attacker, target } = buildCombatants([0, 0]);
  api.addComponent(attacker, 'Attack', { value: 3 });

  api.dispatch({ type: 'Attack', entity: attacker, target });

  assert.equal(api.getComponent(target, 'Health').current, 5 - (WEAPON_MIN_DAMAGE + 3));
});

test('a killing blow emits a Die follow-on and dieRule removes a non-player target from the world', () => {
  const { api, attacker, target } = buildCombatants([0, 1]); // hit, max damage roll
  api.addComponent(target, 'Health', { current: 1, max: 5 });
  api.addActor(target, 50);

  const { resolved } = api.dispatch({ type: 'Attack', entity: attacker, target });

  assert.deepEqual(resolved.map((a) => a.type), ['Attack', 'Die']);
  assert.equal(api.hasComponent(target, 'Health'), false);
  assert.equal(api.scheduler.actors.has(target), false);
});

test('dieRule does not destroy a PlayerControlled entity - the outer game loop handles player death', () => {
  const api = createApi();
  registerDieRule(api);

  const player = api.createEntity();
  api.addComponent(player, 'PlayerControlled', {});
  api.addComponent(player, 'Health', { current: 0, max: 20 });

  api.dispatch({ type: 'Die', entity: player });

  assert.equal(api.hasComponent(player, 'Health'), true);
  assert.equal(api.getComponent(player, 'Health').current, 0);
});
