# glyphkeep: design

Deep-dive design doc for `glyphkeep`, a haunted-dungeon-crawl roguelite
built on the `glyphrogue` engine (`@glyphrogue/core`/`@glyphrogue/editor`/
`@glyphrogue/input`, scaffolded via `create-glyphrogue-game`). This is
`glyphrogue`'s first real downstream consumer, and it's deliberately
scoped to touch as much of the engine's feature surface as possible while
still being a genuinely playable game — not a pure smoke test, not a
narrow single-system demo. Produced in a `/decision-session`
(2026-07-26); see `docs/session-logs/session-1-2026-07-26.md` for the full
decision-by-decision record of how this doc came together, including the
audits that found real gaps along the way.

Treat this as the source of truth for implementation, same convention
`glyphrogue`'s own `docs/design/*.md` docs use — but also expect drift.
Unlike `glyphrogue`'s own docs, most of this spec was written *before* any
code exists, so a future implementation session's kickoff research is
expected to verify every primitive named here against real `glyphrogue`
code and correct small mismatches, exactly as `glyphrogue`'s own
implementation sessions (28, 34, 36, 38, 39, 40...) routinely did against
their design docs.

## Concept

A haunted ruin of a keep. Duke Glyphmund once ruled here; he and his three
children — Glyphelda, Glyphrey, and Glyphard — all perished when the keep
fell, and now haunt it as ghosts, each bound to a different remnant of its
former life. The player descends through the ruin, and the deeper they
go, the more the dungeon's original inhabitants (rats, goblins, bandits
who moved into the ruins after the fall) give way to the undead the
Duke's fall left behind. Otherwise, lean hard into general fantasy
cliché rather than a gimmick — the mechanics are the point, not the
setting.

## Structure

