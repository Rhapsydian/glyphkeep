import { unmount } from 'svelte';
import { createApi, createLocalStorageBackend } from '@glyphrogue/core';
import { mountEditor } from '@glyphrogue/editor';
import { snapshotWorld, restoreWorldFromSnapshot } from '@glyphrogue/editor/hotReload';
import { registerPlugins } from '../bootstrap.js';
import { createRenderer, isWalkableInZone, isOpaqueInZone } from './game.js';
import {
  registerMoveRule,
  registerAttackRule,
  registerDieRule,
  registerPassFallbackRule,
  PLAYER_HEALTH,
  PLAYER_ATTACK,
  PLAYER_DEFENSE,
} from './rules.js';
import { registerEquipmentRules } from './equipment.js';
import { wireKeyboardInput } from './input.js';
import { createFloorState } from './floor.js';
import { showWinScreen, showDeathScreen } from './screens.js';

// floor is assigned below, after api exists - see main.js for why this is
// safe despite isWalkable/isOpaque being handed to createApi() first.
let floor;
const mapQuery = {
  isWalkable: (x, y) => isWalkableInZone(floor.getZone(), x, y),
  isOpaque: (x, y) => isOpaqueInZone(floor.getZone(), x, y),
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
registerAttackRule(api);
registerDieRule(api);
registerPassFallbackRule(api);
registerEquipmentRules(api);

// floor.js's own currentFloor/zone bookkeeping is plain JS-closure state,
// not part of the save DTO's game slice (this harness doesn't wire
// serializeGame/deserializeGame at all) - so a restore always resumes
// floor-sequencing at floor 1, deliberately, rather than half-tracking it.
// clearFloorOwnedEntities is tag-based specifically so this is safe even
// when the restored world still has a later floor's stairs/entities in it
// from before the reload - they get swept up and replaced, not duplicated.
floor = createFloorState(api);

// Only create the player (and its stats) on a genuine cold start - a
// restored api already has one, with whatever Health it had at snapshot
// time (that part of the DTO round-trips correctly; only Position gets
// reset, per the note above).
const player = restored
  ? api.query(['Position', 'PlayerControlled'])[0]
  : (() => {
      const entity = api.createEntity();
      api.addComponent(entity, 'PlayerControlled', {});
      api.addComponent(entity, 'Health', { current: PLAYER_HEALTH, max: PLAYER_HEALTH });
      api.addComponent(entity, 'Attack', { value: PLAYER_ATTACK });
      api.addComponent(entity, 'Defense', { value: PLAYER_DEFENSE });
      api.addComponent(entity, 'Equipment', { weaponId: null, armorId: null });
      api.addComponent(entity, 'Inventory', { itemIds: [] });
      api.addActor(entity, 0);
      return entity;
    })();
floor.placePlayerAtEntry(player);

const renderer = createRenderer(document.getElementById('game'));

// engine.locked itself isn't part of the serialized DTO either (it's
// transient UI-wait state, not simulation state) - run() re-derives it
// correctly either way: on a genuine cold start it locks waiting for the
// player's first move, on a restore it fast-forwards any actors whose turn
// was already due (none, in practice - a snapshot only ever happens while
// already locked waiting for the player) and re-locks the same way.
api.run();
renderer.render(api, player, floor.getZone());

const keyboardSource = wireKeyboardInput({
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
    else if (floor.isBossDefeated()) showWinScreen(document.getElementById('game'));
  },
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
