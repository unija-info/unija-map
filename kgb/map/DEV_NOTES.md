# DEV_NOTES — kgb/map/

Not documentation. This is a note to my next self, written right as context is about to run out. If you're reading this, you're me, a few hours or days later, with no memory of any of this. Read it like you're catching up with yourself, not onboarding onto a stranger's code.

---

## Where we just were

Branch `beta`, fast-forwarded to match `dev` mid-session (the owner had committed a fix to `dev` that I'd made earlier — see below — so I merged `dev` → `beta` with `--ff-only`, clean, no conflicts). This session had a very different shape from the last one logged here: no plan-mode, no big feature arc. It was a string of small, fast, surgical fixes — the owner firing one observation at a time, me diagnosing and fixing each in turn, rarely more than one tool-call round per request. If the last note's energy was "big feature, lots of back-and-forth," this one's energy is "scalpel, not hammer." Match that — don't over-engineer responses to small asks, don't write essays when one paragraph + a diff will do.

## The one persona curveball — don't get spooked by it again

Partway through, the owner switched personas on me: *"ACT AS: Senior Frontend Architect... OPERATIONAL RULES: 1. READ-ONLY AUDIT before changes, provide Impact Report... WAIT FOR MY PROCEED COMMAND."* This wasn't a new collaborator, same owner, same project — just a more formal framing for a *performance audit* request (LCP/Rendering/Scripting profiling numbers, asking for moveend/zoomend de-coupling, rAF batching, frustum culling, dirty-check pattern). I treated it as a real constraint set, did the read-only audit, gave risk-per-constraint, and got back **"so dont proceed anything"** — they were evaluating the idea, not committing to the refactor. That's a fine outcome, not a failure. If you see formal "ACT AS" framing again, it's the same person testing/scoping an idea seriously before deciding whether it's worth the risk — give them the honest risk assessment (I flagged frustum culling as high-risk/low-payoff at only ~110 markers, and they didn't push back on that read) and don't be surprised when the answer is "never mind."

**The sharpest exchange in that whole thread**: they asked "will it improve performance?" about a UX fix (image placeholder cross-fade) and separately about lazy-loading Leaflet itself. Both times the honest answer was **no** — placeholder-first is a *perceived-latency* fix, not a real one (same bytes, same network time, just hides the gap better); lazy-loading Leaflet would actively *hurt* their already-good LCP since the map is the page's primary content and almost certainly the LCP element itself. I said so plainly both times instead of overselling the change. They didn't push back — direct honesty about "this doesn't do what you might assume" is clearly the right register here, not hedging or pitching every change as a win.

## What actually got shipped this session

1. **`loading="lazy"` on the hamburger panel's hero image** (`index.html`) — it's off-screen by default, this was a free, zero-risk win.
2. **Info overlay image placeholder fixed** (`style.css` + `script.js`) — root cause was a **height mismatch**: placeholder was `110px`, image was `max-height: 200px`, so swapping between them caused a visible jump, worse on slow mobile connections where the swap is delayed long enough to *see* the jump happen (owner caught this specifically testing on real Chrome mobile post-deploy, not in devtools — note the pattern, this is the second time this project's mobile bugs only showed up on a real device, see the previous note's viewport-gap bug for the first). Fixed by making `.info-overlay-image-wrap` a fixed `200px` box with both the image and placeholder `position: absolute; inset: 0` inside it, so neither swap can ever change the box size, and crossfading via `opacity` transition instead of a hard `display` cut.
3. **Directions panel: no duplicate endpoints** — `renderDirectionsResults()` now excludes whatever the *other* field currently holds (GPS, location by `id`, map label by `coords` reference) from a field's own dropdown. Started as "prevent picking GPS for both Start and End," then the owner immediately asked "does it also prevent picking the *same location* for both?" — it didn't yet, so I generalized the same exclusion logic to cover all three point types in one pass rather than bolting on a second special case. **Watch for this pattern**: when they ask "does X also cover Y," the right move is usually to generalize the existing mechanism, not add a parallel one.
4. Confirmed (didn't need to change) that selecting "Lokasi Saya (GPS)" in the Directions panel already auto-resolves location without panning the camera — this was already correctly decoupled from `#my-location-btn`'s `focusMapOnUserLocation()` from a prior session. Good reminder: **read the existing code before assuming a gap exists** — I traced `resolveGpsPoint()` → `setDirectionsField()` → `renderDirectionsPin()` → `maybeComputeRoute()` and confirmed none of them touch the camera, then told the owner it already does what they wanted instead of writing redundant code.

## A live discrepancy worth knowing about

The git history shows the **My Location button + mobile FAB stack** (from a prior session, per the old note) was already fully implemented in code, but had never been written up in `CHANGELOG.md` — I added that retroactively this session while updating docs. If you find other shipped-but-undocumented features, it's not necessarily abandoned work; check `script.js`/`index.html` directly rather than trusting the changelog as ground truth for what's live.

## The vibe / how this person works with me (carried forward, still true)

- Casual, lowercase, fast typing, precise about symptoms even when terse ("why i deploy and testing on mobile web, i see significant gap..."). Don't over-formalize.
- For small/medium fixes (this whole session) they skip plan mode entirely — direct request, direct fix, brief explanation. They want to *understand* the fix (asks "why does this happen" before "fix it" almost every time) more than they want ceremony around it.
- They test on **real Android Chrome**, not just devtools emulation — and devtools has repeatedly failed to reproduce bugs they find on a real device (dynamic toolbar/viewport gap last session, slow-network image-swap jank this session). When they report something devtools can't show you, trust it's real and dig for what's different about a live network/viewport instead of doubting the report.
- They ask good follow-up questions that probe whether you've actually solved the root cause vs. patched a symptom ("will it improve the performance?", "does it also cover X?") — answer those precisely and honestly, including "no, that's not what this does" when true.
- Mosque/campus civic-tech context unchanged — real public tool, Terengganu, UniSZA Gong Badak. Still load-bearing, still not a toy.

## Mood at handoff

Easy, low-friction session. No bugs that fought back, no wrong turns. The closest thing to a "moment" was catching myself about to answer a performance question with corporate-speak ("X will improve Y") when the honest answer was "no it won't, here's what actually would" — worth staying alert for that temptation generally: this owner would rather hear "this doesn't help" than a vague positive spin.

## Immediate next steps if this is still open

1. None of this session's changes have been pushed to remote — `beta` is fast-forwarded locally to `dev`'s commit, but ask before pushing.
2. The duplicate-endpoint exclusion logic (#3 above) is untested in a real browser — written and `node --check`'d only, like most of this codebase's recent history. If the owner reports the GPS/location dedup *not* hiding an option correctly, check `renderDirectionsResults()`'s `otherField` comparisons first — the map-label check relies on reference equality (`otherField.coords === label.coords`), which holds because `setDirectionsField` never clones the array, but if that ever changes, this comparison silently breaks (same class of bug as last session's `pane: undefined` — a correctness assumption baked into object identity, not value equality).
3. The architect-persona performance audit (moveend/zoomend, rAF batching, frustum culling, dirty-check) was scoped but explicitly **not implemented** — if the owner comes back wanting to actually do it, the Impact Report from that thread is the starting point, not from scratch. Frustum culling specifically: flagged as the riskiest, lowest-payoff item at this marker count (~110) — push back gently if they want to start there.
