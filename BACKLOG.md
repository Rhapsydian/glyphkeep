# glyphkeep backlog

## NEXT SESSION

`DESIGN.md` is complete (session 1, a `/decision-session`, 2026-07-26).
Phase 1 ("scaffold + core loop") is complete as of this session (session
2, 2026-07-26), across four checkpoints — see the "Implementation
phasing" entry below for what landed, and `docs/session-logs/
session-2-2026-07-26.md` for the full session log (this session also has
a sibling log in `glyphrogue/docs/session-logs/session-43-2026-07-26.md`,
per the new dual-repo convention below). The two prerequisite sessions
flagged before Phase 2 have both landed: a `glyphrogue` session (session
44 there, 2026-07-28) threaded `rng` through the action/rule pipeline
(`ctx.rng`, the same live object as `api.rng`) and exported
`isWalkableCell`; this repo's own session 4 (2026-07-28) folded both back
in — `src/rules.js`'s `combatRng` workaround is gone in favor of the real
`ctx.rng`, and `src/game.js`'s `isWalkableInZone`/`isOpaqueInZone` now
delegate to the exported `isWalkableCell` instead of reinventing it
(`cellAt` stays, still needed for `classifyTerrainCell`'s raw cell-type
rendering lookup). See `docs/session-logs/session-4-2026-07-28.md` — no
sibling `glyphrogue`-side log needed, this session made no changes there.
One thing worth knowing going into Phase 2: `isOpaqueInZone`'s new
`!isWalkableCell(...)` body is only correct because every zone today has
exactly two cell values (wall/floor) — it stops being a safe equivalence
the moment a cell type is both walkable and opaque (or the reverse)
exists, which BACKLOG.md already expects no earlier than Phase 5's
stamped event rooms, not Phase 2.

**Now Phase 2: full bestiary + boss** — `ChasesPlayer`/`Flees`/`Guards`
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
- **Duke Glyphmund's summoned undead adds** — `DESIGN.md`'s "possibly
  summoned undead adds" was resolved live (Phase 2 decision session,
  2026-07-28): a working enrage-only fight is a complete, testable boss
  encounter on its own; summon logic (spawning entities mid-encounter,
  scheduler/floor-owned-entity wiring, balancing their appearance) is a
  second feature's worth of scope hiding inside "boss." Cut from Phase 2,
  revisit only if the bare enrage fight plays too flat once tested.
- **Wraith/mouse kill rewards (essence/gold)** — DESIGN.md's bestiary flags
  wraith as a high-essence reward and mouse as a high-gold reward, but
  neither essence-banking (Phase 4) nor gold currency (Phase 5) exists yet.
  Behavior/stat identity shipped in Phase 2; the actual numeric reward
  hookup waits for whichever phase builds the system that consumes it,
  rather than an inert placeholder field nobody reads yet.

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

Two more found during Phase 2 checkpoint 1 (bestiary wiring), while verifying
the new `Guards`/`ChasesPlayer`/`Flees` plugins in the real browser:

- **A `TakeTurn` that legitimately resolves to no followOn spends zero
  scheduler cost, letting `scheduler.next()`'s tie-break re-select the same
  actor forever** — found live: floor.js seeds a `Guards` entity's `post` to
  its own spawn position, so a freshly-spawned bandit is already "at post" on
  turn one; `guardsRule` correctly returns `undefined` (nothing to do), but
  `dispatchExclusive`'s resolved list is then just the bare `TakeTurn` action
  with no `cost`, `spend()` subtracts 0, and `api.run()`'s `while
  (!engine.locked)` loop hangs forever without ever reaching the player's
  turn — froze the dev server's tab solid on the very first render. Same
  failure class as session 16's empty-scheduler hang, but a different
  trigger (a legitimately-idle actor, not zero actors). **Not fixed in
  `glyphrogue` this session** — genuinely ambiguous where a "minimum turn
  cost" safeguard should live (an engine-level scheduler floor, vs. a
  content-author convention every `TakeTurn` rule needs to know about), so
  per `.claude/dev-session.md` it's logged for its own conversation rather
  than decided solo. Workaround: `src/rules.js`'s `registerPassFallbackRule`
  registers a glyphkeep-authored, no-component-filter `TakeTurn` rule at
  priority below `WANDERS_PRIORITY` that always emits a real-cost `Pass`
  followOn — only ever wins `dispatchExclusive`'s resolution when every
  first-party behavior rule genuinely had nothing to do that turn, matching
  DESIGN.md's "uniform one action per turn for everyone." Regression test:
  `test/enemyPlugin.test.js`'s "a Guards enemy already at its own post still
  consumes its scheduler turn."
- **The map editor's "Plugins" panel fails to dynamically import
  `enemy-plugin/index.js`** (`Failed to fetch dynamically imported module`,
  visible in `dev.html`'s editor sidebar). Confirmed pre-existing — the same
  error reproduces on unmodified Phase 1 code (`git stash` back to before
  this session's changes, same red error), so not a checkpoint 1 regression.
  Doesn't block gameplay (the same plugin loads and works fine via
  bootstrap.js's ordinary static import — this is only the editor's separate
  dynamic-import-based plugin-inspection UI). Not investigated further this
  session; worth a look whenever the map editor's Plugin management panel is
  actually being used for something, not urgent before then.

One more found during Phase 2 checkpoint 2 (combo enemies + distribution),
authoring the slime archetype's "aggressive until hurt, then flees" combo:

- **`fleesRule`/`chasesPlayerRule`/`wandersRule`/`guardsRule` (`behaviors.js`)
  and their priority constants (`FLEES_PRIORITY` etc.) and
  `DEFAULT_MOVE_COST` were never re-exported from `index.js`** — only the
  four pre-wrapped plugins (each baking in a fixed, unconditional
  `components: { all: [Marker] }` filter) were public. Blocked slime's combo
  directly: reusing the real, tested flee-movement logic with a *tighter*
  filter (marker present AND health at/below half) needed the raw
  `fleesRule` function, and correctly composing with the real priority
  ordering needed `FLEES_PRIORITY` rather than a hardcoded magic number.
  Small, unambiguous, same class as the earlier `computeFov`/`isWalkableCell`
  export fixes — fixed same-session directly in `glyphrogue`
  (`packages/core/src/index.js`, exporting `fleesRule` and all four
  priority constants), with regression tests in
  `packages/core/test/index.test.js`. Bundled in the same fix:
  `DEFAULT_MOVE_COST` was also unexported, and glyphkeep's own `rules.js`
  had independently redeclared the same "100" twice (`MOVE_COST` for the
  player's move, `PASS_COST` for the Phase 2 checkpoint 1 scheduler-hang
  fallback) purely because there was no way to reference the real constant
  either was meant to stay in lockstep with — both now derive from the
  exported `DEFAULT_MOVE_COST` instead. Only `wandersRule`/`chasesPlayerRule`/
  `guardsRule` stay unexported for now (nothing in glyphkeep needs a
  tightened filter around those yet — export them too if that changes).
- **`floorGenerator.js`'s `pickEnemyType` reinvents "pick from a candidate
  pool via the seeded rng"** (found via the checkpoint 2 background review
  pass) — `glyphrogue` itself already has two independent, unexported
  implementations of essentially the same thing (`layeredBiome.js`'s
  `weightedPick`, `waveFunctionCollapse.js`'s `pickWeighted`), neither ever
  extracted into a shared, exported primitive. Three separate
  implementations of the same pattern now exist across both repos. **Not
  fixed this session** — the gap lives in `glyphrogue`'s own `rng.js`/
  `zoneComposition.js`, not something glyphkeep can resolve by consuming an
  export, and per the review agent's own recommendation this should wait for
  a third real glyphrogue-internal consumer before designing a shared
  `pick`/`pickWeighted` helper, rather than generalizing off one data point.
- **`glyphrogue` has a solved composition story for exclusive actions
  (`dispatchExclusive`'s priority/component-filter resolution) and none at
  all for additive ones (`dispatch`)** — a real pattern, not a one-off,
  spotted by the checkpoint 3 review agent with the benefit of seeing all
  three of this phase's checkpoints together. Checkpoints 1 and 2 both
  needed "conditionally-scoped rule composition" for `TakeTurn` (an
  exclusive action) and got it cleanly via tightened component filters
  plus real priority ordering — a genuinely solved problem there. Checkpoint
  3 needed the same shape of thing for `Attack` (an additive action, via
  `dispatch()`, which runs and applies *every* matching rule rather than
  picking one) and had no equivalent tool: `dispatch()`'s additive model
  means two competing `Attack` rules would double-resolve the same hit
  (confirmed by reading `actions.js` directly), and `registerRule`'s
  `options.override` only supports whole-rule replacement under the same
  id, not a scoped variant for a subset of entities. Duke Glyphmund's enrage
  bump had to be folded directly into glyphkeep's own shared `attackRule`
  instead (`src/rules.js`) — the only clean option available, not a
  workaround, but real evidence of a missing engine primitive. **Not fixed
  this session** — designing a real "rule-result modifier/decorator scoped
  by component filter" for additive action types is genuinely new engine
  work, not a two-line export fix, so per `.claude/dev-session.md` this
  needs its own dedicated `glyphrogue` conversation with the user, not a
  solo decision. Worth revisiting the next time an additive-action
  entity-conditional need comes up (a second data point beyond Duke alone),
  or sooner if the user wants to design it proactively given three
  checkpoints already pointing at the same gap.
