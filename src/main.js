import { createApi } from '@glyphrogue/core';
import { registerPlugins } from '../bootstrap.js';
import { instantiateZoneContent, createRenderer, isWalkableInZone, isOpaqueInZone } from './game.js';
import starterRoom from './maps/templates/starter-room.json';

// Phase 1 checkpoint 1: a single fixed zone (the scaffold's starter room).
// Checkpoint 3 replaces this with api.generateZone-driven floors and a real
// current-floor concept.
const zone = starterRoom;

const api = createApi({
  isWalkable: (x, y) => isWalkableInZone(zone, x, y),
  isOpaque: (x, y) => isOpaqueInZone(zone, x, y),
});
registerPlugins(api);
const player = instantiateZoneContent(api, zone);

createRenderer(document.getElementById('game')).render(api, player, zone);

// Handy for poking at the live world from devtools during local testing.
window.__game = api;
