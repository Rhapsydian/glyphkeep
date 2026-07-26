// This game's plugin bootstrap - hand-authored, not a tool-owned file
// (docs/design/editor.md's Plugin management). Both the shipped game
// (src/main.js) and the dev harness (src/dev-main.js) call
// registerPlugins() so there's one list, not two to keep in sync. The
// editor's Plugin management tool also reads this file's source text
// directly (see vite.config.js's bootstrapPath) to show which plugins are
// enabled - add/remove plugins here by hand, or via that tool.
import { loadPlugins } from '@glyphrogue/core';
import starterPlugin from './src/plugins/starter-plugin/index.js';

export function registerPlugins(api) {
  loadPlugins(api, [starterPlugin]);
}
