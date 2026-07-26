import { unmount } from 'svelte';
import { createApi, createLocalStorageBackend } from '@glyphrogue/core';
import { mountEditor } from '@glyphrogue/editor';
import { snapshotWorld, restoreWorldFromSnapshot } from '@glyphrogue/editor/hotReload';
import { registerPlugins } from '../bootstrap.js';
import { instantiateZoneContent, createRenderer, isWalkableInZone, isOpaqueInZone } from './game.js';
import { registerMoveRule } from './rules.js';
import { wireKeyboardInput } from './input.js';
import starterRoom from './maps/templates/starter-room.json';

// Phase 1 checkpoint 1: a single fixed zone. See main.js for the same note.
const zone = starterRoom;
const mapQuery = {
  isWalkable: (x, y) => isWalkableInZone(zone, x, y),
  isOpaque: (x, y) => isOpaqueInZone(zone, x, y),
};

// sessionStorage, not localStorage: this snapshot only needs to bridge a
// single Vite HMR cycle within the current tab, not survive an actually
// closed tab the way a real player save (localStorage) should.
const hotReloadStorage = createLocalStorageBackend(sessionStorage);
const HOT_RELOAD_KEY = 'glyphrogue-dev-fixture';

// mapQuery is passed to both the restore path and the cold-start path -
// deserialize doesn't round-trip isWalkable/isOpaque through the snapshot
// itself (they're closures, not serializable data), so every restore needs
// them re-supplied fresh from this same zone reference.
const restored = await restoreWorldFromSnapshot(hotReloadStorage, HOT_RELOAD_KEY, mapQuery);
const api = restored ?? createApi(mapQuery);

// Plugin/rule registrations aren't part of serialize/deserialize's
// round-tripped world data, so this has to run every time, restored or not.
registerPlugins(api);
registerMoveRule(api);

// Only seed the starter content on a genuine cold start - a restored api
// already has it (and whatever got mutated before the last HMR update).
const player = restored
  ? api.query(['Position', 'PlayerControlled'])[0]
  : instantiateZoneContent(api, zone);

const renderer = createRenderer(document.getElementById('game'));

// engine.locked itself isn't part of the serialized DTO either (it's
// transient UI-wait state, not simulation state) - run() re-derives it
// correctly either way: on a genuine cold start it locks waiting for the
// player's first move, on a restore it fast-forwards any actors whose turn
// was already due (none, in practice - a snapshot only ever happens while
// already locked waiting for the player) and re-locks the same way.
api.run();
renderer.render(api, player, zone);

const keyboardSource = wireKeyboardInput({
  target: window,
  api,
  player,
  onMove: () => renderer.render(api, player, zone),
});

const editorInstance = mountEditor(document.getElementById('editor-root'), api);

// Self-accepting: without this, Vite has no HMR boundary for this module
// and falls back to a full page reload, which tears everything down
// without ever running dispose logic at all.
import.meta.hot?.accept();

// Vite keeps only the *last* hot.dispose() registration per module (a
// single slot, not a queue) - world-snapshotting, unmounting the previous
// editor instance, and tearing down the previous keyboard listener (or
// every HMR cycle stacks another window-level keydown/keyup pair, moving
// the player multiple cells per keypress) all have to happen from this one
// combined callback.
import.meta.hot?.dispose(async () => {
  keyboardSource.stop();
  unmount(editorInstance);
  await snapshotWorld(api, hotReloadStorage, HOT_RELOAD_KEY);
});
