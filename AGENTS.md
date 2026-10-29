# AGENTS.md

Conventions for AI coding agents working in this repository. Human-facing project docs live in `CLAUDE.md` (repo overview) and `kgb/map/CLAUDE.md` / `kgb/bus-stop/CLAUDE.md` (sub-project detail) — read those first; this file is about *how to work*, not *what the code does*.

## Branches

- `main` — deployed to Vercel. Don't push experiments here.
- `beta` — testing ground for `kgb/map/` rewrites. Currently far ahead of `main` (MapLibre 3D migration, uncommitted work in progress — check `git status` before assuming anything).
- `dev` — occasional fix branch; can fast-forward into `beta` when the owner lands a fix there.

Always confirm the active branch with `git status -sb` at session start. Never push without being asked.

## Session workflow (how the owner actually works)

- Short, terse requests, often with screenshots. Diagnose first, minimal diff, one concrete thing for them to verify.
- They test on **real Android Chrome** and desktop Five Server — devtools can neither reproduce nor verify. Their screenshots outrank your theories. If blind, say what would prove/disprove, don't ship theory-fixes.
- They ask "why" before "fix it" — explain the mechanism briefly, then fix.
- Plan mode flips on/off via system reminders mid-session. Respect it; when it lifts on a "go", move.
- They say "go" to mean "implement the plan we just discussed." Don't re-ask.
- Repo-local `skills/` (owner-added, e.g. `browser-access`, `session-handoff`) outrank system defaults on their topics — read the SKILL.md before acting, obey standing orders there.

## Verification standard

- `node --check` on every `script.js` edit. No exceptions.
- Serve locally (`python -m http.server` — this box: `python`, `python3` is a dead Store stub) + fetch the page to prove it serves. Kill the server after.
- In-app browser works via code mode (`tools.browser.*`: open/wait/console/evaluate/screenshot) — use it to see the map yourself; owner screenshots still outrank it for real-device issues. State what the owner should check (exact pins, exact gestures, exact console lines).
- After verification-affecting edits (CSS/JS), bump the `?v=` cache-bust on the changed asset in `index.html` so phones can't run stale code.

## CSS + third-party-map-library rule (learned 2026-10-19, do not repeat)

Never set positioning properties (`position`, and by extension layout-affecting display) on a third-party library's own classes (`.maplibregl-*`, `.leaflet-*`). An equal-specificity rule in our later-loaded stylesheet silently wins and breaks the library's positioning math — this once displaced all 110 pins in index order with zero console errors. Either `!important` deliberately with a comment explaining why, or don't touch those properties at all. Canonical check for pin drift: A13/A14 must render north of A9; screen order must follow coordinates, never file order.

## Data rules

- `kgb/data/kgb-map/kgb-map.json` is generated from a Google Sheet via Apps Script — never hand-edit; direct the owner to the Sheet. (One blank row currently exists in the file and is harmless — `processData` filters it.)
- Live data is fetched from `main` at runtime, so `beta` code always runs against `main` data. Verify data separately from code (`webfetch` the raw file) when pins misbehave.

## Docs to keep in sync

- `kgb/map/CHANGELOG.md` — every shipped change. Root `CHANGELOG.md` — high-level entries only (mark unmerged beta work as such).
- `kgb/map/DEV_NOTES.md` — append a session entry at handoff: vibe + discoveries + open threads, not just facts.
- `kgb/map/feature.md` — non-technical Malay user guide. Update when user-facing behavior changes.
- `kgb/map/CLAUDE.md` — architecture notes. It goes stale fast during rewrites; a dated header disclaimer beats a full rewrite mid-flight.

## Debugging blind (no browser)

- Prefer decisive console tests over code changes: one `map.resize()`, one `getLayer` check, one `getLngLat` triple answers more than three theory edits.
- Log happy paths too (`[pins-html] mounted: N`) — silent success told us nothing for a full round once.
- `?debug=1` (camera chip) and `?debugpage` (full state overlay) exist for exactly this — point the owner at them instead of guessing.
- Headless harness: `node kgb/map/harness.debug.js` runs the real boot flow against a fake map (both load orderings). Kept deliberately — extend it before guessing at ordering bugs.
- When a canvas primitive fails silently on a real device, reroute through a proven renderer (HTML markers) after one immediate-verify round (`!!getLayer` right after add + debug counters) — never spend rounds on layer surgery blind. Rotation-invariant markers dodge all pitch/bearing math.
- CHANGELOG edits are append-only: re-read the section after every edit (replace-instead-of-append slipped twice).
