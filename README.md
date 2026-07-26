# glyphkeep

A haunted-dungeon-crawl roguelite built on the [glyphrogue](https://github.com/Rhapsydian/glyphrogue)
engine — its first real downstream game, scaffolded via
`create-glyphrogue-game`.

Descend a ruined keep haunted by the ghosts of the family that once ruled
it. Full design: [`DESIGN.md`](DESIGN.md).

## Status

Design complete (session 1, 2026-07-26). No implementation yet — see
[`BACKLOG.md`](BACKLOG.md) for the phased build plan and current NEXT
SESSION pointer. The repo is live and Pages is wired (see Deploy below),
but there's nothing playable until Phase 1 lands.

## Deploy

Once real code exists (starting with implementation Phase 1), this repo
will deploy the same way `glyphrogue`'s own downstream scaffolds do:

- **GitHub Pages**: already enabled (Settings → Pages → Source → GitHub
  Actions). A `deploy-pages.yml` workflow (provided by the
  `create-glyphrogue-game` scaffold) will build and deploy automatically
  on push to `main` once Phase 1 adds it — there's no built game to
  deploy yet, so Pages is currently idle.
- **itch.io**: not scripted (a `BUTLER_API_KEY` and per-project channel
  name aren't things a template can fill in safely) — once there's a
  build, push it with:

```bash
butler push dist rhapsydian/glyphkeep:html5
```

## Project conventions

Mirrors `glyphrogue`'s own documentation conventions at a scale
appropriate for a game rather than an engine: `docs/session-logs/` for a
log per work session, `BACKLOG.md` for the phased roadmap and NEXT SESSION
pointer, `.claude/dev-session.md` for the project-specific process
override governing how `glyphrogue` engine issues found along the way get
handled.
