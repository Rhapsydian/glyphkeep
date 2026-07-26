import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { defineConfig } from 'vite';
import { createFileWriteApi } from '@glyphrogue/editor/devServerPlugin';

const projectRoot = dirname(fileURLToPath(import.meta.url));

// Two-entry dev/prod split (docs/design/build-pipeline.md): index.html
// (the shipped game, imports only @glyphrogue/core) is the only entry a
// production build picks up (Vite's default single-entry behavior, since
// dev.html is never added to build.rollupOptions.input) - dev.html
// (imports @glyphrogue/core *and* @glyphrogue/editor) only gets served by
// the dev server, via `npm run dev`'s --open flag below. base follows the
// same per-mode switch pixelyph established: root '/' for GitHub Pages,
// relative './' for itch.io (`vite build --mode itch`).
export default defineConfig(({ mode }) => ({
  base: mode === 'itch' ? './' : '/',
  plugins: [
    // Powers the map editor / composition tool / plugin management /
    // config UI's file-write API when running against this project's real
    // files. bootstrapPath points plugin management's discovery at this
    // project's own hand-authored bootstrap.js.
    createFileWriteApi({ projectRoot, bootstrapPath: 'bootstrap.js' }),
  ],
}));
