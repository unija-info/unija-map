# DEV_NOTES — kgb/map/

Not documentation. This is a note to my next self, written right as context is about to run out. If you're reading this, you're me, a few hours or days later, with no memory of any of this. Read it like you're catching up with yourself, not onboarding onto a stranger's code.

> **Session log, 2026-10-21 — alias search (`alias` + `Anda maksudkan 'X'?`, code.gs v1.3.1).** Owner's Sheet is live source; asked for a fallback-name column for old/variant names, multi-alias handling, "Anda maksudkan" hint line, a human-only counter column, and a script version stamp. Shipped all local on `beta`, unpushed. Follow-up: owner asked if rows near the bottom summary block are safe for new items → hardened sync to skip number/place-blank rows (drafts + summary block auto-excluded). Everything below the 2026-10-20 line is older context, still worth reading once.

> **Session log, 2026-10-20 — route-animation saga: lock lift, marching ants → walker dots, walk/drive, curved tails.** Everything above this line is older context, still worth reading once.

---

## Checkpoint — 2026-10-21 (alias search; code.gs v1.3.0; human No-column)

## Checkpoint — 2026-10-21 (alias search; code.gs v1.3.0; human No-column)

Branch `beta`, all local + unpushed. Owner flow: Plan mode ON for the design discussion (column name, multi-alias commas, hint wording, counter column), then plan lifted with "ok go, but on the code.gs add the script version" → implemented.

