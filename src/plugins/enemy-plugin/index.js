import { CORE_API_VERSION, fleesRule, FLEES_PRIORITY } from '@glyphrogue/core';

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
// minFloor/maxFloor feed floorGenerator.js's weighted depth-based
// distribution.
//
// Two combo archetypes (bandit lookout, ghost) are pure compositions of
// two stock marker components each - no custom rule needed, since
// dispatchExclusive's priority resolution already gives the right emergent
// behavior for free (e.g. ghost: Wanders while the player's out of sight,
// ChasesPlayer once spotted, since chasesPlayerRule no-ops - falling
// through to the lower-priority wandersRule - whenever the player isn't
// visible).
//
// Slime is the one combo that needs real custom content: "aggressive until
// hurt, then flees" needs Flees to be health-gated, but the stock
// fleesPlugin (loaded globally in bootstrap.js) matches ANY entity with a
// bare `Flees` component, unconditionally - giving slime a real `Flees`
// component would make that stock rule ALSO match and win priority ties
// (it's loaded before enemyPlugin), completely defeating the gating. So
// slime instead carries a glyphkeep-only `FleesWhenHurt` marker (never
// registered anywhere as a component the stock plugin's `all: ['Flees']`
// filter can see) and register() below wires a slime-only rule reusing the
// real, exported `fleesRule` with a tightened filter (marker present AND
// health at/below half). fleesRule's own body reads radius from a `Flees`
// component that slime never has, which is fine - it defaults to 8 the
// same way every other Flees-behavior entity does unless it overrides it.
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
  slime: {
    health: 12, attack: 4, defense: 1,
    components: { ChasesPlayer: {}, FleesWhenHurt: {} },
    char: 's', color: '#30c080',
    minFloor: 2, maxFloor: 7,
  },
  'bandit-lookout': {
    health: 12, attack: 4, defense: 2,
    components: { Guards: {}, ChasesPlayer: {} },
    char: 'B', color: '#e0a030',
    minFloor: 3, maxFloor: 7,
  },
  ghost: {
    health: 10, attack: 5, defense: 1,
    components: { Wanders: {}, ChasesPlayer: {} },
    char: 'G', color: '#a0e0ff',
    minFloor: 4, maxFloor: 8,
  },
};

export const DUKE_GLYPHMUND_TYPE = 'duke-glyphmund';

// Deterministic, hand-placed encounters - never picked by floorGenerator.js's
// random bestiary distribution (pickEnemyType only ever reads
// ENEMY_ARCHETYPES, never this table), so no minFloor/maxFloor here. Duke
// Glyphmund's movement is the stock Guards plugin, same as every other
// Guards-marked enemy - only his Attack resolution is bespoke (rules.js's
// enrage bump, gated by the Boss marker below), per DESIGN.md's "base AI is
// Guards-style... with a bespoke rule layered on top," deliberately not a
// reskin of the standalone Guards enemy.
export const BOSS_ARCHETYPES = {
  [DUKE_GLYPHMUND_TYPE]: {
    health: 40, attack: 8, defense: 4,
    components: { Guards: {}, Boss: {} },
    char: 'D', color: '#a020a0',
  },
};

// Every entity type this plugin defines, regardless of how it's placed -
// what floor.js's actor/floor-owned bookkeeping and game.js's
// symbol/palette table actually need; neither cares about the
// bestiary/boss distinction, just "every type that needs a Position/turn/
// render entry."
export const ALL_ARCHETYPES = { ...ENEMY_ARCHETYPES, ...BOSS_ARCHETYPES };

export default {
  id: 'enemy-plugin',
  version: '1.0.0',
  dependencies: { core: `^${CORE_API_VERSION}` },
  register: (api) => {
    for (const [type, archetype] of Object.entries(ALL_ARCHETYPES)) {
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

    // Slime's "aggressive until hurt, then flees" - see the table comment
    // above for why this can't just be the stock fleesPlugin.
    const slimeFleeThreshold = Math.ceil(ENEMY_ARCHETYPES.slime.health / 2);
    api.registerRule('slime-flees', 'TakeTurn', fleesRule, {
      priority: FLEES_PRIORITY,
      components: {
        all: ['FleesWhenHurt', { component: 'Health', lte: { current: slimeFleeThreshold } }],
      },
    });
  },
};
