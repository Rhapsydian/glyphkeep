import { createFontSourceRegistry, registerFontSource } from '@glyphrogue/core';

// The scaffold's starter font source: CSS-generic monospace, needing no
// bundled binary. unitsPerEm/ascender/descender are standard values for a
// typical monospace face - fontSources.js's default calibration is
// metrics-based, so this is a real, already-calibrated font source, not a
// placeholder. Glyphs are addressed by ASCII codepoint (hex): '20' (space)
// for a blank/background-only tile, '40' ('@') for an entity glyph. Swap in
// a real font file + manifest (e.g. via the tileset/font-calibration
// editor) whenever the game needs custom glyphs.
export const STARTER_FONT_ID = 'base';
export const STARTER_FONT_CSS_FAMILY = 'monospace';

export function createStarterFontSources() {
  const fontSources = createFontSourceRegistry();
  registerFontSource(fontSources, STARTER_FONT_ID, {
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: {},
  });
  return fontSources;
}
