# DEV_NOTES — kgb/map/

Not documentation. This is a note to my next self, written right as context is about to run out. If you're reading this, you're me, a few hours or days later, with no memory of any of this. Read it like you're catching up with yourself, not onboarding onto a stranger's code.

---

## Where we just were

We're on branch `beta`. The user (let's call them the owner — runs unija.info, building campus maps for UniSZA Gong Badak solo or near-solo, in Malay, very hands-on) and I just shipped two back-to-back feature arcs in one long session:

1. **GPS + OSRM experiment** — live blue-dot tracking, single-button "route from me to here" using the public OSRM demo server (driving profile only, no walking profile available on the free tier — accepted tradeoff, flagged everywhere as "(Eksperimen)").
2. **A full Directions rebuild** — the owner came back and said, paraphrased: "can we use start/end like Google Maps, pick from page or list, check my approach and ask me questions before building." That second one is what we just finished. It **replaced** the single-button thing from arc 1 entirely — don't get confused if you see both described somewhere, the single-button one is dead, "Dapatkan Arah" + the two-field panel is what's live now.

## The one thing that'll bite you if you forget it

**`pane: undefined` in Leaflet is not "use the default pane." It's "this marker never appears in the DOM, silently, forever."**

This was the real plot twist of the session. The owner reported "marker doesn't highlight when I click the list." I went down the wrong path first — assumed it was a missing wiring gap (`setMarkerHighlight()` never called from `filterByLocation`/`showLocationOnMap`), fixed that, felt good about it. Owner came back: "still broken, and main branch has this working fine, beta doesn't." That sentence is what cracked it open — they explicitly told me to stop trusting my own diagnosis and go compare against the known-good branch. `git diff main beta` showed it: `pane: exempt ? undefined : 'campusMarkerPane'`. Passing `pane: undefined` explicitly sets it as an *own property* on the options object, which **shadows** Leaflet's prototype default instead of falling through to it. `map.getPane(undefined)` finds nothing. Marker exists in memory, never touches the DOM. Completely invisible, no error, no warning.

Fix pattern, and use it everywhere from now on: never write `pane: cond ? 'x' : undefined`. Write `const opts = {...}; if (cond) opts.pane = 'x';` — only set the key when you actually want it set.

**Takeaway about the owner, not just the code**: when they say "X branch worked, Y doesn't," that's not a vague complaint — it's a precise pointer to *go diff the branches*, and it'll be faster than re-deriving the bug from first principles. Trust that signal immediately next time, don't spend a round re-investigating your own first theory first.

## The vibe / how this person works with me

- Casual, lowercase, occasional typos ("highlited", "woring") — don't read that as low-effort or unclear. They're precise about what's broken, just typing fast. Match their energy: don't over-formalize responses.
- They explicitly invoke plan mode for anything non-trivial and *want* to be asked clarifying questions before code gets written — see their literal instruction: "check if my approach is good... ask me question to better understand... do not generate answer unless I allow it." This isn't boilerplate to skip past. They read the AskUserQuestion options and pick deliberately (mostly "(Recommended)" but not always — when they want something specific, like map-click point selection, they'd have said so, and the fact they took the simpler "search + GPS only" option both times tells you they value simplicity over feature-completeness here).
- For small, obvious follow-ups (label rename, "can we add distance display", route glow/dash) they skip plan mode entirely and just say what they want — direct implementation is fine and expected for those.
- They care about **Malay-language UX text** being right — "Arah Dari Lokasi Saya" → "Arah" wording nuances matter, "(Eksperimen)" suffix is doing real communicative work (setting expectations that driving-profile routes on a walking campus will look weird). Don't drop that suffix casually.
- Mosque/campus civic-tech energy throughout — this is a real public-facing tool people in Terengganu use to find buildings, not a toy project. Treat copy, accuracy, and not-breaking-things-for-real-users as load-bearing concerns, not formalities.

## Current state of the code (as of this note)

- `directionsStart`/`directionsEnd` hold `{ type, coords, label }` snapshots — **not** live references to GPS. This was a deliberate decision so that toggling the GPS hamburger switch off mid-route doesn't nuke an active Directions route. If you ever see the route disappearing when GPS toggles off, check the `directionsModeActive` guard in `setUserLocationVisible(false)` first — that's the seam.
- `directionsPinPane` (z-index 700) sits above everything — `campusMarkerPane`(600), `userLocationPane`(650), `routeLinePane`(450, intentionally *below* markers so the route ducks under pins).
- `matchLocationsByTerm()` is shared between the main search bar and the Directions field dropdowns — if you add a new search filter dimension, add it there once, not in two places.
- The Directions panel and the search bar are mutually exclusive and occupy the same screen real estate (`.directions-hidden` class toggle) — they're visually one slot, not two separate UI elements stacked.
- I did NOT get to manually test this in an actual browser — no dev server was spun up, no real GPS permission flow was exercised. `node --check` passed (syntax only). **If something about the Directions panel feels off when you/owner actually click through it, that's the first place to look — it's unverified beyond syntax.**

## Mood / energy at handoff

Good momentum, no open arguments or unresolved tension — the pane bug was the only real "ugh" moment and it got resolved cleanly once the owner redirected me to the branch diff. This session had a satisfying arc: experiment → bug hunt → bigger feature ask → plan-mode back-and-forth → clean execution. If the next message picks up mid-feature, you're not walking into anything messy. If the owner opens with something terse like "still doesn't work" — don't assume your last fix was wrong by default, but also don't be precious about it; ask what branch/state they're comparing against, the way they taught you to this time.

## Immediate next steps if this is still open

1. Actually serve it locally and click through the Directions panel verification checklist in `CLAUDE.md` §3e / Manual Testing Checklist — this has never run in a real browser yet.
2. Test on mobile width specifically — the panel's mobile CSS override mirrors the search bar's but was never visually confirmed.
3. Watch for the swap-button double-`maybeComputeRoute()` call (it fires once per field set during a swap) — functionally harmless but if OSRM rate-limits ever become a problem, that's a place to debounce.
