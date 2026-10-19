---
name: session-handoff
description: End-of-day DEV_NOTES ritual (checkpoint, guides, changelogs, rollups). Load when the user asks for the ritual, wrap-up, or handoff.
---

# Session handoff skill (repo-local ritual)

Requested by name ("do the devnotes ritual", "wrap up"). Do it thoroughly,
then stop. All output stays **uncommitted** — never stage, commit, or push
unless explicitly asked.

## Step 1 — Collect facts (read-only)

Run and keep the outputs:
- `git status -sb` (what's dirty, what's untracked)
- `git diff --stat` (size per file)
- `git log --oneline -5` (what's already committed vs session work)
- Note deploy IDs + smoke codes from the session (307/401/200).

## Step 2 — Folder checkpoint (`DEV_NOTES.md`)

Prepend `## Checkpoint N — <date> (<one-line arc>)`, newest-first:
1. **Headspace paragraph** — owner dynamic, session shape, mood, sync cues
   for next-you. Vibe first, facts second.
2. **What shipped** — commits/deploys with IDs, tsc/build/smoke proof.
   Mark deployed-but-uncommitted explicitly.
3. **Bugs + lessons** — numbered, continuing the folder's sequence
   (gmvmax-auto is at B69+). Each: symptom → cause → lesson phrased as
   "never X, always Y". Repeats of old bugs get logged honestly.
4. **Open threads** — parked items with owners (owner-side vs next-build).
5. Update the header pointer line to the new checkpoint.

## Step 3 — User guide (`feature.md`)

Plain non-technical words, behavior changes only. No internals, no IDs.

## Step 4 — Conventions (folder `AGENTS.md`)

Deltas only: migration list lines, UI/API contracts, new rules.
One line per change, same terse style as the file.

## Step 5 — Rollup
- Folder `CHANGELOG.md`: new dated section on top (or bullets under
  `Undeployed`), one line per shipped step with deploy IDs.
- `1-master/MASTER-CHANGELOG.md`: one line + folder-changelog pointer.
- `1-master/MASTER-PLAN.md`, `1-master/MASTER-AGENTS.md`, root `AGENTS.md`:
  pointer bumps only (checkpoint numbers, status phrases).
- creative-analysis variant: tick `plan.md`, bump `app.js?v=N` note,
  `CHANGELOG.md` counter never renumbers (prepends anchor on heading +
  first body line).

## Step 5b — Skills update (standing protocol, skip only if told)

Fold session discoveries into affected `skills/*/SKILL.md` (verified-only
standard: green probes/deploys in, guesses out). New endpoint shape →
`tiktok`; shop quirk → `tiktok-shop`; cap/gate lesson → `vercel-deploy`;
schema pattern → `neon-db`; creative rule → `creative-analysis`; bot shape
→ `telegram-rich`. One delta per skill, same terse style.

## Step 6 — Verify and stop

Final `git status -sb`: confirm the ritual touched docs only, nothing
staged, nothing pushed. Reply short: files touched + "then stopping".

## Repo adaptations (unija-map, 2026-10-20)

Template paths don't exist here — map them: `DEV_NOTES.md` →
`kgb/map/DEV_NOTES.md` (prepend checkpoint, update pointer line);
`feature.md` → `kgb/map/feature.md`; changelogs → root + `kgb/map/`
`CHANGELOG.md` (append under Unreleased); no `1-master/`, no bug
numbering; skills update = this file only.
