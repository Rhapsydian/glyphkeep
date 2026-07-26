import { createApi, createRng } from '@glyphrogue/core';
import { registerPlugins } from '../bootstrap.js';
import { createRenderer, isWalkableInZone, isOpaqueInZone } from './game.js';
import {
  registerMoveRule,
  registerAttackRule,
  registerDieRule,
  PLAYER_HEALTH,
  PLAYER_ATTACK,
  PLAYER_DEFENSE,
} from './rules.js';
import { wireKeyboardInput } from './input.js';
import { createFloorState } from './floor.js';
import { showWinScreen, showDeathScreen } from './screens.js';

// floor is assigned below, after api exists (createFloorState needs
// api.generateZone) - isWalkable/isOpaque only need floor to exist by the
// time they're actually invoked during gameplay, not at createApi() time.
let floor;

const api = createApi({
  isWalkable: (x, y) => isWalkableInZone(floor.getZone(), x, y),
  isOpaque: (x, y) => isOpaqueInZone(floor.getZone(), x, y),
});
registerPlugins(api);
registerMoveRule(api);
// A rule's ctx has no rng access (BACKLOG.md's cross-project section) -
// combatRng is glyphkeep's own stream, seeded from the world's own seed so
// it's still deterministic per run, just not literally api.rng itself.
const combatRng = createRng(api.rng.state);
registerAttackRule(api, combatRng);
registerDieRule(api);

floor = createFloorState(api);

const player = api.createEntity();
api.addComponent(player, 'PlayerControlled', {});
api.addComponent(player, 'Health', { current: PLAYER_HEALTH, max: PLAYER_HEALTH });
api.addComponent(player, 'Attack', { value: PLAYER_ATTACK });
api.addComponent(player, 'Defense', { value: PLAYER_DEFENSE });
api.addActor(player, 0);
floor.placePlayerAtEntry(player);

const renderer = createRenderer(document.getElementById('game'));

// Locks the engine waiting for the player's first move (no other actors
// exist yet to take a turn first).
api.run();
renderer.render(api, player, floor.getZone());

wireKeyboardInput({
  target: window,
  api,
  player,
  onMove: () => {
    const dead = api.getComponent(player, 'Health').current <= 0;
    // Death takes priority over descent - checked first, but still render
    // the actual final frame before overlaying either placeholder screen,
    // rather than freezing on the previous turn's stale canvas.
    const outcome = dead ? null : floor.checkForDescent(player);
    if (outcome === 'descended') renderer.resetZone();

    renderer.render(api, player, floor.getZone());

    if (dead) showDeathScreen(document.getElementById('game'), floor.getCurrentFloor());
    if (outcome === 'won') showWinScreen(document.getElementById('game'));
  },
});

// Handy for poking at the live world from devtools during local testing.
window.__game = api;
window.__floor = floor;
