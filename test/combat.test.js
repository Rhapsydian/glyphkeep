import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '@glyphrogue/core';
import {
  registerAttackRule,
  registerDieRule,
  HIT_CHANCE,
  WEAPON_MIN_DAMAGE,
  BOSS_ENRAGE_DAMAGE_BONUS,
} from '../src/rules.js';

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

test('higher Defense lowers hit chance, not just damage (wraith\'s "hard to hit" identity)', () => {
  const { api, attacker, target } = buildCombatants([0.5]);
  // hitChance floors at MIN_HIT_CHANCE (0.2) well before defense=14, so a
  // 0.5 roll - which would hit at the base HIT_CHANCE (0.8) - now misses.
  api.addComponent(target, 'Defense', { value: 14 });

  const { resolved } = api.dispatch({ type: 'Attack', entity: attacker, target });

  assert.deepEqual(resolved.map((a) => a.type), ['Attack']);
  assert.equal(api.getComponent(target, 'Health').current, 5);
});

test('a Boss above the enrage threshold (>50% health) attacks with no bonus', () => {
  const { api, attacker, target } = buildCombatants([HIT_CHANCE]); // a miss at the base HIT_CHANCE, no bonus
  api.addComponent(attacker, 'Boss', {});
  api.addComponent(attacker, 'Health', { current: 21, max: 40 }); // above half

  const { resolved } = api.dispatch({ type: 'Attack', entity: attacker, target });

  assert.deepEqual(resolved.map((a) => a.type), ['Attack']);
  assert.equal(api.getComponent(target, 'Health').current, 5);
});

test('an enraged Boss (at or below half health) gets a hit-chance bonus', () => {
  const { api, attacker, target } = buildCombatants([HIT_CHANCE, 0]); // misses without the bonus, hits (min damage roll) with it
  api.addComponent(attacker, 'Boss', {});
  api.addComponent(attacker, 'Health', { current: 20, max: 40 }); // exactly at half - enraged

  api.dispatch({ type: 'Attack', entity: attacker, target });

  assert.ok(api.getComponent(target, 'Health').current < 5, 'the enrage hit-chance bonus should turn this roll into a hit');
});

test('an enraged Boss deals bonus damage on top of the normal roll', () => {
  const { api, attacker, target } = buildCombatants([0, 0]); // hit, minimum weapon roll
  api.addComponent(attacker, 'Boss', {});
  api.addComponent(attacker, 'Health', { current: 10, max: 40 }); // well below half - enraged

  api.dispatch({ type: 'Attack', entity: attacker, target });

  assert.equal(api.getComponent(target, 'Health').current, 5 - (WEAPON_MIN_DAMAGE + BOSS_ENRAGE_DAMAGE_BONUS));
});

test('a non-Boss entity never gets the enrage bonus, however low its health', () => {
  const { api, attacker, target } = buildCombatants([HIT_CHANCE]); // would only hit with the enrage bonus
  api.addComponent(attacker, 'Health', { current: 1, max: 40 }); // no Boss component

  const { resolved } = api.dispatch({ type: 'Attack', entity: attacker, target });

  assert.deepEqual(resolved.map((a) => a.type), ['Attack']);
  assert.equal(api.getComponent(target, 'Health').current, 5);
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
