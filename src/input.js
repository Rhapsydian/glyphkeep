// Real keyboard input -> game actions (checkpoint 2). @glyphrogue/input
// ships no default keybindings or input-action vocabulary - both are
// game-defined (ui-and-input.md) - and has zero existing gameplay
// consumers anywhere in glyphrogue, so this is genuinely new integration
// work, not something the scaffold or engine gave a head start on.
import { createKeymap, createCaptureStack, createInputPipeline, createKeyboardSource } from '@glyphrogue/input';
import { MOVE_COST } from './rules.js';

const MOVE_DIRECTIONS = {
  'move-north': { dx: 0, dy: -1 },
  'move-south': { dx: 0, dy: 1 },
  'move-east': { dx: 1, dy: 0 },
  'move-west': { dx: -1, dy: 0 },
};

export function createGameKeymap() {
  return createKeymap({
    'move-north': [{ device: 'key', code: 'ArrowUp' }, { device: 'key', code: 'KeyW' }],
    'move-south': [{ device: 'key', code: 'ArrowDown' }, { device: 'key', code: 'KeyS' }],
    'move-east': [{ device: 'key', code: 'ArrowRight' }, { device: 'key', code: 'KeyD' }],
    'move-west': [{ device: 'key', code: 'ArrowLeft' }, { device: 'key', code: 'KeyA' }],
  });
}

// No screens exist yet to push onto the capture stack (Phase 1 has no
// pause/inventory/menu screens) - kept wired now so a later phase's screen
// just pushes an id, rather than input.js growing a capture concept then.
export function wireKeyboardInput({ target, api, player, onMove }) {
  const captureStack = createCaptureStack();

  const pipeline = createInputPipeline({
    captureStack,
    onCaptured: () => {},
    onFallthrough: ({ action, phase }) => {
      if (phase !== 'press') return;
      const direction = MOVE_DIRECTIONS[action];
      if (!direction) return;

      const position = api.getComponent(player, 'Position');
      const to = { x: position.x + direction.dx, y: position.y + direction.dy };

      api.resolvePlayerAction(player, { type: 'Move', entity: player, to, cost: MOVE_COST });
      api.run();
      onMove();
    },
  });

  return createKeyboardSource({ target, keymap: createGameKeymap(), dispatch: pipeline.handleInputAction });
}
