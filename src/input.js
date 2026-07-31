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
    'open-inventory': [{ device: 'key', code: 'KeyI' }],
  });
}

// Phase 3 checkpoint 3: the capture stack (previously wired but unused,
// per the old version of this comment) now has a real consumer -
// inventoryScreen.js pushes/pops it directly around openScreen/closeScreen,
// which never touch the capture stack themselves (it's @glyphrogue/input-
// owned, entirely separate from core's PendingUI lock/unlock). Returned
// alongside stop() so a screen opened from outside this module can share
// the exact instance every keypress is gated through.
export function wireKeyboardInput({ target, api, player, onMove, onOpenInventory }) {
  const captureStack = createCaptureStack();

  const pipeline = createInputPipeline({
    captureStack,
    onCaptured: () => {},
    onFallthrough: ({ action, phase }) => {
      if (phase !== 'press') return;

      if (action === 'open-inventory') {
        onOpenInventory?.();
        return;
      }

      const direction = MOVE_DIRECTIONS[action];
      if (!direction) return;

      const position = api.getComponent(player, 'Position');
      const to = { x: position.x + direction.dx, y: position.y + direction.dy };

      api.resolvePlayerAction(player, { type: 'Move', entity: player, to, cost: MOVE_COST });
      api.run();
      onMove();
    },
  });

  const keyboardSource = createKeyboardSource({ target, keymap: createGameKeymap(), dispatch: pipeline.handleInputAction });
  return { stop: keyboardSource.stop, captureStack };
}
