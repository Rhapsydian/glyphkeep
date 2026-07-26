import { createApi } from '@glyphrogue/core';
import { registerPlugins } from '../bootstrap.js';
import { createRenderer, isWalkableInZone, isOpaqueInZone } from './game.js';
import { registerMoveRule } from './rules.js';
import { wireKeyboardInput } from './input.js';
import { createFloorState } from './floor.js';
import { showWinScreen } from './screens.js';

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

floor = createFloorState(api);

const player = api.createEntity();
api.addComponent(player, 'PlayerControlled', {});
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
    const outcome = floor.checkForDescent(player);
    if (outcome === 'won') {
      showWinScreen(document.getElementById('game'));
      return;
    }
    if (outcome === 'descended') renderer.resetZone();
    renderer.render(api, player, floor.getZone());
  },
});

// Handy for poking at the live world from devtools during local testing.
window.__game = api;
window.__floor = floor;
