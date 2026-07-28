// glyphkeep's own BSP floor generator (checkpoint 3) - not the stock
// bspPlugin, because the stock bspGenerator (glyphrogue's packages/core/src/
// bsp.js) only ever pushes an 'entry' anchor and discards carveBsp's rooms
// list once the zone is built, so there's no way to place a stairs anchor
// in a specific room (e.g. the one farthest from entry) through the stock
// generator alone. Calling carveBsp directly (exported from
// @glyphrogue/core for exactly this kind of custom-generator authoring,
// per index.js's own comment) keeps the rooms list around long enough to
// do that.
//
// runConnectivityPass/ensureTraversable aren't part of @glyphrogue/core's
// public export list (flagged in BACKLOG.md's cross-project section, not
// fixed this session - not needed here since carveBsp's connect-on-merge
// approach already guarantees every room is connected to every other,
// independent of any later connectivity pass, for a pure BSP floor with no
// stamps). Revisit once Phase 5 adds stamped event rooms, which do need it.
import { createZone, carveBsp } from '@glyphrogue/core';
import { ENEMY_ARCHETYPES, DUKE_GLYPHMUND_TYPE } from '../plugins/enemy-plugin/index.js';

export const FLOOR_WIDTH = 40;
export const FLOOR_HEIGHT = 30;
export const FLOOR_COUNT = 10;

function farthestRoom(rooms, from) {
  return rooms.reduce((best, room) => {
    const distance = Math.abs(room.center.x - from.x) + Math.abs(room.center.y - from.y);
    return !best || distance > best.distance ? { room, distance } : best;
  }, undefined).room;
}

// Undead-skewing distribution (DESIGN.md's bestiary section) falls out of
// each archetype's own minFloor/maxFloor range rather than a separate
// weight column - undead archetypes simply aren't eligible until floor 4+,
// which is the actual skew. Uniform pick among whatever's eligible at a
// given depth; revisit with real per-archetype weights only if playtesting
// shows the skew needs to be stronger than range-gating alone provides.
function eligibleArchetypes(depth) {
  return Object.entries(ENEMY_ARCHETYPES).filter(
    ([, archetype]) => depth >= archetype.minFloor && depth <= archetype.maxFloor,
  );
}

function pickEnemyType(rng, depth) {
  const eligible = eligibleArchetypes(depth);
  const [type] = eligible[Math.floor(rng.next() * eligible.length)];
  return type;
}

export function floorGeneratorFn(ctx) {
  const { width, height, minPartitionSize, roomMargin, depth = 1 } = ctx.params ?? {};
  const zone = createZone(width, height);
  const { rooms, entryPoint } = carveBsp(zone, ctx.rng, { minPartitionSize, roomMargin });

  zone.anchors.push({ id: 'entry', x: entryPoint.x, y: entryPoint.y });

  // Floor FLOOR_COUNT's farthest room is Duke Glyphmund's throne, not a
  // stairs anchor - there's nowhere further to descend to, reaching him is
  // reaching the end (floor.js's win detection watches for his defeat, not
  // for the player standing on any particular tile).
  const farRoom = farthestRoom(rooms, entryPoint);
  const isBossFloor = depth === FLOOR_COUNT;
  if (isBossFloor) {
    zone.anchors.push({ id: 'boss', x: farRoom.center.x, y: farRoom.center.y });
    zone.entities.push({ type: DUKE_GLYPHMUND_TYPE, x: farRoom.center.x, y: farRoom.center.y });
  } else {
    zone.anchors.push({ id: 'stairs', x: farRoom.center.x, y: farRoom.center.y });
    zone.entities.push({ type: 'stairs', x: farRoom.center.x, y: farRoom.center.y });
  }

  // One enemy per remaining room (every room except the ones already
  // claimed by the entry and the stairs/boss room), picked per-depth so the
  // bestiary actually varies floor to floor.
  for (const room of rooms) {
    if (room === farRoom || room.center === entryPoint) continue;
    const type = pickEnemyType(ctx.rng, depth);
    zone.entities.push({ type, x: room.center.x, y: room.center.y });
  }

  return zone;
}