What shipped (`?v=html39→html40`, style `html16→html17`):
- Sheet contract: new `alias` column (comma-separated old/variant names, search-only); human `No`/`Bil` counter column allowed and ignored. Owner still needs to ADD the `alias` column in the Sheet + re-run `Update Website Data` — current JSON has no `alias` yet, code treats missing as ''.
- `code.gs` v1.3.0 (both copies: `kgb/data/code.gs` + `gsheetscript/kgb-map/code.gs`): `SCRIPT_VERSION` stamped in confirm/success dialogs + commit message; `REQUIRED_HEADERS` +`alias`; blank-row check now looks at required columns only (stray `No` can't resurrect dead rows).
- `kgb/map/script.js`: `matchLocationsByTerm()` matches `alias`; `getMatchedAlias()` returns single matched nickname; `renderSearchResults()` + `renderDirectionsResults()` show `Anda maksudkan 'X'?` (`.result-alias`); style added.
- `kgb/script.js` + `kgb/beta/script.js`: filter matches `alias`; cards show `Anda maksudkan 'X'?` (`.location-alias`, `textContent` so quotes safe).
- Docs: root `CLAUDE.md`, `kgb/map/CLAUDE.md`, `README.md`, `feature.md` (BM), both CHANGELOGs.

Verified: `node --check` x3 clean, harness ALL GREEN, local server 200 with html40/html17 tags, alias helper logic tested (multi/comma/case/empty/missing all correct).
Blind spots: no browser here — owner to verify on real phone (checks below). If hint line never appears, first suspect is stale JSON (no `alias` field until Sheet re-sync), not the JS.

## Checkpoint — 2026-10-20 (route-animation saga → walker dots; lock lift; walk/drive; curved tails)

Branch `beta`, everything below UNCOMMITTED and unpushed (6 modified files, ~460 added lines, mostly `script.js`). Nothing deployed — smoke only via local `python -m http.server` (200s) + `node --check` + harness ALL GREEN each round. Owner tests on real Android Chrome via Five Server; actual user, terse messages, screenshots + `?debugpage` pastes as ground truth.

Headspace: this was the longest blind-debug arc in this file. Plan mode flipped on/off ~4 times mid-session (system reminders, not owner choice) — "go" always meant implement now. Owner cooperates with decisive asks: once pointed at `?debugpage`, they pasted JSON unprompted every round, and that JSON (not my theories) cracked each step. When I asked "which looks weird" with options they answered "i will show" and sent 4 screenshots — better than any option. Match that: ask for the artifact, not the interpretation.

What shipped (all local, `?v=html24→html39`, style `html12→html16`):
- Campus lock lifts on demand (MaxBounds drops when GPS/route outside, restores inside)
- Route animation v1: white dash crawl → too fine/slow → bigger/faster → dash layer missing on-device → per-layer heal → full registry rebuild (fresh id) → still silent no-op → walker dots (HTML markers) → dot train → rotation ticks → back to small slow dots (final: 7px flat, ~12m, ~14s loop)
- `config.json route:{loopSeconds,dotSpacingM,dotMax,dotMaxSpeedMps}` + `?testroute=1` demo route
- Speed cap (fixed loop scaled speed with distance; far GPS teleported)
- Walk/Drive toggle (`routed-car` driving profile, persisted, readout `(memandu)`)
- Curved dotted tails: bezier lead-in/out, blue line ends at snap, dots flow over tail path
- Debug proof plumbing: `APP_VERSION`, `state.route{anim,dashLayer,dashArray,missFrames,heals,verify,addErr,dot,speedMps,tailsM,loopS,spacingM}`, boot counter

Bugs + lessons:
1. **Canvas dash silent no-op (UNRESOLVED, biggest item):** `addLayer` for the dash id never threw yet the layer was absent on immediate sync re-read — across two ids, through full source+layer teardown/rebuild, while sibling solid layers rendered. Cause never found. Lesson carved: when a canvas primitive fails silently on-device, reroute through a proven renderer (HTML markers) after ONE verify round — do not spend six rounds on layer surgery. Always add immediate-verify (`!!getLayer` right after add) + debug counters BEFORE theorizing; the `addErr:"(silent no-op…)"` readout ended all guessing in one paste.
2. **Ticks twist in 3D:** screen-space billboards + map-plane bearing math breaks under pitch. Rotation-invariant markers (dots) dodge the entire class — prefer them whenever orientation isn't load-bearing.
3. **Poller `tries:34` vs 12-cap:** impossible in current code with single init; boot counter added (`?debugpage` `boot`) to settle multi-init — owner hasn't reported it yet. Don't chase without that number.
4. **Fixed loop time ⇒ speed scales with distance:** cap speed, not time (`dotMaxSpeedMps`).
5. **CHANGELOG discipline:** replace-instead-of-append slip happened TWICE this session (walk/drive and speed-cap bullets ate the previous entry; both restored). Append-only, re-read after every docs edit.
6. **Stale-snapshot trap (twice):** owner's `?debugpage` paste once predated their route draw (`route:false` + blue line visible), and `state.route` reads `false`/empty until a route is actually drawn. Always confirm the snapshot was taken with the subject on screen.

Open threads (owner-side vs next-build):
- NOTHING pushed — offer commit/push of beta pile; owner hasn't asked.
- Canvas dash creation bug still open (low priority now; dots carry the animation).
- Boot-count + `tries` mystery open, pending owner's `?debugpage` `boot` readout.
- Frustum/rAF performance audit from before: still parked, still low-payoff at ~110 markers.

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

---

## Session 2026-10-19 — MapLibre 3D migration + the marker saga (beta, UNPUSHED)

### Where we were

Branch `beta`, checked out fresh from `origin/beta` at `a692ce1`. Everything below is **uncommitted local work on `beta`** — `git status` shows 5 modified files (`index.html`, `script.js` ~+760/−540, `style.css` +120, `CHANGELOG.md`, `CLAUDE.md` header note). Nothing pushed, nothing merged. The owner asked for it in stages across one long session with several Plan-mode interludes, and every single visual claim below was verified by THEM on real devices (desktop Five Server + real Android Chrome), never by me — I have no browser here, only `node --check`, spec validators, and served-file fetches. Internalize that: you cannot see this map. They are your eyes. Trust their screenshots over your theories (more on that — it burned us twice).

### The shape of the session (read this before the technical list)

It started as project Q&A ("what do you understand"), turned into a feasibility chat about OpenFreeMap 3D (Plan mode), then "ok go" — and from there it was a **bug-hunting marathon**, not a feature arc. The owner fires short observations with screenshots ("marker is scattered", "still not fixed", "all marker gone? why"), I diagnose, they test. Fast rounds, terse messages, high signal. Match that energy: diagnose first, minimal diff, brief explanation, one concrete thing for them to check.

Two process notes that matter more than any code detail:

1. **Plan mode whiplash is normal now.** This session flipped in/out of Plan mode ~6 times (system reminders, not the owner's choice half the time). When restricted, I discussed only and said "switch agents to implement" — they always just said "go". Don't lecture about modes; just respect the current one and move fast when it lifts.
2. **My early theories were wrong THREE times and their screenshots kept correcting me.** I blamed pitchAlignment (wrong), then HTML-vs-canvas architecture (wrong direction), then data/viewport (wrong) — each time a screenshot disproved it. The actual root cause (below) was found by *staring at their screenshots until the pattern confessed* (number-order marching), not by reasoning from code. Lesson carved in stone: **when remote and blind, the screenshot is ground truth and your mental model is the suspect.** Say "I don't know yet, here's the decisive test" instead of shipping a theory-fix.

### What got built (in order)

1. **Leaflet → MapLibre GL JS, OpenFreeMap `bright` 3D vector as default** (`index.html`: maplibre-gl@4.7.1 CDN; `SATELLITE_STYLE` inline Esri+ Carto style object for the satellite toggle). 3D buildings via `fill-extrusion` on the `openfreemap` planet source. Default pitch started 45, lowered to **30** after the parallax complaints. Satellite toggle kept (`Paparan Satelit` checkbox, now unchecked-by-default), plus a new `Peta 3D (bangunan)` pitch toggle. `kgbMapBaseLayer` legacy `'osm'` migrates to `'vector'`.
2. **Foot routing** — Directions panel moved from `router.project-osrm.org/driving` to FOSSGIS `routed-foot` (`routing.openstreetmap.de`), readout `(jalan kaki)`. Route/boundary/GPS-accuracy are GeoJSON sources re-added on `style.load`.
3. **Debug tooling** — deleted the always-on Zoom div. `?debug=1` = live camera chip (zoom/pitch/bearing/center/pins). `?debugpage` = full overlay (camera, data incl. no-coords list, pins, state, prefs + copy-state/clear-prefs/reload). Both survive navigation because `updateURL()` only touches `?type=`/`#hash`. Noisy `[pins-html]` logs gated behind the flags. Style/script tags now cache-busted (`?v=html8`).
4. **Marker saga, final state: badge-only HTML markers, `anchor:'center'`, NO inner popup.** Shared external `#pin-popup` (mini name on desktop hover, full on click; mobile tap → overlay directly). Dots below zoom ~17, badges above, priority categories always badges. Floating stems were built then KEPT (badge-on-stem, stem shown only when `body.is-pitched`, popup lift adapts) — wait, no: check current code before assuming. The stem work landed (`v=html7`) AND the circle-badge revert (`v=html6`→chips→circles) — final state per git is circles WITH stems (pinBadgeHTML returns badge + `.ml-stem`). Yes: circles on stems. Hover mini-popup restored. Fat-tap `::after` hitbox on dots. `text-font` fixed to exactly `['Noto Sans Bold']` after the style JSON proved the combined stack 404s.

### THE bug (read twice, never repeat it)

`.ml-marker { position: relative }` in MY appended CSS beat MapLibre's own `.maplibregl-marker { position: absolute }` — equal specificity, later stylesheet wins. Elements stayed in flow layout inside the marker container, so each marker's translate transform ADDED onto its flow slot instead of replacing it: marker N rendered at (true point + N × row height downward). Km-long number-ordered marches (A13/A14 *south* of A9 despite being north in data — the tell-tale inversion), detached popups (popup uses pure `project()`, correct; badges shifted). It also explains the ORIGINAL "drift on pan/zoom" — panning recomputed translates against static flow slots, so pins swam non-rigidly. I chased pitchAlignment, canvas-vs-HTML, data drift, and viewport/resize theories first. All wrong. The screenshots proved it: screen order = file order, not coordinate order.

**How to never repeat it:** any third-party class you style (`.maplibregl-*`, `.leaflet-*`) — YOUR rule with equal specificity silently wins by load order and breaks positioning assumptions you can't see. Either use `!important` deliberately (as the fix does: `position: absolute !important; top: 0; left: 0`), or don't touch positioning properties at all. And when markers misplace in ORDER (not offset), think flow-layout contamination before anything else. The A13/A14-north-of-A9 inversion test is now the canonical check — it's even in the CHANGELOG.

### Smaller bugs, same session

- **Canvas pins invisible** (the detour): layers 6/6 created, 113 features in memory, `querySourceFeatures` = 0, zero errors. Never root-caused — abandoned for HTML v2 rather than solved. If anyone proposes canvas pins again, that mystery is still open; the console evidence is in this chat's screenshots (layers exist + source empty + font 404 in one frame).
- **Font stack 404**: `['Noto Sans Bold', 'Noto Sans Regular']` requested as one combined `{fontstack}` path — OpenFreeMap only serves the exact stacks its styles use. Verified against the live `bright` style JSON (only Italic/Regular/Bold singles). Lesson: never invent a font stack; copy one verbatim from the style JSON you're actually loading.
- **`render_height` null**: buildings without height tags → `Expected number, found null` every frame. Fixed with `coalesce(..., 8)` / `(..., 0)`. Lesson: OSM-derived properties are ALWAYS nullable — wrap every data-driven numeric in `coalesce`.
- **Layer-bound event registration** (`map.on('mousemove', '<layer>')` before the layer exists) replaced with canvas-level hit-testing, then deleted entirely when pins went HTML (elements handle their own events). Lesson: never bind map events to layers that don't exist yet at bind time.
- **Silent-success logging gap**: the canvas era logged failures but not success, so "no errors" told us nothing for a full round. Now every path logs success (`[pins-html] markers mounted: N`). Lesson: log the happy path too when debugging blind.

### Owner dynamics (update to the standing notes)

- Still terse, still precise, still real-device-first — but this session they also supplied **ground-truth artifacts unprompted** (the original Leaflet satellite screenshot ended the data-vs-renderer debate instantly; their parking-chip reference images defined the design better than words could). When they send a reference image, treat it as the spec.
- They correct themselves out loud ("my mistake.. dont use pill") — no ego, just signal. Match it: when YOUR theory dies, say so in one line and move on. They never punished a wrong theory, only slowness.
- They say "go" to mean "implement the plan we just discussed." Don't re-ask.
- Commit/push discipline: I never committed anything this session (all uncommitted on `beta`). They haven't asked for a push. Don't push without being asked — but DO offer it at handoff, since `beta` now diverges ~1000 lines from origin.

### Mood at handoff

Tired but warm. This was the hardest debugging session in this file's history and the fix turned out to be one CSS rule — the classic ratio. The owner's last messages show trust ("ok i think we need to park here" = satisfied enough to pause, not frustrated). Park cleanly: everything's written up, nothing's pushed, next session starts with THEIR test results (pitch-0/stem check, ?debugpage readout, A13/A14 order check), not our theories.

### Immediate next steps

1. **Await owner test results**: tilted P1 stem check (does 26px clear the roof?), `?debugpage` camera readout at the bad angle, A13/A14-vs-A9 order check.
2. **If stems fall short on tall roofs**: phase 2 = height-aware lift from `render_height` per pin (scoped in chat, not built).
3. **Offer to commit + push `beta`** (or squash first — 1000-line uncommitted diff; ask which). → DONE 2026-10-19 (push `9259df2`); parking commit for the mask/config/stems/debug/docs pile is item 1 of part 2 below.
4. **Stale docs flagged, not all fixed** → DONE 2026-10-19: root `CLAUDE.md` beta pointer, `kgb/map/README.md` features/tech-stack refresh, root `AGENTS.md`, `kgb/map/feature.md`, root `CHANGELOG.md` beta section.
5. Open threads from before this session (§1–3 above) are still open.

---

## Session 2026-10-19, part 3 — detail overlays (footpaths/sports/parking) on 3D vector (beta, UNPUSHED)

Owner: reference image was spec for detail density, not exact look — "just want to see footpath, parking and else, now no footpath". Root cause: `bright` base paints `transportation/class=path` as faint `#cba` dashed and styles NO `landuse` pitch/track/stadium/playground or parking layers (verified against live style JSON), so campus walkways and courts were invisible.

Shipped: `addDetailLayers()` in `script.js` (reddish `detail-path`, green `detail-sport-fill/line`, pink `detail-parking` for `service=parking_aisle`), called in `ensureCustomStyleLayers()` before buildings + mask so extrusions stay on top and outside dim still covers; `detail:{...}` knobs in `config.json` with type-checked fallbacks; `?v=html20` bump; CHANGELOG/feature.md updated. Verified: `node --check` clean, served 200 + config fetch, harness ALL GREEN (harness stub has no vector source so details skip silently — no coverage there yet).

Open threads: road-contrast (dark casings like ref) deliberately NOT done — say so if asked. Still unpushed on `beta` — don't push unless asked.

Update (same day, later): pink `detail-parking` removed per owner (it painted internal driveways pink) — layer block + `parking`/`parkingColor` knobs deleted from `script.js`/`config.json`, with one-time live-session cleanup; bumped `?v=html21`. Then opacity knobs added per owner: `pathOpacity`/`sportOpacity`/`sportLineOpacity` (owner had hand-set path to 0.5 mid-session — kept as default). Then running `track` split from sport green into own tartan `detail-track-fill` (`trackColor`/`trackOpacity`); bumped `?v=html23`. All verified `node --check` + harness ALL GREEN each round. Owner closed with "good". Parked clean.

---

## Session 2026-10-19, part 2 — mask saga, stems, config, debug tools, parking (beta, UNPUSHED)

### The one-line summary

Pins verified on buildings, boundary verified, dim veil verified working via `?debugpage` (`maskDimLayer: true`) + screenshot. Everything below that point in this file held up; what follows is what happened after.

### Mask: `within` is unusable for polygons (proven, not theorized)

Wanted: hide 3D extrusions outside the boundary. Used `['within', campusPolygon]` on the fill-extrusion layer — inside buildings went flat while outside ones kept extruding, exactly inverted from intent. Installed `@maplibre/maplibre-gl-style-spec` locally and read the implementation (`Within.evaluate`): Point → check, LineString → check, **everything else → `return false`**. Building polygons can never match. Verified empirically too (evaluated an inside point: false — then found the harness was fine and the implementation was the answer). Reverted the filter to plain `hide_3d`, removed the dead `hideOutsideBuildings` knob from `config.json` and code, kept dim + pan restriction as the achievable focus effect. If anyone proposes `within` again, point here.

### The dim that wouldn't appear (and what actually fixed it)

First veil (near-white `#f4f1ec` @ 0.35) was camouflage on an already-paper map — switched to grey `#868c96` @ 0.45 plus a `dimColor` knob. Then `maskDimLayer: false` persisted across rounds *despite correct code*: layers 6/6-style checks passed, data present, no errors. Root-caused as partial-state creation (source exists ⇒ layer creation skipped forever) — fixed with per-component idempotent ensure, same lesson as pins. When that still read false, added `maskLastRun`/`maskLastError` + a 1s×12 poller that builds the layer the moment creation is possible and reports `maskPoll: {tries, lastError}`. The poller caught it on try 1. Lesson generalized: **any create-if-missing guarded on a *different* object's existence will strand partial states** — guard each component on itself.

### Headless harness (`kgb/map/harness.debug.js`, KEPT)

First real test in this repo: executes the actual `script.js` boot against a fake Map + DOM stubs, both load orderings (style-first and data-first), asserting boundary/mask/pins creation. ALL GREEN on the code the owner couldn't get working — which proved the bug was environmental/ordering on-device, not logic. Kept as a regression tool (see AGENTS.md). Its own stub bug found along the way: Node ≥22 has getter-only `navigator`, and `window.location` needs an explicit `hash` or `handleDeepLink` throws — both fixed in-file.

### Stems + pitch default + config (all live, owner-verified pattern as usual)

- Default pitch 45 → **30** (less parallax drama, still clearly 3D).
- Floating pins: badge-on-stem, stem only when `body.is-pitched` (threshold from config), popup lift adapts. Open question carried forward: 26px stem vs tall roofs — phase 2 height-aware lift scoped, not built.
- `kgb/map/config.json` now owns view/pins/stem/base/mask knobs, fetched pre-boot with type-checked merge + 2.5s cap. Always verify with `python3 -c json.load` + serve-fetch after editing.
- `?debug` chip + `?debugpage` overlay (slide-hide, top-right tab, pausable/selectable JSON, Esc collapses). Old zoom div deleted. Asset cache-busts now at `?v=html19` — bump on every shipped asset change, phones cache aggressively.

### Status at park

Owner confirmed via screenshot + `?debugpage`: pins on buildings, boundary visible, dim veil visible outside the blue line. Uncommitted pile on `beta` since push `9259df2`: mask/dim/poller/config/stems/debug/docs. Next session starts with owner tuning impressions (`dimOutside`/`dimColor` taste), NOT with theories.
