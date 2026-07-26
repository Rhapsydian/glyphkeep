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

export const FLOOR_WIDTH = 40;
export const FLOOR_HEIGHT = 30;
export const FLOOR_COUNT = 10;

function farthestRoom(rooms, from) {
  return rooms.reduce((best, room) => {
    const distance = Math.abs(room.center.x - from.x) + Math.abs(room.center.y - from.y);
    return !best || distance > best.distance ? { room, distance } : best;
  }, undefined).room;
}

export function floorGeneratorFn(ctx) {
  const { width, height, minPartitionSize, roomMargin } = ctx.params ?? {};
  const zone = createZone(width, height);
  const { rooms, entryPoint } = carveBsp(zone, ctx.rng, { minPartitionSize, roomMargin });

  zone.anchors.push({ id: 'entry', x: entryPoint.x, y: entryPoint.y });

  const stairsRoom = farthestRoom(rooms, entryPoint);
  zone.anchors.push({ id: 'stairs', x: stairsRoom.center.x, y: stairsRoom.center.y });
  zone.entities.push({ type: 'stairs', x: stairsRoom.center.x, y: stairsRoom.center.y });

  return zone;
}
