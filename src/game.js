// Live ECS-driven render loop (glyphkeep Phase 1, checkpoint 1) replacing
// the scaffold's original static-template renderZone. Terrain (zone.cells)
// is never part of the ECS - core owns no grid/zone storage
// (mapgen-and-editor.md) - so isWalkable/isOpaque/cellQuery all read
// directly from whichever zone is currently active, while entities (player,
// torches, later enemies) come from real api.query() calls each render.
import {
  createTileset,
  registerSymbol,
  resolveSymbol,
  createPalette,
  createGlyphMetrics,
  cellSize,
  paintLayer,
  has,
  createCamera,
  updateCamera,
  computeFov,
  fovContains,
  classifyVisibility,
  updateRemembered,
  MEMORY_TONE,
  terrainDrawCommands,
  entityDrawCommands,
  createAnimationState,
} from '@glyphrogue/core';
import { createStarterFontSources, STARTER_FONT_ID, STARTER_FONT_CSS_FAMILY } from '../assets/fonts/starter-font.js';

const ENTITY_SYMBOL = 'entity';
const PLAYER_SYMBOL = 'player';
const SIGHT_RADIUS = 8;
const VIEWPORT_WIDTH = 15;
const VIEWPORT_HEIGHT = 11;

export function cellAt(zone, x, y) {
  if (x < 0 || y < 0 || x >= zone.width || y >= zone.height) return undefined;
  return zone.cells[y * zone.width + x];
}

export function isWalkableInZone(zone, x, y) {
  return cellAt(zone, x, y) === 'floor';
}

export function isOpaqueInZone(zone, x, y) {
  const cell = cellAt(zone, x, y);
  return cell === undefined || cell === 'wall';
}

// Pure FOV/memory classification for one terrain cell - split out from
// createRenderer's canvas-bound closure so it's unit-testable without a
// DOM/canvas (glyphRenderer.js is the only module allowed to touch a real
// ctx, per its own header comment; everything upstream of it stays plain
// data). Returns null for a cell that shouldn't be drawn at all (never seen,
// or off the edge of the zone).
export function classifyTerrainCell(zone, fov, remembered, x, y) {
  const classification = classifyVisibility(fov, remembered, x, y);
  if (classification === 'unknown') return null;

  const cellType = cellAt(zone, x, y);
  if (cellType === undefined) return null;

  return { classification, cellType };
}

function buildTileset() {
  const tileset = createTileset();
  registerSymbol(tileset, 'wall', { fontFace: STARTER_FONT_ID, codepoint: '20', background: { token: 'wall' } });
  registerSymbol(tileset, 'floor', { fontFace: STARTER_FONT_ID, codepoint: '20', background: { token: 'floor' } });
  registerSymbol(tileset, ENTITY_SYMBOL, { fontFace: STARTER_FONT_ID, codepoint: '40', foreground: { token: 'entity' } });
  registerSymbol(tileset, PLAYER_SYMBOL, { fontFace: STARTER_FONT_ID, codepoint: '40', foreground: { token: 'player' } });
  return tileset;
}

export function buildPalette() {
  return createPalette({
    wall: '#555555',
    floor: '#222222',
    entity: '#e0a030',
    player: '#e0e0e0',
    remembered: '#333333',
  });
}

// zone.entities/zone.anchors are inert blueprint data (docs/data-model.md),
// not live entities, until something actually instantiates them - this is
// that step, called once whenever a zone (the starter room today, a
// generated floor from checkpoint 3 on) is entered fresh.
export function instantiateZoneContent(api, zone) {
  for (const entity of zone.entities) {
    api.instantiateEntity(entity.type, { Position: { x: entity.x, y: entity.y } });
  }

  const playerStart = zone.anchors.find((anchor) => anchor.id === 'player-start');
  const player = api.createEntity();
  api.addComponent(player, 'Position', { x: playerStart.x, y: playerStart.y });
  api.addComponent(player, 'PlayerControlled', {});
  return player;
}

function buildEntityCommands(api, tileset, fontSources, metrics, fov) {
  const entities = [];

  for (const entity of api.query(['Position', 'PlayerControlled'])) {
    const position = api.getComponent(entity, 'Position');
    entities.push({ entity, position, ...resolveSymbol(tileset, fontSources, metrics, PLAYER_SYMBOL) });
  }

  for (const entity of api.query(['Position', 'EntityType'])) {
    const position = api.getComponent(entity, 'Position');
    if (!fovContains(fov, position.x, position.y)) continue;
    entities.push({ entity, position, ...resolveSymbol(tileset, fontSources, metrics, ENTITY_SYMBOL) });
  }

  return entities;
}

// Owns the render-only state that persists across turns (camera position,
// which cells have ever been seen) - rendering.md's "derived/read-only over
// core's inspection API" boundary, none of this is core simulation state.
export function createRenderer(container) {
  const tileset = buildTileset();
  const fontSources = createStarterFontSources();
  const palette = buildPalette();
  const metrics = createGlyphMetrics({ pixelsPerEm: 24 });
  const size = cellSize(metrics);
  const animationState = createAnimationState();

  const canvas = document.createElement('canvas');
  canvas.width = VIEWPORT_WIDTH * size.width;
  canvas.height = VIEWPORT_HEIGHT * size.height;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let camera = createCamera({ viewportWidth: VIEWPORT_WIDTH, viewportHeight: VIEWPORT_HEIGHT });
  let remembered = new Set();

  return {
    // Reset on entering a fresh zone (checkpoint 3's floor transitions) -
    // a new floor's memory/camera framing shouldn't carry over from the last.
    resetZone() {
      remembered = new Set();
    },
    render(api, player, zone) {
      const position = api.getComponent(player, 'Position');
      camera = updateCamera(camera, position, { deadzone: 3, mapWidth: zone.width, mapHeight: zone.height });

      const fov = computeFov(position, SIGHT_RADIUS, { isOpaque: (x, y) => isOpaqueInZone(zone, x, y) });
      remembered = updateRemembered(remembered, fov);

      const terrainCommands = terrainDrawCommands(camera, (x, y) => {
        const classified = classifyTerrainCell(zone, fov, remembered, x, y);
        if (!classified) return null;

        const { classification, cellType } = classified;
        const symbol = has(tileset, cellType) ? cellType : 'wall';
        const resolved = resolveSymbol(tileset, fontSources, metrics, symbol);
        if (classification === 'remembered') {
          return { ...resolved, color: MEMORY_TONE, background: MEMORY_TONE };
        }
        return resolved;
      });

      const entityCommands = entityDrawCommands(
        camera,
        buildEntityCommands(api, tileset, fontSources, metrics, fov),
        animationState,
        performance.now(),
      );

      paintLayer(ctx, metrics, size, STARTER_FONT_CSS_FAMILY, [...terrainCommands, ...entityCommands], {
        clear: true,
        viewportPixelWidth: canvas.width,
        viewportPixelHeight: canvas.height,
        palette,
      });
    },
  };
}
