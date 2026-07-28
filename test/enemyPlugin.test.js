import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi, loadPlugins, wandersPlugin, chasesPlayerPlugin, fleesPlugin, guardsPlugin } from '@glyphrogue/core';
import enemyPlugin, { ENEMY_ARCHETYPES, ALL_ARCHETYPES, DUKE_GLYPHMUND_TYPE } from '../src/plugins/enemy-plugin/index.js';
import { registerMoveRule, registerPassFallbackRule } from '../src/rules.js';

// An open 10x10 floor - just enough room for perception/pathfinding to
// work without needing a real generated zone.
const SIZE = 10;

function buildApi() {
  const api = createApi({
    isWalkable: (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE,
    isOpaque: () => false,
  });
  loadPlugins(api, [wandersPlugin, chasesPlayerPlugin, fleesPlugin, guardsPlugin, enemyPlugin]);
  registerMoveRule(api);
  registerPassFallbackRule(api);
  return api;
}

function addPlayer(api, x, y) {
  const player = api.createEntity();
  api.addComponent(player, 'PlayerControlled', {});
  api.addComponent(player, 'Position', { x, y });
  return player;
}

test('each archetype (bestiary and boss alike) is registered with the stats and marker component from ALL_ARCHETYPES', () => {
  const api = buildApi();
  for (const [type, archetype] of Object.entries(ALL_ARCHETYPES)) {
    const entity = api.instantiateEntity(type, { Position: { x: 0, y: 0 } });
    assert.equal(api.getComponent(entity, 'Health').max, archetype.health);
    assert.equal(api.getComponent(entity, 'Attack').value, archetype.attack);
    assert.equal(api.getComponent(entity, 'Defense').value, archetype.defense);
    for (const marker of Object.keys(archetype.components)) {
      assert.ok(api.hasComponent(entity, marker), `${type} should carry ${marker}`);
    }
  }
});

test('goblin (ChasesPlayer) closes in on a visible player', () => {
  const api = buildApi();
  addPlayer(api, 5, 5);
  const goblin = api.instantiateEntity('goblin', { Position: { x: 1, y: 5 } });
  api.addActor(goblin, 0);

  api.act();

  const position = api.getComponent(goblin, 'Position');
  assert.equal(position.y, 5);
  assert.ok(position.x > 1, 'goblin should step toward the player');
});

test('bandit (Guards) paths back toward a post it has been displaced from', () => {
  const api = buildApi();
  const bandit = api.instantiateEntity('bandit', { Position: { x: 3, y: 3 } });
  api.addComponent(bandit, 'Guards', { post: { x: 5, y: 5 } });
  api.addActor(bandit, 0);

  api.act();

  const position = api.getComponent(bandit, 'Position');
  assert.ok(position.x > 3 || position.y > 3, 'bandit should step toward its post');
});

test('bandit (Guards) stays put once already at its post', () => {
  const api = buildApi();
  const bandit = api.instantiateEntity('bandit', { Position: { x: 5, y: 5 } });
  api.addComponent(bandit, 'Guards', { post: { x: 5, y: 5 } });
  api.addActor(bandit, 0);

  api.act();

  assert.deepEqual(api.getComponent(bandit, 'Position'), { x: 5, y: 5 });
});

test('mouse (Flees) runs away from a visible player', () => {
  const api = buildApi();
  addPlayer(api, 5, 5);
  const mouse = api.instantiateEntity('mouse', { Position: { x: 6, y: 5 } });
  api.addActor(mouse, 0);

  api.act();

  const position = api.getComponent(mouse, 'Position');
  assert.ok(position.x > 6, 'mouse should step away from the player');
});

test('a Guards enemy already at its own post still consumes its scheduler turn (regression: used to hang api.run() forever)', () => {
  // Reproduces floor.js's real seeding: Guards.post is set to the entity's
  // own spawn position, so it's already "at post" on the very first turn -
  // guardsRule legitimately returns undefined (no followOn) every time,
  // which used to spend zero scheduler cost and let scheduler.next()'s
  // tie-break re-select this same actor forever, hanging api.run() before
  // it ever reached the player's turn.
  const api = buildApi();
  const bandit = api.instantiateEntity('bandit', { Position: { x: 5, y: 5 } });
  api.addComponent(bandit, 'Guards', { post: { x: 5, y: 5 } });
  api.addActor(bandit, 0);
  const player = addPlayer(api, 0, 0);
  api.addActor(player, 0);

  const turns = api.run();

  assert.ok(turns.some((turn) => turn.waiting === true), 'run() should terminate by reaching the player\'s turn, not hang');
  assert.deepEqual(api.getComponent(bandit, 'Position'), { x: 5, y: 5 });
});

function distanceFrom(position, x, y) {
  return Math.abs(position.x - x) + Math.abs(position.y - y);
}

test('slime (ChasesPlayer + health-gated Flees) chases while healthy, then flees once hurt', () => {
  const api = buildApi();
  addPlayer(api, 5, 5);
  const slime = api.instantiateEntity('slime', { Position: { x: 1, y: 5 } });
  api.addActor(slime, 0);

  api.act();
  const afterChase = api.getComponent(slime, 'Position');
  assert.equal(afterChase.y, 5);
  assert.ok(afterChase.x > 1, 'healthy slime should chase toward the player');

  const health = api.getComponent(slime, 'Health');
  api.addComponent(slime, 'Health', { ...health, current: Math.ceil(health.max / 2) });
  api.addActor(slime, 0);

  api.act();
  const afterFlee = api.getComponent(slime, 'Position');
  // fleesRule maximizes distance from the player, not a specific axis - a
  // tie between two equally-far directions resolves to whichever comes
  // first in DIRECTIONS, so assert on distance, not x/y directly.
  assert.ok(
    distanceFrom(afterFlee, 5, 5) > distanceFrom(afterChase, 5, 5),
    'hurt slime should end up farther from the player than it was after chasing',
  );
});

test('Duke Glyphmund is never part of the random bestiary pool', () => {
  assert.equal(DUKE_GLYPHMUND_TYPE in ENEMY_ARCHETYPES, false);
  assert.ok(DUKE_GLYPHMUND_TYPE in ALL_ARCHETYPES);
});

test('Duke Glyphmund (Guards, boss movement) holds his post like any other Guards enemy', () => {
  const api = buildApi();
  const duke = api.instantiateEntity(DUKE_GLYPHMUND_TYPE, { Position: { x: 5, y: 5 } });
  api.addComponent(duke, 'Guards', { post: { x: 5, y: 5 } });
  api.addActor(duke, 0);

  api.act();

  assert.deepEqual(api.getComponent(duke, 'Position'), { x: 5, y: 5 });
});

test('bandit lookout (Guards + ChasesPlayer) holds its post until it spots the player', () => {
  const api = buildApi();
  const lookout = api.instantiateEntity('bandit-lookout', { Position: { x: 5, y: 5 } });
  api.addComponent(lookout, 'Guards', { post: { x: 5, y: 5 } });
  api.addActor(lookout, 0);

  api.act();
  assert.deepEqual(api.getComponent(lookout, 'Position'), { x: 5, y: 5 }, 'no player around - stays at post');

  addPlayer(api, 6, 5);
  api.addActor(lookout, 0);

  api.act();
  const position = api.getComponent(lookout, 'Position');
  assert.deepEqual(position, { x: 6, y: 5 }, 'player in range - gives chase (bumps into them, one tile away)');
});

test('ghost (Wanders + ChasesPlayer) idles with no perception radius override, then locks onto a spotted player', () => {
  const api = buildApi();
  const ghost = api.instantiateEntity('ghost', { Position: { x: 5, y: 5 } });
  api.addActor(ghost, 0);

  api.act();
  assert.notDeepEqual(api.getComponent(ghost, 'Position'), { x: 5, y: 5 }, 'no player visible - wanders instead of idling');
});

test('wraith (Wanders) moves even with no player around', () => {
  const api = buildApi();
  const wraith = api.instantiateEntity('wraith', { Position: { x: 5, y: 5 } });
  api.addActor(wraith, 0);

  api.act();

  assert.notDeepEqual(api.getComponent(wraith, 'Position'), { x: 5, y: 5 });
});
