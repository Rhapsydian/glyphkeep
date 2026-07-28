// Floor-sequencing (checkpoint 3): entirely glyphkeep's own state, per the
// kickoff finding that glyphrogue has no "current zone" concept anywhere -
// a Zone is just a DTO api.generateZone(...) returns, so holding "which
// floor we're on" and swapping zones on descent is ordinary game-level
// state, not something the engine needs to provide.
import { FLOOR_COUNT } from './generators/floorGenerator.js';
import { ENEMY_ARCHETYPES } from './plugins/enemy-plugin/index.js';

function findAnchor(zone, id) {
  return zone.anchors.find((anchor) => anchor.id === id);
}

// Every enemy archetype needs a scheduler turn, not just a Position on the
// map. Derived from ENEMY_ARCHETYPES rather than hand-listed so a new
// archetype (checkpoint 2's combo enemies, checkpoint 3's boss) doesn't
// need this file touched again to be scheduled correctly.
const ACTOR_ENTITY_TYPES = new Set(Object.keys(ENEMY_ARCHETYPES));

// Entity types a generated floor itself owns (stairs, enemies) - never the
// player. Destroying by this tag rather than a locally-tracked id list is
// what makes generateCurrentFloor self-healing against dev-main.js's HMR
// restore path, where floor.js's own JS-closure state doesn't survive the
// reload but the restored ECS world's entities do (see dev-main.js's own
// note on this).
const FLOOR_OWNED_ENTITY_TYPES = new Set(['stairs', ...ACTOR_ENTITY_TYPES]);

export function createFloorState(api) {
  let currentFloor = 1;
  let zone;

  function clearFloorOwnedEntities() {
    for (const entity of api.query(['EntityType'])) {
      const { type } = api.getComponent(entity, 'EntityType');
      if (!FLOOR_OWNED_ENTITY_TYPES.has(type)) continue;
      // destroyEntity only touches world state, never scheduler.actors - an
      // actor destroyed without removeActor first leaves a ghost entry that
      // next() keeps selecting forever, wasting a turn slot with no entity
      // behind it to ever unlock the scheduler again.
      api.removeActor(entity);
      api.destroyEntity(entity);
    }
  }

  function generateCurrentFloor() {
    clearFloorOwnedEntities();

    zone = api.generateZone({
      generatorId: 'glyphkeep-floor',
      zoneId: `floor-${currentFloor}`,
      params: { depth: currentFloor },
    });
    for (const blueprint of zone.entities) {
      const entity = api.instantiateEntity(blueprint.type, { Position: { x: blueprint.x, y: blueprint.y } });
      if (ACTOR_ENTITY_TYPES.has(blueprint.type)) api.addActor(entity, 0);
      // Guards needs a fixed post to return to - a registerEntityType
      // components map is static per-archetype data with no notion of
      // where this particular instance actually spawned, so it's seeded
      // here instead, generically for any entity carrying a Guards
      // component (bandit today; bandit lookout and Duke Glyphmund later).
      if (api.hasComponent(entity, 'Guards')) {
        api.addComponent(entity, 'Guards', { post: { x: blueprint.x, y: blueprint.y } });
      }
    }
  }

  generateCurrentFloor();

  function placePlayerAtEntry(player) {
    const entry = findAnchor(zone, 'entry');
    api.addComponent(player, 'Position', { x: entry.x, y: entry.y });
  }

  return {
    getZone: () => zone,
    getCurrentFloor: () => currentFloor,
    placePlayerAtEntry,

    // Call after every resolved player move. Returns 'won' once the player
    // reaches floor FLOOR_COUNT's stairs, 'descended' after generating and
    // moving onto the next floor, or null if the player isn't on the
    // stairs cell at all.
    checkForDescent(player) {
      const position = api.getComponent(player, 'Position');
      const stairs = findAnchor(zone, 'stairs');
      if (position.x !== stairs.x || position.y !== stairs.y) return null;

      if (currentFloor === FLOOR_COUNT) return 'won';

      currentFloor += 1;
      generateCurrentFloor();
      placePlayerAtEntry(player);
      return 'descended';
    },
  };
}
