# glyphkeep dev-session override

`glyphkeep` exists partly to dogfood the `glyphrogue` engine
(`C:\Users\husbando\Claude\glyphrogue`), so finding real engine gaps while
implementing it is expected, not a failure. This file governs how
`/dev-session` (and any other work session) should handle that.

## Handling `glyphrogue` issues found along the way

1. **Log immediately.** The moment a real `glyphrogue` gap is found, write
   it down in this repo's `BACKLOG.md` under "Cross-project issues found in
   `glyphrogue`" before doing anything else — don't rely on remembering it
   until session close-out.
2. **Fix small, unambiguous gaps the same session, directly in
   `glyphrogue`.** A missing export, an oversight, a small ergonomics gap —
   the kind of thing every prior `glyphrogue` downstream-consumer session
   (the map editor, content browser, and CLI implementation sessions) has
   found and fixed as an immediate prerequisite, not deferred. Add a real
   regression test to `glyphrogue`'s own suite as part of the fix,
   regardless of when the next publish happens.
3. **Bigger or genuinely ambiguous gaps get logged and batched**, not
   decided unilaterally. Anything that would need real design discussion —
   not just an obvious bug — waits for its own dedicated conversation with
   the user, consistent with how every actual design decision in
   `glyphrogue`'s history has been made live, never solo.

## Phase-end review: promoting glyphkeep work upstream

At the end of every implementation phase (not every checkpoint — this is
a phase-boundary ritual, sized to `DESIGN.md`'s "Implementation phasing"
list), review everything built that phase and assess, for each
meaningfully reusable piece:

- **Is it a strong candidate for a first-class Content or Service plugin
  in `glyphrogue`?** (Content: id-keyed, multi-instance — rules,
  generators, entity types, matching the `wandersPlugin`/`bspPlugin`
  shape. Service: single-slot, swappable — matching `memory`/
  `audioLoader`.) Not everything reusable fits this shape — a render loop
  or an input-wiring pattern is closer to scaffold-template boilerplate
  or a plain exported utility than a plugin; call that out explicitly
  rather than forcing a plugin framing onto it.
- **Is it a strong candidate for a `glyphrogue` baseline/engine change**
  (an export fix, a primitive the engine should provide directly, a
  scaffold-template default)?
- Anything genuinely game-specific (glyphkeep's actual combat formulas,
  its specific floor/stairs mechanics) is **not** a candidate — say so
  explicitly rather than leaving it unaddressed, so the review reads as
  complete.

For each real candidate, recommend (don't unilaterally decide, same
posture as every other design call in this project's history):

- Whether it's worth a dedicated `glyphrogue` session before continuing to
  the next phase, or whether it should wait for more evidence from a
  later phase before locking in a shape (premature generalization off one
  phase's data is a real risk — several of `glyphrogue`'s own deferred
  items exist because of this same discipline).
- Whether, after a `glyphrogue` session lands a fix, a glyphkeep
  follow-up session should fold it back in (swap a glyphkeep-side
  workaround for the new first-class primitive) before glyphkeep's own
  next phase starts.

Document the outcome in both `BACKLOG.md`s (glyphkeep's NEXT SESSION
pointer sequencing any glyphrogue/fold-back sessions ahead of the next
phase; glyphrogue's NEXT SESSION and/or "Deferred / future items" sections
for whatever glyphrogue-side work resulted) so a future session can pick
up the recommendation directly, without re-deriving the analysis.

## Local development against `glyphrogue`

While actively iterating on `glyphkeep` and fixing `glyphrogue` gaps as
they're found, use `npm link` (or a `file:` reference swapped into
`package.json`) against the local `glyphrogue` checkout, not the published
npm packages — the same testing-time workaround `glyphrogue/docs/design/
cli.md` already names for pre-publish testing. This lets a fix be tested
immediately without a live `npm publish` cycle for every small change.

## Publishing `glyphrogue` fixes

Real `npm publish` + version bump for `glyphrogue` packages happens at
natural checkpoints — the end of a `glyphkeep` implementation phase, or
whenever `glyphkeep` needs to be externally distributable again — batching
everything found since the last publish into one coherent version bump.
Publishing is a real, external, irreversible action: it stays manual and
user-driven (the user runs `npm publish` themselves), never automated,
exactly as it was the first time `glyphrogue`'s packages were published
(session 42, `glyphrogue/docs/session-logs/session-42-2026-07-26.md`).
Before that checkpoint, `glyphkeep`'s own `package.json` should point at
the local link, not a semver range that doesn't reflect what's actually
being tested against.

## Session logs across repos

If a glyphkeep session makes any real changes to `glyphrogue` (per
"Handling `glyphrogue` issues found along the way" above — a live fix,
not just a logged-but-deferred gap), write **and store a session log in
both repos** at close-out, not just glyphkeep's: `glyphkeep/docs/
session-logs/` per glyphkeep's own convention, and a matching entry in
`glyphrogue/docs/session-logs/` (continuing that repo's own session
numbering) covering specifically what changed there and why. A session
that only reads/researches `glyphrogue` without changing it doesn't need
a `glyphrogue`-side log.
