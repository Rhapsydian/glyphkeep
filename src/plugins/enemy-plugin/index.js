import { CORE_API_VERSION } from '@glyphrogue/core';

// DESIGN.md's bestiary (Phase 2 roster, resolved live with the user -
// BACKLOG.md's NEXT SESSION pointer). Each archetype pairs one of
// glyphrogue's first-party TakeTurn behaviors (Wanders/ChasesPlayer/Flees/
// Guards, all loaded as plugins in bootstrap.js) with real combat stats and
// a render symbol. Data-driven table replacing Phase 1's single hardcoded
// registerEntityType call, so floorGenerator.js/floor.js can derive their
// own type lists from Object.keys(ENEMY_ARCHETYPES) instead of maintaining
// a second, easily-out-of-sync list by hand.
//
// Wraith's Defense is deliberately extreme, not a typo - rules.js's
// defense-reduces-hit-chance formula is what makes it "hard to hit," not a
// new evasion stat.
//
// Guards.post isn't set here - a components map is static per-archetype
// data, it has no notion of a specific instance's spawn position. floor.js
// seeds it at instantiation time instead, generically for any entity
// carrying a Guards component.
//
// minFloor/maxFloor aren't consumed yet (checkpoint 1 spawns a flat
// round-robin across all archetypes) - checkpoint 2's weighted
// depth-based distribution reads them directly from this same table.
export const ENEMY_ARCHETYPES = {
  // Cosmetically "rat" - id kept as the Phase 1 name to avoid a needless
  // rename across floorGenerator.js/floor.js/tests.
  wanderer: {
    health: 6, attack: 2, defense: 0,
    components: { Wanders: {} },
    char: 'r', color: '#8a6d3b',
    minFloor: 1, maxFloor: 3,
  },
  goblin: {
    health: 10, attack: 4, defense: 1,
    components: { ChasesPlayer: {} },
    char: 'g', color: '#4caf50',
    minFloor: 1, maxFloor: 6,
  },
  bandit: {
    health: 12, attack: 4, defense: 3,
    components: { Guards: {} },
    char: 'b', color: '#c08040',
    minFloor: 2, maxFloor: 6,
  },
  mouse: {
    health: 3, attack: 1, defense: 0,
    components: { Flees: {} },
    char: 'm', color: '#a89078',
    minFloor: 1, maxFloor: 4,
  },
  skeleton: {
    health: 16, attack: 6, defense: 2,
    components: { ChasesPlayer: {} },
    char: 'S', color: '#d8d8c0',
    minFloor: 5, maxFloor: 10,
  },
  wraith: {
    health: 8, attack: 3, defense: 10,
    components: { Wanders: {} },
    char: 'w', color: '#8090c0',
    minFloor: 5, maxFloor: 10,
  },
};

export default {
  id: 'enemy-plugin',
  version: '1.0.0',
  dependencies: { core: `^${CORE_API_VERSION}` },
  register: (api) => {
    for (const [type, archetype] of Object.entries(ENEMY_ARCHETYPES)) {
      api.registerEntityType(type, {
        components: {
          Position: {},
          Health: { current: archetype.health, max: archetype.health },
          Attack: { value: archetype.attack },
          Defense: { value: archetype.defense },
          ...archetype.components,
        },
      });
    }
  },
};
