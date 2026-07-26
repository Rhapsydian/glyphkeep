import { CORE_API_VERSION } from '@glyphrogue/core';

// Starter content: the simplest correct path through the entity-type/
// plugin system (one registered entity type, no custom behavior/rules) -
// per create-glyphrogue-game's "runs with zero required edits, nothing in
// it should require reading a design doc to modify" bar. Position is
// declared here (even though every instance gets a per-placement override)
// because instantiateEntity only applies an override for a component the
// definition itself already declares.
export default {
  id: 'starter-plugin',
  version: '1.0.0',
  dependencies: { core: `^${CORE_API_VERSION}` },
  register: (api) => {
    api.registerEntityType('torch', {
      components: {
        Position: {},
        Description: { text: 'A flickering torch.' },
      },
    });
  },
};
