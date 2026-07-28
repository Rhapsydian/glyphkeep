# glyphkeep

A haunted-dungeon-crawl roguelite built on the [glyphrogue](https://github.com/Rhapsydian/glyphrogue)
engine — its first real downstream game, scaffolded via
`create-glyphrogue-game`.

Descend a ruined keep haunted by the ghosts of the family that once ruled
it. Full design: [`DESIGN.md`](DESIGN.md).

**Play now**: <https://rhapsydian.github.io/glyphkeep/>

## Status

Phase 1 ("scaffold + core loop") and Phase 2 ("full bestiary + boss") are
both complete. Floors 1-10 generate for real (BSP), the player moves and
fights with real keyboard input, and the bestiary is fully populated with
undead-skewing depth-gated distribution: rat, goblin, bandit, mouse,
skeleton, and wraith (one per first-party AI behavior, `Defense` doubling
as evasion), plus three combo enemies (slime, bandit lookout, ghost)
combining two behaviors each via priority-tuned `dispatchExclusive`.
Reaching floor 10 places Duke Glyphmund, a real final boss (`Guards`
movement plus a bespoke enrage phase past half health) — defeating him
wins the run; dying shows a placeholder death screen either way. Next up:
Phase 3 (equipment & inventory) — see [`BACKLOG.md`](BACKLOG.md) for the
full sequencing and the phased build plan.

## Getting started

```bash
npm install
npm run dev
```

Opens `dev.html`: the game view alongside the Glyphrogue editor (map
editor, content browser, plugin management, and more) for authoring live.
`npm run build` produces a production build (`index.html` only — the
editor never ships).

**Local dev against `glyphrogue`**: while `glyphrogue`'s packages haven't
had a version bump to publish since this project started depending on new
work in them, `package.json`'s `@glyphrogue/*` dependencies point at the
local checkout via `file:../glyphrogue/packages/*` rather than a published
semver range — see `.claude/dev-session.md` for the full convention. Swap
back to real semver ranges at the next natural publish checkpoint.

## Project layout

- `src/maps/templates/` — hand-placed static rooms and generator-composed
  templates. `starter-room.json` is the scaffold's original fixture, kept
  as a reference example (no longer part of the live boot path since
  checkpoint 3 — floors 1-10 are real per-run BSP generation now).
- `src/generators/` — glyphkeep-authored `registerGenerator`-shaped
  functions (`floorGenerator.js`'s BSP-plus-stairs floor generator).
- `src/plugins/<pluginId>/` — one folder per plugin (entity types, rules,
  generators). `bootstrap.js` at the project root lists which plugins are
  active.
- `src/game.js` — the live camera/FOV/render loop tying ECS world state to
  the drawn canvas.
- `src/rules.js` — glyphkeep-authored action rules: `Move` (bump-to-attack
  resolution), `Attack` (accuracy/damage rolls), `Die`. No first-party
  rule for any of these exists in `glyphrogue`.
- `src/floor.js` — floor-sequencing state (current floor, descent) —
  `glyphrogue` has no "current zone" concept, so this is entirely
  game-owned.
- `src/input.js` — keyboard-to-movement wiring via `@glyphrogue/input`.
- `src/screens.js` — placeholder win/death overlays.
- `assets/fonts/` — font sources for the game's glyph tileset.

## Deploy

- **GitHub Pages**: live at <https://rhapsydian.github.io/glyphkeep/>.
  `.github/workflows/deploy-pages.yml` deploys `npm run build`'s output on
  every push to `main`. Builds `@glyphrogue/editor` from a sibling
  checkout first (an interim workaround for the `file:`-reference local
  dev convention below — CI has no pre-built `dist/` to fall back on the
  way a published npm package would). `vite.config.js`'s `base` is
  `/glyphkeep/`, matching this repo's actual Pages subpath — renaming the
  repo means updating this too.
- **itch.io**: build with the itch-specific relative base path, then push
  with [butler](https://itch.io/docs/butler/):

```bash
npm run build:itch
butler push dist rhapsydian/glyphkeep:html5
```

Requires `butler` installed and authenticated (`butler login`).

## Project conventions

Mirrors `glyphrogue`'s own documentation conventions at a scale
appropriate for a game rather than an engine: `docs/session-logs/` for a
log per work session, `BACKLOG.md` for the phased roadmap and NEXT SESSION
pointer, `.claude/dev-session.md` for the project-specific process
override governing how `glyphrogue` engine issues found along the way get
handled.
