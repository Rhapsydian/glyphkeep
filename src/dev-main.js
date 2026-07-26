import { unmount } from 'svelte';
import { createApi, createLocalStorageBackend } from '@glyphrogue/core';
import { mountEditor } from '@glyphrogue/editor';
import { snapshotWorld, restoreWorldFromSnapshot } from '@glyphrogue/editor/hotReload';
import { registerPlugins } from '../bootstrap.js';
import { instantiateZoneContent, createRenderer, isWalkableInZone, isOpaqueInZone } from './game.js';
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

// Plugin registrations aren't part of serialize/deserialize's round-tripped
// world data, so this has to run every time, restored or not.
registerPlugins(api);

// Only seed the starter content on a genuine cold start - a restored api
// already has it (and whatever got mutated before the last HMR update).
const player = restored
  ? api.query(['Position', 'PlayerControlled'])[0]
  : instantiateZoneContent(api, zone);

createRenderer(document.getElementById('game')).render(api, player, zone);
const editorInstance = mountEditor(document.getElementById('editor-root'), api);

// Self-accepting: without this, Vite has no HMR boundary for this module
// and falls back to a full page reload, which tears everything down
// without ever running dispose logic at all.
import.meta.hot?.accept();

// Vite keeps only the *last* hot.dispose() registration per module (a
// single slot, not a queue) - world-snapshotting and unmounting the
// previous editor instance both have to happen from this one combined
// callback.
import.meta.hot?.dispose(async () => {
  unmount(editorInstance);
  await snapshotWorld(api, hotReloadStorage, HOT_RELOAD_KEY);
});
