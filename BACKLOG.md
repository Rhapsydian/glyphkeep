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

Before Phase 1 can produce anything visible on GitHub Pages, the GitHub
remote needs to exist — see this repo's `README.md` for the manual
repo-creation checklist; the assistant will add the remote and push once
it's confirmed to exist.

## Implementation phasing

Dependency-ordered, from `DESIGN.md`'s "Implementation phasing" section.
Check items off here as they land, same convention `glyphrogue` itself
uses.

1. **Scaffold + core loop** — not started.
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

None yet — this section fills in once implementation sessions start
finding real engine gaps. See `.claude/dev-session.md` for the workflow:
log here immediately when found, fix small/unambiguous ones the same
session directly in `glyphrogue`, batch bigger ones for their own design
conversation.
