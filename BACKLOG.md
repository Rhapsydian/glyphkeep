# glyphkeep backlog

## NEXT SESSION

`DESIGN.md` is complete (session 1, a `/decision-session`, 2026-07-26).
No implementation has started. **Next session is `/dev-session
C:\Users\husbando\Claude\glyphkeep`, Phase 1: scaffold + core loop** —
`npm create glyphrogue-game`, real input/camera/FOV wired to actual world
state (replacing the scaffold's static demo), BSP-only floor generation
for floors 1-10, one enemy (`Wanders`) to prove combat works, permadeath
to a placeholder menu, reaching floor 10 as a trivial win. See
`DESIGN.md`'s "Implementation phasing" section for the full 9-phase plan
this fits into — kickoff research should verify every `glyphrogue`
primitive `DESIGN.md` names against real current code before building
against it, since most of this spec was written before any glyphkeep code
existed.

The GitHub remote ([Rhapsydian/glyphkeep](https://github.com/Rhapsydian/glyphkeep))
exists, is pushed, and has Pages source set to GitHub Actions — the
deploy pipeline is wired and will activate automatically once Phase 1
adds the scaffold's `deploy-pages.yml` workflow and pushes.

## Implementation phasing

Dependency-ordered, from `DESIGN.md`'s "Implementation phasing" section.
Check items off here as they land, same convention `glyphrogue` itself
uses.

1. **Scaffold + core loop** — in progress (checkpoint 1 of 4: scaffold
   merge + live camera/FOV render loop, landed).
2. **Full bestiary + boss** — not started.
3. **Equipment & inventory** — not started.
4. **Meta-progression & persistence** — not started. *(Core game complete
   at the end of this phase.)*
5. **Event rooms & family NPCs** — not started.
6. **Meta screens & scripted events** — not started.
7. **Audio & gamepad** — not started.
8. **Polish & deploy** — not started.
9. **New Game+ & difficulty scaling** — not started.

## Deferred / future items

- **Ranged/thrown weapons** — `DESIGN.md`'s combat section scopes melee-
  only through phases 1-2; ranged as a later equipment-type addition
  (phase 5+) rather than building a targeting UI into the critical path.
  Revisit once the core combat loop is proven out.
- **Variable turn speed** — `DESIGN.md` decided uniform one-action-per-turn
  for the core phases; the scheduler's energy-budget model could back a
  genuinely fast/slow enemy archetype later if one becomes interesting to
  design around.
- **Exact New Game+ scaling mechanics** — `DESIGN.md` confirms NG+ is in
  scope (phase 9) but leaves the actual scaling formula (harder stats?
  denser hazards? both?) open until there's a full bestiary/hazard system
  to scale against.
- **Exact artifact-completion bonuses** — each artifact grants "a
  permanent meta-progression bonus" per `DESIGN.md`; the specific bonus
  per artifact is undecided until the artifacts themselves are named.
- **The win-item's actual name** — currently "Duke Glyphmund's signet or
  similar family-tied artifact," not finalized.
- **Player-facing mod support** — would need new `glyphrogue` engine work
  (a persisted enabled-mods settings slice read at boot), not just
  glyphkeep content. Explicitly kept on `glyphrogue/BACKLOG.md`'s own
  deferred list; not pulled into this project.

## Cross-project issues found in `glyphrogue`

- **`save.js`'s `deserialize` never forwards `isWalkable`/`isOpaque` to
  `createApi`** (found session 1 of implementation, Phase 1 checkpoint 1
  kickoff). `serialize`/`deserialize` round-trip `seed`/`platform` through
  to `createApi({ seed, platform })`, but not the map-query closures —
  meaning any restored `api` (the dev harness's HMR snapshot restore in
  `dev-main.js`, and later the real save/load system in Phase 4) loses
  `api.findPath`/`api.computeFov` entirely (`isWalkable`/`isOpaque`
  `undefined`). Small, unambiguous, blocks this session's own dev workflow
  immediately (every Vite HMR cycle in `dev.html` round-trips through
  `deserialize`) — fixed same-session directly in `glyphrogue`, with a
  regression test added to `packages/core/test/save.test.js`.
- **`computeFov`/`fovContains` (`fov.js`) were never added to
  `index.js`'s public export list** (found same session, checkpoint 1's
  live camera/FOV render loop). Implemented and tested internally
  (`fov.test.js`), reachable only via `api.computeFov`'s player-FOV-bound
  wrapper (fixed `isOpaque`) — contradicts `docs/design/rendering.md`'s own
  "one shared shadowcasting primitive, three consumers" framing (player
  FOV, per-monster perception, **light-source propagation**), which needs a
  raw `computeFov` callable with a caller-chosen `isOpaque`, not `api`'s
  fixed one. Blocked glyphkeep's own render-loop test file immediately.
  Small, unambiguous, same class of gap as session 34/35's other
  internal-only-primitive exports — fixed same-session directly in
  `glyphrogue` (two-line export addition), with a new
  `packages/core/test/index.test.js` regression test guarding the public
  surface.