**Floor 0 — the hub.** Static, hand-authored, a real walkable zone (not a
menu sequence) using the same input/camera/rendering pipeline as every
other floor. Visited at the start of every run (after death or a win),
never regenerated — its fixtures visually accumulate permanent progress
over time (the Trophy Case fills up, the Artifact Cabinet fills up).
Contains:
- **Glyphrey's loadout offer**: 5 randomly-rolled starting items generated,
  the player picks 2 ("thought these might be useful, don't get greedy
  though..."); unpicked items vanish once picks run out ("I think that
  will get you started..."). Extra pick slots beyond 2 are a permanent
  essence unlock (see Progression).
- **Glyphelda's shrine**: where essence is spent on permanent unlocks —
  also the player's first, safe introduction to Glyphelda, in contrast to
  her riskier shrine bargains on the floors below.
- **Trophy Case**: achievements, viewable/interactable here (also
  reachable via pause mid-run).
- **Artifact Cabinet**: identified shards and completed artifacts, same
  dual-access pattern as the Trophy Case.
- Settings access (also reachable from the main menu, before a hub even
  loads).

**Floors 1-10 — the descent.** Generated at runtime via `generateZone`,
fresh every new game (real per-run procedural generation, not pre-baked
content) — mostly BSP-carved rooms (`carveBsp`/`bspGenerator`), with the
last floor or two blending in cave-like sections via the generator
composition tool's emitted `generatorFn` (BSP region + `carveCellularAutomata`
region + `connectCorridor`, per `docs/design/editor.md`'s "Generator
composition tool"). **No backtracking** — descent is one-way, matching
every other roguelite reference point discussed and avoiding the
complexity of re-visiting an already-left, already-generated floor.

**Floor 10 — the throne.** Duke Glyphmund. Defeating him and claiming his
signet (or similar family-tied artifact — exact prop TBD at implementation
time) is the win condition.

## Map generation content

- **Stamped event rooms** (`stampTemplate`, hand-authored templates
  exported via the map editor's template-fragment path, stamped into
  generated floors with some per-floor chance):
  - **Shops** — Glyphrey. Spend gold (see Progression) on gear upgrades.
  - **Shrines** — Glyphelda. Trade a boon in exchange for HP or swapping
    an existing boon for a different one.
  - **Cursed rooms** — Glyphard. Traps, ambushes, debuffs; the rarer,
    fuller half of the two-tier hazard model below.
  - **Vaults** — key-locked rooms containing better loot (gear, rarer
    shards). Give both keys and vaults (previously undefined) a concrete
    mechanic, using the connectivity system's key-gated-door capability.
- **Scattered hazards** — the lighter half of the two-tier hazard model:
  trap tiles and hidden curse sigils sown directly into ordinary generated
  rooms during the generation pass itself, small and frequent, distinct
  from the rarer stamped cursed room.
- **Logical links/teleporters** — non-physical graph edges from the
  connectivity pass (`docs/design/mapgen-and-editor.md`), previously
  unused anywhere in `glyphrogue`. A cursed one-way pit and/or a linked
  pair of crypt teleporters, attributed narratively to Glyphard.
- **Floor-scattered loot**: gold, equipment, keys, and rare artifact
  shards placed directly on generated floors. **Not** relics — relics stay
  shrine-exclusive, preserving the shrine's "guaranteed choice" feel.
- **Torches**: a real light-radius/fuel resource, not pure decoration —
  FOV shrinks as a held torch burns down, replaced via floor pickups.
  Exercises the FOV/lighting visualization system beyond passive sight.

## Enemies

One enemy per first-party AI behavior, individually:
- `Wanders` — a weak, aimless wanderer.
- `ChasesPlayer` — an aggressive chaser.
- `Flees` — a cowardly enemy that runs at low health.
- `Guards` — a stationary enemy that holds a position until the player
  enters range.

Plus several enemies combining two or more behaviors on one entity via
multiple marker components and priority-tuned `dispatchExclusive`
resolution (e.g. a chaser that flees once badly hurt) — no new engine
primitive expected, just careful priority design.

Distribution skews undead deeper into the dungeon (skeletons, wraiths)
over general-fantasy enemies near the top (rats, goblins, bandits).

**Duke Glyphmund** (final boss, floor 10): base AI is `Guards`-style
(stationary until the player enters range, fitting "bound to his
throne/tomb"), with a bespoke rule layered on top for a real boss feel —
an enrage phase past a health threshold, possibly summoned undead adds.
Deliberately distinct from the standalone `Guards` enemy above, not a
reskin of it.

## Combat

No built-in combat system exists anywhere in `glyphrogue/packages/core` —
this section is entirely game-authored content, built on the generic
action/rule dispatch pipeline (`dispatch`/`dispatchExclusive`) and the
turn scheduler.

- **Resolution**: classic bump-to-attack — moving into an enemy triggers
  an `Attack` action resolved via a rule.
- **Rolls**: an accuracy/evasion check plus a weapon min-max damage roll,
  both against the engine's seeded RNG (`rng.js`) for deterministic
  testability.
- **Stats**: Health, Attack, Defense on player and enemies alike.
  Equipment modifies Attack/Defense directly. Deliberately lean — resist
  adding a fourth stat without a specific need.
- **Range**: melee-only through implementation phases 1-2. Ranged/thrown
  weapons are a possible later equipment-type addition (phase 5+) rather
  than building a targeting UI into the critical path.
- **Status effects**: modeled as ECS components with a duration counter
  decremented once per turn, reusing the pattern `scriptedEvents.js`
  already established for timed waits — not a new mechanism. Backs
  Glyphard's curses/sigils.
- **Turn speed**: uniform one action per turn for everyone in the core
  phases. Variable speed via the scheduler's energy-budget model stays
  available later for a specific enemy archetype, not built into the base
  model now.

## Player build

No character classes. One fixed protagonist; build variety comes entirely
from which starting items are picked, plus equipment/boons/artifacts/
essence stat-bumps found or bought during and across runs. No in-run XP or
leveling — all power growth beyond a single run's loot is meta-progression
(see below), a deliberate tradeoff: difficulty pacing across 10 floors
depends on loot RNG and boons rather than a guaranteed per-floor power
floor, which can read as swingy run-to-run (also just how many "pure"
roguelikes behave).

## Progression — four axes

1. **Essence** (permanent, frequent spend). Banked on death/floor-descend,
   spent at Glyphelda's floor-0 shrine on:
   - Expanding the floor-0 loadout roll pool (more/rarer starting item
     options).
   - Raising the pick count above 2.
   - Small permanent stat bumps — this is the actual "leveling" system,
     replacing any in-run XP track.
2. **Gold** (in-run only, lost on death). Spent at Glyphrey's shops for
   gear upgrades during a run — the mechanism by which equipment actually
   changes over the course of 10 floors, not just floor-0 picks. Also
   spent identifying artifact shards (see below) — a genuine tension
   between identifying now for permanent progress and spending on gear to
   survive the current run.
3. **Boons/relics** (in-run only, lost on death). Passive, stacking
   effects in the Slay the Spire tradition, earned exclusively from
   shrines (and possibly vaults). Displayed as a "Relics" tab on the
   inventory/equipment screen, not a separate screen or HUD element.
4. **Artifact shards** (rare floor loot, in-run until identified).
   Several distinct collectible "artifacts," each assembled from multiple
   shards. An unidentified shard is lost on death, same as gold — Glyphrey
   is the identifier (fitting his transactional role), and identification
   costs gold. Once identified, Glyphrey delivers the shard "to the ground
   floor" and it becomes permanent progress toward its artifact.
   Completing an artifact grants a permanent meta-progression bonus (exact
   bonus TBD at implementation time). Displayed in the Artifact Cabinet.

**Achievements** sit alongside these as a fifth progression-adjacent
system: unlocking one grants a meta-progression boost (not just cosmetic
tracking), tracked in glyphkeep's own meta-progression persistent slice
and also passed to `api.platform.unlockAchievement` (a no-op-by-default
hook on a plain web build, kept for future platform-integration
future-proofing — glyphkeep's own tracking is what actually makes
achievements visible to the player). Displayed in the Trophy Case.

## Save/load

Two real persistence tiers, using `packages/core/src/storage.js`'s
backends:
- **Meta-progression slice** — essence, unlocks, identified
  shards/artifacts, achievements. Own persistent storage key, survives
  everything, never wiped.
- **In-progress run** — the existing `save.js` `serialize`/`deserialize`
  DTO (core+game+mods split). Autosaved on every floor transition, plus an
  explicit "save and quit" from the pause menu. Wiped on death or a win
  (the run is over either way); loaded automatically on game start if
  present.

The settings screen's "reset saved progress" is **two separately-confirmed
actions**, not one: abandoning the current run (low stakes) and wiping
meta-progression entirely (irreversible loss of essence/achievements/
unlocks — needs a real confirmation gate).

## Win/lose

- **Win**: defeat Duke Glyphmund on floor 10 and claim his signet (name/
  exact prop TBD). Routes through the same return-to-hub flow as a loss —
  meta-progression carries forward either way.
- **Lose**: permadeath. Shows a death/run-summary screen covering
  everything the run produced (essence earned, shards identified/
  progressed, achievements unlocked this run, floor reached) — not just
  essence, since the richer progression model makes a narrower summary
  stale. Returns to the floor-0 hub.
- **New Game+**: confirmed in scope. After a first win, an escalating-
  difficulty tier becomes available for subsequent runs, for replay value.
  Exact scaling mechanism (harder enemy stats, denser hazards, etc.) is
  TBD at implementation time — it's its own late implementation phase
  since it needs the full bestiary and hazard/event systems built first to
  have anything to scale.

## The family — mechanic map

All four are ghosts, bound to different remnants of the keep's former
function. Recurring, not one-off encounters — every shop is Glyphrey,
every shrine is Glyphelda's, consistently, not a single unique meeting.

| Character | Domain | Interaction mode |
|---|---|---|
| Duke Glyphmund | Final boss, floor 10 | Combat (Guards-based + enrage/summon) |
| Glyphelda (daughter) | Shrines (boons) + the floor-0 essence shrine | Dialogue negotiation — a cost each time (HP/boon-swap on the floors, essence at the hub) |
| Glyphrey (son) | Floor-0 loadout, mid-run shops, shard identification | Transactional — bookends every run |
| Glyphard (son) | Cursed rooms, scattered hazards, teleporters/one-way pits | Ambient taunt-and-vanish apparition — felt more than directly fought |

## Screens

- Main menu
- Floor-0 hub interactions: loadout (Glyphrey), essence shrine
  (Glyphelda), Trophy Case, Artifact Cabinet
- Pause (also reaches settings, achievements, and the artifact view
  mid-run)
- Inventory/equipment (with the Relics tab for boons)
- Settings — palette (colorblind toggle), keybinding remapping (reusing
  `packages/input`'s `captureBinding.js` directly, not the editor's
  dev-only `ConfigUI.svelte`), and the two-tier reset/delete described
  above. Resolves `glyphrogue/BACKLOG.md`'s deferred "settings menu"
  first-class-screen item, same as this project's inventory/equipment
  screen resolves the sibling inventory item. Reachable from both the main
  menu and pause.
- Death/run-summary
- Win
- Achievements (own screen; reachable from the hub Trophy Case
  interaction and from pause)
- Dialogue (`'core:dialogue'`/`ShowDialogue`, via `registerScriptedEvent`/
  `waitFor`) — ghost-whisper flavor text, ambush triggers, the boss-intro
  beat before Glyphmund, Glyphelda's shrine bargains, Glyphard's
  taunt-and-vanish lines.

## Audio, input, accessibility

- **Audio**: distinct music per floor tier (not one static ambient loop),
  plus a minimal SFX set (footstep, hit, pickup, stairs).
- **Input**: keyboard and gamepad both fully supported (`packages/input`'s
  poll+edge-detect gamepad path, previously unused by anything downstream).
- **Accessibility**: a colorblind-safe alternate palette plus a settings
  toggle — `glyphrogue/BACKLOG.md`'s deferred "shipped default
  colorblind-safe palette" item, given its first real downstream case.

## Explicitly out of scope

- **Player-facing mod support** (players toggling community mods at
  runtime). Would require new `glyphrogue` engine work (a persisted
  enabled-mods settings slice read at boot) beyond what exists today —
  stays on `glyphrogue/BACKLOG.md`'s deferred list, not pulled into this
  project.
- **World/region two-tier generation** — doesn't fit a linear 10-floor
  descent.
- **Real-time-with-pause battle internals** — undesigned anywhere in
  `glyphrogue`'s own roadmap; out of scope here too.

## Implementation phasing

Dependency-ordered; each phase ends in something concretely testable.
Phases 1-4 form a complete, winnable, persistent core game; 5-9 add the
breadth that makes this a real feature-surface stress test. See
`BACKLOG.md` for the authoritative, living version of this list and the
current NEXT SESSION pointer.

1. **Scaffold + core loop** — `npm create glyphrogue-game`, real input/
   camera/FOV wired to actual world state, BSP-only floor generation for
   floors 1-10, one enemy (`Wanders`) to prove combat, permadeath to a
   placeholder menu, reaching floor 10 as a trivial win.
2. **Full bestiary + boss** — the remaining three solo behaviors, combo
   enemies, undead-skewing distribution, Duke Glyphmund replacing the
   placeholder win floor.
3. **Equipment & inventory** — the floor-0 loadout screen, the real
   inventory/equipment screen.
4. **Meta-progression & persistence** — essence, the two save tiers,
   the death/run-summary screen. Core game complete here.
5. **Event rooms & family NPCs** — shop/shrine/cursed-room/vault
   templates, Glyphrey, Glyphelda, boons, keys, floor-scattered loot
   (including artifact shards), teleporters, the torch resource.
6. **Meta screens & scripted events** — main menu, pause, settings,
   achievements screen + Trophy Case, the Artifact Cabinet, colorblind
   palette, dialogue wiring.
7. **Audio & gamepad.**
8. **Polish & deploy** — balance pass, GitHub Pages/itch.io.
9. **New Game+ & difficulty scaling** — last, since it needs everything
   else built first to have something to scale.

## Cross-project workflow: handling `glyphrogue` issues

`glyphkeep` exists partly to dogfood `glyphrogue`, so finding real engine
gaps along the way is expected, not a failure. See
`.claude/dev-session.md` for the full convention; summary:

- Log every `glyphrogue` gap found immediately, in `glyphkeep`'s own
  tracking, so nothing is lost mid-session.
- Fix small, unambiguous gaps directly in `glyphrogue` the same session —
  matching every prior downstream-consumer precedent in `glyphrogue`'s own
  history (the map editor, content browser, and CLI implementation
  sessions all did this). Add a real regression test to `glyphrogue`'s
  suite regardless of publish timing.
- Bigger or genuinely ambiguous gaps get logged and batched for their own
  dedicated design conversation — never decided unilaterally, consistent
  with how every real design call in `glyphrogue`'s history has been made.
- While actively iterating, use `npm link` (or a `file:` reference) against
  the local `glyphrogue` checkout, so fixes are testable immediately
  without a publish cycle each time — the same testing-time workaround
  `docs/design/cli.md` already names.
- Real `npm publish` + version bump happens at natural checkpoints (end of
  a `glyphkeep` implementation phase, or before external distribution),
  batching accumulated fixes into one coherent bump — user-driven and
  manual, never automated, same as every previous `glyphrogue` publish.
