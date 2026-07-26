import { CORE_API_VERSION } from '@glyphrogue/core';

// DESIGN.md's bestiary: "Wanders - a weak, aimless wanderer." Phase 1's
// only enemy (the other three solo behaviors are Phase 2). Stats are
// placeholder balance numbers - no equipment/tuning system exists yet.
// The Wanders behavior itself comes from glyphrogue's own wandersPlugin
// (bootstrap.js loads it alongside this plugin) - this just defines the
// entity type that carries the marker component plus real combat stats.
export const WANDERER_HEALTH = 6;
export const WANDERER_ATTACK = 2;
export const WANDERER_DEFENSE = 0;

export default {
  id: 'enemy-plugin',
  version: '1.0.0',
  dependencies: { core: `^${CORE_API_VERSION}` },
  register: (api) => {
    api.registerEntityType('wanderer', {
      components: {
        Position: {},
        Health: { current: WANDERER_HEALTH, max: WANDERER_HEALTH },
        Attack: { value: WANDERER_ATTACK },
        Defense: { value: WANDERER_DEFENSE },
        Wanders: {},
      },
    });
  },
};
