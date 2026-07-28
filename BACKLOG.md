# glyphkeep backlog

## NEXT SESSION

`DESIGN.md` is complete (session 1, a `/decision-session`, 2026-07-26).
Phase 1 ("scaffold + core loop") is complete as of this session (session
2, 2026-07-26), across four checkpoints — see the "Implementation
phasing" entry below for what landed, and `docs/session-logs/
session-2-2026-07-26.md` for the full session log (this session also has
a sibling log in `glyphrogue/docs/session-logs/session-43-2026-07-26.md`,
per the new dual-repo convention below). Phase 2 is scoped and ready, but
**two sessions come first, in order, before Phase 2 starts**:

1. **A `glyphrogue` session** (see `glyphrogue/BACKLOG.md`'s NEXT SESSION
   section) — threads `rng` through the action/rule pipeline (`ctx.rng`,
   mirroring the generator ctx's shape) so a rule can roll against the
   real seeded stream instead of a rule having no rng access at all, plus
   a bundled `isWalkableCell` export fix. Scoped as its own session rather
   than fixed live this session because it's a real architectural change
   (`createContext`/`dispatch`/`dispatchExclusive`/`createEngine`), not a
   small export addition — see the "rule's `ctx` has no RNG access"
   cross-project entry below for the full writeup.
2. **A glyphkeep fold-back session, immediately after** — swaps
   `src/rules.js`'s `combatRng` workaround (a second, separate seeded
   stream) for the real `ctx.rng` once it exists, and swaps
   `src/game.js`'s `isWalkableInZone`/`isOpaqueInZone`/`cellAt` trio for
   the newly-exported `isWalkableCell` (or equivalent) instead of the
   locally-reinvented versions. Keeps glyphkeep current as glyphrogue's
   reference downstream consumer rather than carrying workaround debt
   into Phase 2.

**Then Phase 2: full bestiary + boss** — `ChasesPlayer`/`Flees`/`Guards`
(the remaining three solo behaviors), combo enemies (multiple behavior
markers on one entity, priority-tuned `dispatchExclusive` resolution),
undead-skewing enemy distribution by floor depth, and Duke Glyphmund
replacing the placeholder win floor. Kickoff research should re-verify
any `glyphrogue` primitives this phase needs against real current code,
same as Phase 1's kickoff did, and should also revisit `glyphrogue/
BACKLOG.md`'s three new deferred items (move-action resolution as
first-party content, camera/FOV/render-loop and keyboard-input wiring as
scaffold-template boilerplate) once Phase 2 has actually happened —
they're explicitly waiting for a second data point before being designed
for real. `runConnectivityPass`'s export gap (below) still isn't needed
until Phase 5.

The GitHub remote ([Rhapsydian/glyphkeep](https://github.com/Rhapsydian/glyphkeep))
exists, is pushed, and has Pages source set to GitHub Actions — the
deploy pipeline is wired (`deploy-pages.yml` landed in Phase 1 checkpoint
1) and will activate on the next push to `main`.

**Session 3 (2026-07-28)** landed a small out-of-band tweak — viewport
enlarged to 25x21 cells and the camera's `deadzone` fixed to match
`SIGHT_RADIUS` (was clipping FOV in the direction of travel regardless of
viewport size). Purely local to `src/game.js`, no `glyphrogue` involvement;
doesn't change the sequencing above. Full writeup: `docs/session-logs/
session-3-2026-07-28.md`.

## Implementation phasing

Dependency-ordered, from `DESIGN.md`'s "Implementation phasing" section.
Check items off here as they land, same convention `glyphrogue` itself
uses.

1. **Scaffold + core loop** — done (session 2, 2026-07-26). Four
   checkpoints: scaffold merge + live camera/FOV render loop; keyboard
   input wired to movement via a glyphkeep-authored `Move` rule; BSP
   floors 1-10 with a stairs-triggered descent and a placeholder win
   screen on floor 10; one `Wanders` enemy type (`wanderer`) populated per
   room, a glyphkeep-authored `Attack` rule (accuracy/damage rolls against
   glyphkeep's own seeded rng, since a rule's ctx has no rng access — see
   cross-project section), and permadeath to a placeholder death screen.
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
- **`runConnectivityPass`/`ensureTraversable`/`stampTemplate` (`zoneComposition.js`)
  aren't exported from `index.js`** (found checkpoint 3, writing
  glyphkeep's own BSP floor generator to get at `carveBsp`'s `rooms` list
  for stairs placement — the stock `bspGenerator` discards it).
  `carveBsp`/`createZone`/`carveCellularAutomata`/`connectCorridor`/
  `nearestOpenCell` are already exported "for authoring tools... that call
  several of these directly" (index.js's own comment), but
  `runConnectivityPass` — the "mandatory post-generation pass"
  (`zoneComposition.js`'s own doc comment) every stock generator calls
  internally — isn't in that same set, so a custom generator has no way to
  reuse it. **Not fixed this session**: a pure BSP-only floor with no
  stamps doesn't actually need it (`carveBsp`'s connect-on-merge already
  guarantees full connectivity on its own, per its doc comment), so nothing
  in Phase 1 is blocked. Will genuinely block Phase 5 (stamped event
  rooms — shops/shrines/cursed rooms/vaults — which do need the mandatory
  pass to guarantee a stamp isn't isolated) — revisit then.
- **A rule's `ctx` (`actions.js`'s `createContext`) has no RNG access at
  all** (found checkpoint 4, writing the `Attack` rule DESIGN.md's Combat
  section calls for — "an accuracy/evasion check plus a weapon min-max
  damage roll, both against the engine's seeded RNG"). Only a *generator*'s
  ctx carries `rng` (`mapgen.js`); `dispatch`/`dispatchExclusive`/
  `createContext` never thread `api.rng` through the way `mapQuery`/
  `renderEvents`/`scheduler` already are, so no rule anywhere can roll
  against the shared seeded stream. **Not fixed this session** — unlike
  the three export-only gaps above, this is a real architectural change
  (touching `actions.js`/`engine.js`/`api.js`, not a two-line addition),
  so per `.claude/dev-session.md` it's logged for its own conversation
  rather than decided solo. Workaround: `src/rules.js`'s `Attack` rule
  takes its own `createRng` instance (seeded from `api.rng.state` at
  bootstrap, exported from `@glyphrogue/core` already) as an explicit
  dependency instead of reaching for a nonexistent `ctx.rng` — a separate
  deterministic stream, not literally `api.rng` itself.
- **`act()`/`run()` (`engine.js`) hang forever instead of erroring when
  called against an empty scheduler** (actually first hit checkpoint 2,
  before `instantiateZoneContent` called `api.addActor` for the player —
  worked around in the moment, but only formally caught and logged at
  this session's close-out via glyphkeep's own Tokenote companion notes
  flagging it in real time). `next(scheduler)` correctly returns
  `undefined` for "no actors registered," but `act()` fell straight
  through to `dispatchExclusive`/`spend` with `entity=undefined` anyway,
  which corrupts `scheduler.actors` with a `NaN`-budget entry — every
  future `next()` call then returns `undefined` too, forever, with no
  lock ever set to stop `run()`'s `while (!engine.locked)` loop. Small,
  unambiguous, a real crash/hang-class bug independent of glyphkeep's own
  mistake that first surfaced it — fixed same-session directly in
  `glyphrogue` (an early-return guard in `act()`, a loop-break in `run()`
  on the resulting `idle` flag), with regression tests in
  `engine.test.js`.
- **`create-glyphrogue-game`'s scaffold template shipped with no
  `.gitignore`** (same close-out pass, same Tokenote source). Every
  generated game's `node_modules`/`dist` were one `git add .` away from
  getting committed — glyphkeep's own root `.gitignore` was added by hand
  in checkpoint 1 as a local workaround, never fed back. Small,
  unambiguous — fixed same-session directly in `glyphrogue`
  (`packages/cli/templates/default/.gitignore`), with a regression test
  in `packages/cli/test/scaffold.test.js` asserting the real template
  copies it through.

**Process note**: the two fixes above were both real gaps present since
checkpoints 1-2, not new regressions — they just weren't caught by this
project's own "log immediately" discipline in the moment, only surfaced
via an external tool (Tokenote) watching the session. Worth remembering
this discipline can miss things a workaround quietly absorbs without
ever being explicitly noticed as "a glyphrogue gap, not just an extra
line of glyphkeep code" — the close-out pass's Tokenote-resolution step
is a real backstop for this, not just paperwork.

Three more found immediately after close-out, while adding a GitHub
Pages link to this README (the two `deploy-pages` runs so far had both
actually failed, silently — nobody had checked):

- **`packages/editor`'s `dist/` is gitignored in `glyphrogue` (a real
  Vite library build, not committed source), but this repo's own
  `vite.config.js` imports `@glyphrogue/editor/devServerPlugin`
  unconditionally at config-load time** — needed even for `npm run
  build`, not just the dev-only entry that actually uses it at runtime.
  CI only checks out this repo, never builds `packages/editor` in the
  linked `glyphrogue` checkout, so the import can't resolve. Not a
  `glyphrogue` code gap (the `dist`/`src` split there is correct and
  deliberate) — a consequence of consuming `glyphrogue` via `file:`
  references in a CI context that convention hadn't been tested against
  before. Worked around in `.github/workflows/deploy-pages.yml`: check
  out `glyphrogue` as a sibling, build `packages/editor` there, then
  install/build this repo — same interim-workaround posture as the
  `file:` references themselves, revisit at the next real publish
  checkpoint.
- **`create-glyphrogue-game`'s scaffold template hardcoded
  `vite.config.js`'s Pages-mode `base` as root `'/'`** — only correct for
  a `<user>.github.io` root repo or a custom domain; an ordinary project
  repo (this scaffold's own normal case, including this one) is served
  from `/<repo-name>/`, so every built asset 404s. A real template bug,
  not glyphkeep-specific — fixed directly in `glyphrogue`
  (`packages/cli/templates/default/vite.config.js`, templating the game
  name into the base path), with a regression test in
  `packages/cli/test/scaffold.test.js`. This repo's own already-generated
  `vite.config.js` needed the same manual fix (`base: '/glyphkeep/'`),
  since the template fix doesn't retroactively touch anything already
  scaffolded.

Verified end-to-end: after both fixes, `deploy-pages` actually succeeds
(build + deploy jobs both green), and <https://rhapsydian.github.io/glyphkeep/>
loads the real game with no console errors or 404s.
