import { CORE_API_VERSION } from '@glyphrogue/core';
import { floorGeneratorFn, FLOOR_WIDTH, FLOOR_HEIGHT } from '../../generators/floorGenerator.js';

export default {
  id: 'floor-plugin',
  version: '1.0.0',
  dependencies: { core: `^${CORE_API_VERSION}` },
  register: (api) => {
    api.registerEntityType('stairs', {
      components: {
        Position: {},
        Description: { text: 'A stairway down.' },
      },
    });

    api.registerGenerator('glyphkeep-floor', floorGeneratorFn, {
      paramsDefaults: { width: FLOOR_WIDTH, height: FLOOR_HEIGHT },
    });
  },
};
