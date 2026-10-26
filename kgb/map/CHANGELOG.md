# Changelog — Peta Kampus UniSZA KGB

All notable changes to `kgb/map/` are documented here.

---

## [Unreleased] — MapLibre 3D Vector + Walk Routing

### Added
- **Alias search (`alias` + `Anda maksudkan 'X'?`)** — new Sheet/JSON column `alias` (comma-separated old/variant names, search-only, `code.gs` v1.3.1); `matchLocationsByTerm()` + hub list filters match it, and search/directions results plus hub cards show the single matched nickname as `Anda maksudkan 'X'?` via `getMatchedAlias()` (`.result-alias` / `.location-alias`) — old names stay findable without renaming places; sync skips rows with blank `number`/`place`, so drafts and the manual summary block never pollute the JSON
- **Alias hint reworded + suggest-location placeholder** — alias line now reads `Juga dikenali sebagai 'X'` (search, directions, hub cards — `.result-alias` / `.location-alias` unchanged); empty search shows `Tiada hasil ditemui` + inert `📍 Cadang Lokasi` button (placeholder `data-placeholder="cadang-lokasi"`, no navigation — form/Sheet wiring later); `?v=html40→html41`, style `html17→html18`
- **Selected-pin highlight fixed** — removed the stale Leaflet-era `.marker-highlighted > div` rule that drew a white rounded box around the whole badge+stem slot; highlight is now the badge/dot ring only, plus a `scale(1.15)` pop on the selected badge; style `html18→html19` (script untouched)
- **Selected building tints teal (Stage 2)** — `setMarkerHighlight()` now also copies the building footprint under the pin (via `queryRenderedFeatures` point query, `sourceLayer === 'building'` match) into our own `selected-building` GeoJSON source with a teal `fill-extrusion` (`#0aa08b` @ 0.55, true `render_height`/`render_min_height`) + outline; single hook covers all select/deselect paths, geometry cached for satellite-toggle style reloads, silent no-op for non-building pins; state in `?debugpage` (`pins.building {layer, found, height, err}`); `?v=html41→html42`
- **Building-highlight fix: one member only (`?v=html43`)** — `found:1` yet the whole campus tinted meant the single queried OSM feature is a MultiPolygon relation spanning many blocks; `pickBuildingFootprint()` now keeps only the member polygon containing the pin (nearest-centroid fallback), debug extended (`gtype/members/picked/count`)
- **Building-highlight anti-flicker (`?v=html44`)** — identical footprint+height meant the teal shell and base building shared every plane (z-fighting speckle while moving/zooming); `expandFootprint()` pushes the ring ~0.4m outward from its centroid and lifts the roof `+0.4m`, so no face is ever coplanar (holes untouched); geometry helper unit-checked in node (closed ring, contains center, expands)
- **Building highlight now survives search select (`?v=html45`)** — search/list selections queried while the camera was still zoomed out (tiles unrendered → `found:0`, owner-confirmed in `?debugpage`); each selection now gets one retry via `map.once('idle')` after the camera settles (`scheduleBuildingRequery()`, gives up until next selection — no loops)
- **Building query hardened: box fallback (`?v=html46`)** — exact-pixel query can miss at extreme pitch (owner at pitch 70: wall occludes the ground point); on a miss the code retries with a ~10px box around the pin and takes the first building feature; debug gains `zoom/pitch/triedBox` so the next paste distinguishes tile-timing from pixel-miss
- **Building retry unified across all paths (`?v=html47`)** — owner's all-null `pins.building` proved the query never ran: guard-bails (map/style not ready, e.g. search-tap or deep-link at boot) never scheduled the idle retry, unlike `found:0`. Guards now schedule the same one-shot retry; debug gains `lastBail` (`nomap/nostyle/noqueryfn/nolayers/noloc/miss`) so the next paste names the saving path
- **Building tint pops in mid-flight (`?v=html48`)** — the tint waited for `idle` (camera stopped) because destination tiles only exist then; now a bounded poll (8 × 250ms) retries while flying so the tint appears the moment tiles arrive, with clean handover if the selection changes; self-terminating, no loops
- **Pin mode-swap softened (style `html19→html20`)** — tier changes rebuild the slot DOM instantly, so fresh badge/dot/stem nodes now play a 180ms `pin-pop` (grow from stem foot; selected pins pop to their 1.15 ring scale); transform-only, `prefers-reduced-motion` respected; script untouched
- **Badge ride + no-replay tiers (`?v=html49`, style `html21`)** — badge jumped because the stem took layout space in one frame: stem is now always in DOM with `height 0→26px` + 200ms transition, so the badge rides up smoothly (reduced-motion respected). `refreshPinTiers()` memoizes per-pin mode (`rec.mode`) and skips unchanged pins — no more mass pop-replays; zoom threshold gains ±0.15 hysteresis so boundary wobble can't flip-flop dot↔badge; hover-upgrade skips already-full pins
- **Boundary interior fill moved to config (`?v=html50`)** — `campus-boundary-fill` was hardcoded blue `#1967d2 @ 0.07`; now `mask.boundaryFillColor` + `mask.boundaryFillOpacity` in `config.json` (type-checked, `0` = off), same pattern as the other knobs
- **Campus boundary refreshed from OSM (`?v=html51`)** — `kgb/data/campus-boundary.json` re-pulled from OSM Way 1120569731 (v9, 88 points vs stale 46) after the owner's OSM area update; same `[[lat,lng]]` closed-ring format, ID unchanged so code/docs refs hold; boundary fetch now cache-busted (`?v=Date.now()`, same as live data) so phones can't sit on the old ring; mask hole, pan lock, line + fill follow automatically
- **Boot loader overlay (`?v=html52`, style `html22`)** — cold/hard-refresh loads showed a blank beige map while tiles + data arrived; a branded overlay (title + spinner + "Memuatkan peta…", own element at z-index 2500 below `?debugpage`) now covers the wait and fades when first map `idle` AND pin data are both ready; 10s JS safety + 15s CSS failsafe + hide-on-data-error guarantee it never sticks; reduced-motion respected
- **Versions visible in loader + menu (`?v=html53`, style `html23`)** — `paintVersionLines()` writes `Kod: htmlXX` immediately at boot (boot loader, both menus) and upgrades to `Versi: <release> · Kod htmlXX` once the release resolves; a glance now proves fresh code vs stale cache
- **Connected-complex tint (`?v=html54`)** — member-picking left multi-block buildings half-grey (e.g. A3 dewan); `pickBuildingFootprint()` now flood-fills touching members (shared edge/vertex within ~0.6m) so the whole connected complex tints while far-flung relation members stay grey; `expandFootprint()` handles MultiPolygon; debug gains `linked`; touch logic unit-checked in node
- **Name-aware cross-feature tint (`?v=html55`)** — two connected-but-distinct halls (DABS vs Dewan Perdana) are separate OSM features; flood-fill now spans features but only links missing-or-same OSM `name` as the seed, so neighbours with different names stay grey; stale tint clears the moment selection changes (cache tagged by location id); `count` redefined as polygons-in-tint; name rule unit-checked in node
- **3D vector map (default)** — engine swapped from Leaflet raster to MapLibre GL JS on OpenFreeMap `bright` vector style; campus buildings extrude in 3D (`fill-extrusion`, `pitch: 45`) with a compass/pitch NavigationControl. New `Peta 3D (bangunan)` toggle in the hamburger `Paparan Peta` section (`localStorage.kgbMapPitch3D`)
- **Satellite kept as toggle** — Esri World Imagery + Carto labels now a MapLibre style switched via the existing `Paparan Satelit` checkbox (unchecked = 3D vector default); legacy `kgbMapBaseLayer === 'osm'` migrates to vector
- **Walk routing (jalan kaki)** — Directions panel now routes via FOSSGIS `routed-foot` (`routing.openstreetmap.de`, foot profile, no key); readout is `X.X km · Y minit (jalan kaki)`; route renders as glow/base/dash line layers that drape over the 3D map
- **Category pills top bar (`?v=html56`, style `html24`)** — Google-Maps style pill row (short labels + category color dot) beside the search bar on desktop, below it on mobile; taps call the existing `filterByCategory()` toggle (tap again = reset), active pill inverts, state syncs with sidebar/`?type=` deep links, hidden while Directions is open
- **Pitch capped at 68.5 (`?v=html57`)** — pitch 70 showed a sky/horizon band across the top of the viewport (style defines no sky/fog, so MapLibre paints its default atmosphere above the horizon); `maxPitch` + default `pitch3D` now `68.5` in `config.json` (built-in fallback matches), and the config fetch is cache-busted like the boundary file so phones pick it up
- **Pills: `Semua Kategori` + scroll hint (`?v=html58`, style `html25`)** — first pill resets to all locations (active when no category selected, synced with `?type=` deep links); edge fades mark the scrollable ends (fade hides at the reached end via `syncPillFades()`); mobile plays a one-time 48px scroll nudge ~900ms after load (skipped if already scrolled, content fits, or reduced-motion)
- **Sidebar hidden by default on desktop (`?v=html59`)** — map-first load, `initDesktopSidebar()` starts collapsed (search/pills/directions/padding all follow the existing `.collapsed` selectors); `>` button expands, boot loader covers the transition
- **Tier-1 icon rail, step 1 (`?v=html60`, style `html26`)** — slim 64px desktop rail (hamburger, my-location, directions, layers) replaces the `>` expand + header collapse buttons and the desktop my-location FAB (mobile FABs untouched, rail hidden on mobile); sidebar shifts to 64–400px so search/pills/padding offsets are unchanged; rail buttons delegate to the existing handlers with active-state sync
- **Rail buttons remapped (`?v=html61`)** — hamburger opens the settings/info panel (same as the search bar `≡`), layers icon toggles the category/location panel
- **Tier-3 detail card (`?v=html62`, style `html27`)** — location info is now a floating 380px card beside the list panel (below search, `tier3In/Out` nudge), not a cover over it; desktop node reparents to `.app-container` via `placeInfoOverlay()` (also on breakpoint-crossing resize), mobile stays in the bottom sheet untouched
- **Tier-3 docks to rail when panel hidden (style `html28`)** — card slides to `left:76px` via `.sidebar.collapsed ~` when the list is closed, back to `412px` when open (CSS only, animated)
- **Rail directions button removed (`?v=html63`)** — rail keeps menu / my-location / layers; Directions stays in the search bar (desktop), FAB (mobile), and `Dapatkan Arah` cards
- **Version label fixed (`?v=html64`)** — loader + info menu showed stale `html55` because `APP_VERSION` wasn't bumped with the `?v=` param; now `html64`, and `?v=` moved with it so cached phones refetch
- **`Dapatkan Arah` no longer auto-GPS (`?v=html65`)** — panel opens with End = tapped location, Start empty (user picks place/label/GPS row); no surprise permission prompt
- **Location card redesigned, phase 1 (`?v=html66`, style `html29`)** — Google-Maps style: photo, title + category chip, circular action row (Arah / Maps / Kongsi, same handlers), icon detail rows, `Cadang pembetulan` link to the report form; `feature.md` updated
- **Location card hero image (`?v=html67`, style `html30`)** — 240px photo with number + name + category chip overlaid on a bottom gradient, floating back/close glass buttons; no-photo case keeps contrast via the same scrim
- **Location card clean photo (`?v=html68`, style `html31`)** — title moved back below the photo (photo carries only floating back/close); matches the photo-viewer reference
- **Location card subtitle merge (`?v=html69`, style `html32`)** — category chip + Singkatan row folded into one grey subtitle under the name (category stays clickable to filter); Info is the only detail row left
- **Location card title lines (`?v=html70`, style `html33`)** — name followed by `Singkatan: X` and category lines (badge stays put); subtitle merge reverted per owner layout
- **Phase 2: Simpan + Berhampiran (`?v=html71`, style `html34`)** — Simpan toggles a gold state persisted in `localStorage` (`kgbMapSaved`); saved-places filter (pins + fly-to, no shareable URL; pill at first, moved to sidebar in `html72`); sidebar list + search results mark saved with ★; Dekat lists the 5 nearest with straight-line distance in-card (tap row jumps there, back returns); `feature.md` updated
- **Disimpan moved to sidebar (`?v=html72`, style `html35`)** — saved pill removed from the top row; ★ Disimpan row with live count lives under the sidebar buttons, synced via `updateCategoryPills`
- **Disimpan moved to rail (`?v=html73`, style `html36`)** — 4th rail icon under the panel toggle (gold active, count in tooltip); sidebar row removed
- **Saved list overlay (`?v=html74`)** — rail bookmark also opens a ★ Disimpan list in the Tier-2 panel (badge + name rows, tap jumps to card, back restores saved pins); reuses category-overlay styles, no share row (no shareable URL); JS only
- **Saved filter opens the panel (`?v=html75`)** — the list renders inside the sidebar, which starts hidden: `applySavedFilter` now expands it on desktop; JS only
- **Rail active-panel highlight (`?v=html76`)** — layers icon blue while the Tier-2 sidebar is expanded (title/aria flips Buka/Tutup), menu icon blue while the info panel is open; saved gold unchanged; JS only
- **Single-open sidetabs (`?v=html77`)** — expanding Tier-2 closes info, opening info collapses Tier-2 (docks at 70px); rail menu is now a toggle; closing either leaves map-first; JS only
- **Single rail highlight (`?v=html78`)** — saved-gold suppresses layers-blue (never both); layers lights for plain/category panel only; `updateCategoryPills` now also syncs rail state; JS only
- **Saved dismiss collapses panel (`?v=html79`)** — bookmark toggle-off and saved-list ←/× return to bare map via `dismissSavedFilter` (show-all + collapse, desktop); card-back still returns to saved list; `showAllLocations` shared path untouched; JS only
- **Menu docks in sidebar (`?v=html80`, style `html37`)** — desktop info panel moved inside Tier-2 (same node, listeners intact; covers overlays at z-200) instead of floating on the map; backdrop/body-lock now mobile-only; closing it returns to bare map; collapse path drops menu state without recursion; searchbar hamburger desktop-hidden (directions slides to the edge), mobile keeps both; resize moves the node back for mobile slide-in; layers highlight yields to menu-open; JS + CSS
- **Mobile bottom rail (`?v=html81`, style `html38`)** — 3-icon bar (menu/layers/saved; location+directions stay on FABs) fixed at the bottom with safe-area padding, z-1505 above the sheet; auto-hides on half/full via `syncRailVisibility` (setSheetState + all 3 drag-ends + resize), sheet gains `rail-visible` bottom offset at peek; layers toggles peek↔half, highlight mirrors desktop rules; rail wiring split into width-agnostic `initRail`; "Tunjuk Peta" confirmed already dead (display:none everywhere, no wiring) — left untouched; JS + CSS
- **Rail topmost chrome (style `html39`)** — mobile rail z-1505 → 1560, above sheet and FABs (search top-anchored, toast 9999 and loader/debug stay above as before); CSS only
- **Mobile rail always visible (`?v=html82`)** — auto-hide on half/full removed per owner (bar stays through full sheet, sheet keeps its bottom offset); `syncRailVisibility` now only ensures shown; JS only
- **Full sheet covers search (style `html40`)** — `sheet-full` is now 100dvh (was 90vh), square corners, z-1650 above search/pills/FABs; rail bumped to z-1660 so it stays the topmost chrome; `feature.md` phone section updated; CSS only
- **Mobile rail pinned to viewport (style `html41`)** — rail was `absolute` against the static 100vh app box so it sank below the fold on real Chrome (missing buttons); now `fixed` like the sheet/search/FABs; CSS only
- **Saved decoupled from list (`?v=html83`)** — bookmark is now a pure pins-only filter (never opens/covers/collapses any panel or sheet, desktop + mobile); saved overlay + `dismissSavedFilter` + card-back saved-restore branch retired; layers highlight no longer suppressed by saved (independent states co-light); `feature.md` saved line corrected; JS only
- **Mobile sheet fully hideable (`?v=html84`)** — new `hidden` state (map-first, like desktop): default on load, drag-down past 18% or empty-map tap or card ×/show-all/GPS lands there, layers toggles back to peek; cards force peek via guard; layers lights only on half/full; `setSheetState` now clears inline height + owns the class list; `feature.md` phone section updated; JS + CSS
- **Mobile layers true toggle + sheet × (`?v=html85`, style `html42`)** — layers now shuts any open sheet state (was peek↔half cycling); new × top-right of sheet header (mobile-only, `onclick` wired in `initBottomSheet`); stale rail comment corrected; JS + CSS
- **Location button honest failures (`?v=html86`)** — geolocation is HTTPS-only, so taps on plain-HTTP test servers now toast why instead of lighting up dead; permission-denied/timeout also toast; JS only
- **Mobile rail 3-icon fix (style `html43`)** — `#rail-location` hide lost on specificity to `#rail button` (the exact CSS-cascade class of bug from the AGENTS.md rulebook), so phones showed 4 icons; now qualified `button#rail-location`; CSS only
- **Mobile rail captions (style `html44`)** — Menu/Senarai/Disimpan labels under the icons (Google-Maps style, Malay); buttons become soft tiles, bar grows, sheet offset raised to match; desktop rail icon-only as before; markup + CSS
- **Desktop rail captions (style `html45`)** — Menu/Lokasi/Senarai/Disimpan labels under all four rail icons; buttons narrow tiles (56px, rail stays 64px so no offset cascade); markup + CSS
- **Per-view pitch + bearing (`?v=html87`)** — `pitch3D`/`bearing` accept a number (both views, old behavior) or `{desktop, mobile}` via `pairOr` (validated, idempotent); live `viewPitch()`/`viewBearing()` picks feed boot/show-all/3D-toggles; config sets pitch 68.5/30, bearing -27.2/-27.2 (mobile values tunable); config fetch already Date.now-busted; `feature.md` untouched (no user-visible change yet); JS + config

### Changed/Removed
- **Removed Leaflet** — CDN, panes (`campusMarkerPane`, `routeLinePane`, …), `L.divIcon` tooltips, and custom mobile double-tap gestures gone; boundary/route/GPS-accuracy are GeoJSON sources (re-added automatically after every `setStyle`), and mobile uses MapLibre native gestures
- **Pins are canvas layers, not HTML markers** — replaced in a v2 overhaul by badge-only fixed-box HTML markers (number badge / dot, category colors) with NO per-marker popup content, so element boxes can never shift anchors under the pitched camera; hover/click share one external popup (`#pin-popup`), zoom tiers re-render badge HTML in place, highlight is a CSS ring, and dots get a CSS fat-tap hitbox — after canvas layers proved undebuggable remotely (layers created, features in memory, yet zero tiled/rendered with no error)
- **Default 3D pitch 45° → 30°** — shallower tilt keeps extruded buildings closer to their ground footprints, reducing the parallax that makes correctly-anchored pins look offset from buildings (pins anchor to ground coords; building tops lean away under tilt on every 3D map — tapping the compass snaps back to north-up flat)
- **Floating pins with stems** — badges now hover above rooftops on a thin stem (`anchor: 'bottom'` at the ground coordinate, stem foot exact), stem renders only when tilted (`body.is-pitched`, hidden top-down), popup lift adapts to pitch; dots stay ground-level
- **Debug tooling** — removed the always-on zoom chip; `?debug=1` shows a live camera chip (zoom/pitch/bearing/center/pins), `?debugpage` opens a full overlay (camera, data incl. no-coords list, pins, state, prefs, boundary/mask status + copy-state/clear-prefs/reload actions, slide-hide with top-right tab, pausable/selectable JSON); noisy logs gated behind the flags, both flags survive in-map navigation
- **Mask veil + self-healing creation** — outside dim switched to visible grey (`dimColor` knob, default `#868c96` @ 0.45) after near-white proved camouflage; boundary fetch logs points/failures with a settle retry; dim creation is per-component idempotent plus a 1s×12 poller reporting `maskPoll` to `?debugpage`, after partial-state creation stranded the layer silently
- **`config.json` tuning file** — `kgb/map/config.json` owns the default view (centers, zooms, pitch, bearing, zoom limits, max pitch), pin tiers (dot-zoom thresholds, priority categories, badge/dot sizes), stem behavior (min pitch, height), default base layer, and campus mask (outside dim overlay + pan restriction to boundary bbox — hiding outside 3D via `within` proved impossible since it only evaluates points/lines, verified in the style-spec source); fetched at boot with type-checked merge over built-in defaults (2.5s cap, bad file can never break the map)
- **March bug root fix** — `.ml-marker` is now `position: absolute !important` (a `position: relative` rule had been beating MapLibre's own marker rule in cascade order, leaving elements in flow layout so each translate stacked onto the previous row — index-marched pins)
- **3D buildings tolerate missing heights** — `render_height`/`render_min_height` wrapped in `coalesce` (defaults 8m/0m), fixing the `Expected value to be of type number, but found null` console error and extruding height-less buildings modestly instead of dropping them
- **Detail overlays on 3D vector** — footpaths (reddish dashed `detail-path`) and sports grounds (green `detail-sport-fill/line` for `pitch/track/stadium/playground`) drawn from the same planet source; the `bright` base paints paths faint and styles no pitches, so campus courts and walkways were invisible before. (A pink `service=parking_aisle` overlay shipped briefly, then removed — it painted the internal driveways pink and read as recolored roads.) Tunable via `config.json` `detail:{...}` (colors + `pathOpacity`/`sportOpacity`/`sportLineOpacity`; running `track` split into its own tartan `detail-track-fill` with `trackColor`/`trackOpacity`), re-added in `ensureCustomStyleLayers()` before buildings + mask
- GPS accuracy circle is now a meters-accurate GeoJSON polygon instead of `L.circle`
- **Campus lock lifts on demand** — `MaxBounds` stays for browsing, but drops to free when the GPS dot or a directions endpoint falls outside campus+bounds, restoring once everything is back inside; off-campus users and town→campus routes can now be framed instead of clamped
- **Route marching-ants** — white dash overlay crawls along the blue foot route via rAF phase-shifted `line-dasharray` (MapLibre has no dash-offset, so the pattern is rewritten each frame); 5px dashes at ~12px/s after first version proved too fine/slow to see; loop starts on route draw, dies with `clearRoute()`, skips under `prefers-reduced-motion`; `?debugpage` shows `version` + `state.route {anim, dashLayer, dashArray}` as proof
- **Route registry rebuild** — the old dash id silently refused creation on-device (`addLayer` no-throw, absent on re-read), so patching was hopeless; the self-heal tears down all route layers + source and recreates from zero under a fresh id (`osrm-route-ants`), with legacy-id cleanup; heal capped at 5 tries, then the walker dot carries it alone; `state.route` reports `dot`/`givenUp`, `?debugpage` reports a boot counter
- **Walker-dot route animation** — small flat white circles (~7px, thin blue ring, no shadow) spaced ~12m apart drift the route start→end over ~14s (same marker mechanism as pins, which provably render everywhere; rotation-invariant so nothing twists at 3D pitch); speed/spacing/cap tunable in `config.json route:{loopSeconds,dotSpacingM,dotMax}` (validated, bad file falls back); runs in the existing rAF tick, dies with `clearRoute()`, skips under `prefers-reduced-motion`
- **Route endpoint legs** — Google-style curved dotted tails: when the router snaps to roads short of an off-road pin, a sampled quadratic-bezier curve bridges the gap and walker dots flow over it to the exact pin (blue line ends at the snap points, gaps under 5m ignored); pure geometry + markers, no canvas dash layer involved; tail lengths in `state.route.tailsM`
- **Walk/Drive mode** — Directions panel has a Walk/Drive toggle (`directions_walk`/`directions_car`); Walk uses FOSSGIS `routed-foot`, Drive uses `routed-car` driving profile (same GeoJSON shape, no key); switching re-fetches when both endpoints are set, readout shows `(jalan kaki)`/`(memandu)`, choice persists in `localStorage`, mode visible in `?debugpage`
- **Dot speed cap** — fixed loop time meant speed scaled with distance (far GPS = teleporting dots); speed is now capped by `config.json route.dotMaxSpeedMps` (default 20 m/s), short routes unchanged, long routes drift at constant speed; actual speed shown as `state.route.speedMps`
- **Test route debug** — `?testroute=1` draws a demo foot route on load (first→last location with coords) so the animation can be tested without tapping through Directions; waits for style readiness (10s cap); survives navigation like `?debug=1`

## [Unreleased] — Directions Panel (Experiment)

### Added
- **Two-point Directions panel** — Start/End fields opened via a new directions icon in the search bar (or via "Dapatkan Arah" in a location's info overlay, which pre-fills Start = GPS, End = that location). Each field accepts a campus location, a map label (Tasik UniSZA, Padang New Zealand), or a pinned "Lokasi Saya (GPS)" option
- Distinct colored pin markers (green start / red end) in a new `directionsPinPane` (z-index 700)
- `drawOSRMRoute()` generalized from `(toCoords)` (always FROM live GPS) to `(fromCoords, toCoords)` — no longer implicitly tied to the GPS watch
- Picking GPS as an endpoint uses a one-shot `getCurrentPosition()`, decoupled from the continuous `watchPosition()` tied to the hamburger "Lokasi Saya (GPS)" toggle — picking it never turns the toggle on, and toggling GPS off never clears an active Directions route
- **`#my-location-btn`** — GPS toggle moved out of the hamburger menu into a dedicated button: stacked above Leaflet's zoom control on desktop, a circular floating button on mobile. Clicking it centers the map on the user's first GPS fix (`focusMapOnUserLocation()`), mirroring the camera-focus behavior of selecting a location from the list
- **`#directions-fab-btn`** — mobile-only floating Directions button, stacked below `#my-location-btn`; both float above the bottom sheet, tracking its live height up to a 50vh cap, then sit pinned (and visually behind the sheet once it grows past that cap)
- **No duplicate endpoints** — `renderDirectionsResults()` now excludes whatever the *other* field currently holds (GPS, a specific location, or a map label) from a field's own dropdown, so the same point can no longer be picked for both Start and End

### Changed/Removed
- **Removed** the single "Arah Dari Lokasi Saya (Eksperimen)" button (always routed FROM live GPS only) — superseded entirely by the Directions panel
- `setUserLocationVisible(false)` now only calls `clearRoute()` when the Directions panel is closed
- **Info overlay image loading** — placeholder now shows immediately and the image cross-fades in on load (`opacity` transition) instead of only appearing after all three format attempts (`.jpg`/`.png`/`.webp`) fail; `.info-overlay-image-wrap` is now a fixed `200px` box with both layers absolutely positioned inside it, eliminating a layout jump that was visible on slower mobile connections
- Hamburger info-menu panel's hero image (`unisza-kgb-aerial.jpg`) now uses `loading="lazy"` — it's off-screen by default until the panel is opened

---

## [2.9] — 2026-05-06

### Added
- **Category overlay panel** (`showCategoryOverlay()`) — when a category is selected (by click or `?type=` deep link), a panel slides in over the sidebar showing the category name as a colored badge, a share button, location count, and a scrollable list of all locations in that category; mirrors the location info overlay UX and reuses the same `slideInFromLeft`/`slideOutToLeft` animations
- **`currentOverlaySource`** state variable (`null | 'category'`) — tracks whether the location info overlay was opened from within the category overlay; controls `←` behavior in `dismissOverlay()`
- Tapping a location inside the category overlay opens the location info overlay on top (category overlay stays in DOM behind); pressing `←` in the location overlay closes it, restores category markers on the map, and reveals the category overlay — no `flyToBounds` (keeps current map position)
- `?type=` deep link now opens the category overlay in addition to filtering markers
- Mobile sheet expands to `half` (50vh) when a category overlay is activated
- **Tappable category badge in location info overlay** — the "Kategori" row now renders as a colored pill `<button>`; tapping it animates the location overlay out and calls `filterByCategory()` to open the category overlay for that category

### Changed
- **Category header click no longer expands the accordion** — on both desktop and mobile, clicking a category header directly calls `filterByCategory()` which opens the category overlay; the accordion is now only expanded via "Papar Semua Kategori"
- **Removed "📍 Lihat di peta" button** — previously a mobile-only button inside each accordion group; no longer needed since the category header directly opens the overlay on all platforms
- **Mobile `flyToBounds` accounts for half-sheet** — `filterByCategory()` on mobile now uses `paddingTopLeft: [40, 60]` / `paddingBottomRight: [40, 50vh + 20px]` so all category markers fit in the visible map area above the sheet
- **Share button moved to below the header** in the category overlay (previously at the bottom footer); more discoverable on mobile without scrolling past the location list
- `showAllLocations()` now removes `.stop-category-overlay` from the DOM and resets `currentOverlaySource = null`

### New CSS classes
`.stop-category-overlay`, `.category-overlay-header`, `.category-overlay-badge`, `.category-overlay-back`, `.category-overlay-close`, `.category-overlay-share-row`, `.category-overlay-share`, `.category-overlay-subtitle`, `.category-overlay-list`, `.info-overlay-category-badge`

---

## [2.8] — 2026-04-30

### Added
- **Shareable deep links** — two URL parameters restored and extended:
  - `?type=<category-slug>` — filters map to a category (e.g. `?type=kolej-kediaman`)
  - `#<place-slug>` — opens location info overlay (e.g. `#canselori`)
  - Both can combine: `?type=kolej-kediaman#canselori` (location overlay with category context for correct `←` dismiss)
- **`slugify(text)`** — converts any text to a URL-safe slug: lowercase → strip NFD diacritics → replace non-alphanumeric runs with `-` → trim hyphens
- **`updateURL({ type, location })`** — single source of truth for all URL mutations via `history.replaceState`; pass no args to clear both params; **always use this, never manipulate `window.location` directly**
- **`handleDeepLink()`** — runs once after `mapData` is ready; reads `#hash` and `?type=` params; `#hash` takes priority over `?type=`; `?type=` with no hash calls `filterByCategory()` and expands accordion; `?type=X#place` stores `currentActiveCategory` silently so `←` dismiss restores the correct URL
- **`showAllLocations(animate, updateUrl)`** — new `updateUrl` flag; initial load passes `false` to preserve URL params for `handleDeepLink()`
- **Share button in info overlay** — `<button class="info-overlay-share">` with `link` icon; copies current URL to clipboard; appears below "Buka di Google Maps"
- **Share icon in category header** — `<span class="category-share-btn" role="button">` (must be `<span>`, not `<button>` — nested `<button>` inside `.stop-header <button>` is invalid HTML); copies `?type=` URL on click; `stopPropagation` prevents accordion toggle
- **`copyToClipboard(text)`** — uses `navigator.clipboard` on HTTPS; falls back to `execCommand('copy')` via temporary textarea on HTTP (local dev); always calls `showToast()`
- **`showToast(message)`** — shows `#map-toast` fixed bottom-center element with fade-in/out; auto-removes after 2s

### New CSS classes
`.info-overlay-share`, `#map-toast`, `#map-toast.visible`, `.category-share-btn`, `.stop-header-label { flex: 1 }`

---

## [2.7] — 2026-04-23

### Added
- **Mobile zoom-out gesture** — hold one finger on the map (≥150ms), then tap with a second finger and release quickly (<300ms) to zoom out 1 level; mirrors Google Maps' two-finger zoom-out gesture
- Leaflet's built-in `doubleClickZoom` is disabled on mobile (≤768px) and replaced entirely with custom touch logic
- **Double-tap zoom in** preserved — quick double-tap (same finger, within 300ms, within 40px) calls `setZoomAround()` at the tap position, identical feel to Leaflet default
- Pinch zoom unaffected — second finger held >300ms still hands off to Leaflet's native pinch handler; simultaneous two-finger tap (first finger held <150ms) does not trigger zoom out

---

## [2.6] — 2026-04-23

### Changed
- **Multi-format image support** — info overlay now tries `.jpg` → `.png` → `.webp` in order before falling back to the "Tiada Gambar" placeholder; previously only `.jpg` was attempted
- Fallback chain uses chained `onerror` handlers: each failed load updates `this.src` to the next extension; if all three fail, the image is hidden and the sibling placeholder is shown
- No changes to folder structure or `kgb-map.json` schema — upload the image in any of the three supported formats

---

## [2.5] — 2026-04-22

### Added
- **Location images in info overlay** — a photo of the selected campus location now appears at the top of the info panel; images hosted on GitHub under `kgb/data/kgb-map/images/{folder}/{number}.jpg`
- **`CATEGORY_SLUG` constant** — maps each `locationType` string to its image subfolder slug (e.g. `'PENTADBIRAN & PTJ'` → `'pentadbiran'`); unknown types fall back to `'lain'`
- **`onerror` placeholder** — if no image file exists for a location, the `<img>` is hidden and a sibling `.info-overlay-image-placeholder` div (grey card, `hide_image` icon + "Tiada Gambar" text) is shown instead; no external placeholder file required
- Image URL is derived entirely by convention from existing `locationType` and `number` fields — no schema changes to `kgb-map.json` or the Google Sheet

---

## [2.4] — 2026-04-19

### Added
- **Info menu panel** — hamburger icon button (`#info-menu-btn`) in the right of the search bar; opens `#info-menu-panel` which slides in from the right on mobile (full-screen, `z-index: 2001`) and appears as a 380px popup card on desktop (aligned to the search bar)
- **Panel hero section** — aerial campus photo (`unisza-kgb-aerial.jpg`) with `object-fit: cover`, linear-gradient overlay, and text (`Peta Kampus UniSZA KGB` + live location count subtitle) at the bottom; frosted-glass close button (`×`, `position: absolute`) at top-right of image
- **Panel nav section** — "Lihat Juga:" with pill-shaped buttons: Peta Bus Stop, 360° Virtual Tour (links to `unisza.edu.my/vt360/kgb/`), Menu Utama; `align-items: flex-start` keeps "Menu Utama" from stretching full width
- **Panel feedback section** — thank-you text + "⭐ Beri Rating" and "🐛 Laporkan Masalah" pill buttons (placeholder links)
- **Panel version section** — `#menu-version` and `#menu-kemaskini` spans; populated by `fetchMapDataInfo()` in parallel with sidebar spans
- **`openInfoMenu()`** — adds `.open` to panel and backdrop; on desktop dynamically sets `panel.style.left` based on sidebar collapse state (420px collapsed / 70px expanded); suppresses `body` scroll only on mobile
- **`closeInfoMenu()`** — removes `.open` from panel and backdrop; restores `body.style.overflow`
- Backdrop click calls `closeInfoMenu()`
- `#menu-location-count` span populated alongside `#location-count` in the data fetch block

### Changed
- **`#map-data-info` and `.sidebar-nav-footer` globally hidden** — version/update info and nav links are now exclusively in the info menu panel
- **Mobile: sidebar title and subtitle hidden** (`.sidebar-header h2, .sidebar-header .subtitle { display: none }`) — content moved to panel hero
- **Mobile: "Senarai Lokasi" header reordered above action buttons** — CSS `order` property: `.list-section-header { order: 1 }`, `.sidebar-header { order: 2 }`, `.company-list { order: 3 }`

---

## [2.3] — 2026-04-16

### Added
- **Zoom-based marker tiers** — non-priority categories render as 12×12px colored dots at low zoom; transition to full markers when zoom ≥ `ZOOM_FULL_DESKTOP` (17.5) / `ZOOM_FULL_MOBILE` (17)
- `ZOOM_FULL_DESKTOP = 17.5`, `ZOOM_FULL_MOBILE = 17` — configurable thresholds at top of `script.js`
- `PRIORITY_CATEGORIES` — 3 categories always shown as full markers regardless of zoom: `PENTADBIRAN & PTJ`, `BLOK AKADEMIK & KELAS`, `BLOK FAKULTI & PUSAT PENGAJIAN`
- `shouldShowFullMarker(location)` — returns `true` when: priority category, zoom ≥ threshold, `currentSelectedLocationId` matches, active category filter matches, or `currentHighlightedMarker` matches
- `updateMarkerModes()` — iterates `markers[]`, calls `marker.setIcon()` in-place on `zoomend`; re-applies `.marker-highlighted` after icon swap (Leaflet replaces the DOM element on `setIcon`)
- `marker._location` — location data stored on each marker object, required by `updateMarkerModes()` to re-evaluate mode after zoom changes
- **Hover upgrade** — `mouseover` on a dot temporarily upgrades it to full icon; `mouseout` reverts to dot if not selected/highlighted
- **Highlight revert** — `setMarkerHighlight()` now reverts the previous marker's icon when switching selection; sets `currentHighlightedMarker` to new value first so `shouldShowFullMarker` evaluates the old marker without bias
- **Location count in sidebar subtitle** — `<span id="location-count">` populated with `mapData.length` after JSON loads; displays as `Peta Interaktif N Lokasi di UniSZA Kampus Gong Badak.`

---

## [2.2] — 2026-04-16

### Added
- **Version & update info bar** — `#map-data-info` block above `.sidebar-nav-footer` shows app version and last data update; populated at page load by `fetchMapDataInfo()`
- `fetchMapDataInfo()` — async function, two parallel fetches via `Promise.allSettled`:
  - Fetches `kgb/map/CHANGELOG.md` from GitHub raw URL, parses top `## [X.Y]` line → displays `Versi: X.Y`
  - Fetches GitHub Commits API (`path=kgb/data/kgb-map.json`) → formats commit date as `Kemaskini: Khamis DD/MM/YYYY (N hari lalu)` with Malay day names and relative time string
- `formatTarikhMalay(date)` helper — formats `Date` as `Hari DD/MM/YYYY` (Malay day names: Ahad–Sabtu)
- `timeAgoMalay(date)` helper — returns `N hari lalu` / `N jam N minit lalu` / `N minit lalu`
- Styled at 11px / `#80868b`; both spans show `—` as loading placeholder; errors fail silently

---

## [2.1] — 2026-04-16

### Added
- **Sidebar nav footer** — `.sidebar-nav-footer` at the bottom of the sidebar links to `/kgb/bus-stop/` (Peta Bus Stop) and `/` (Kembali ke menu utama); styled with `border-top: 1px solid #e8eaed`, 12px muted text

### Fixed
- **Campus boundary local cache** — `loadCampusBoundary()` now fetches `../data/campus-boundary.json` (committed to repo) instead of querying `overpass-api.de`; eliminates 504 Gateway Timeout failures; polygon loads reliably on every page load
- `kgb/data/campus-boundary.json` — 45 hardcoded lat/lon pairs for OSM Way 1120569731
- **Campus boundary Vercel path fix** — changed fetch path from `../data/campus-boundary.json` to `/kgb/data/campus-boundary.json` (absolute); Vercel's `cleanUrls: true` serves the page at `/kgb/map` (no trailing slash), causing `../` to resolve relative to `/kgb/` → `/data/` instead of `/kgb/data/`; absolute path eliminates the ambiguity

---

## [2.0] — 2026-04-11

### Added
- **Campus boundary polygon** — `loadCampusBoundary()` fetches UniSZA's campus boundary (OSM Way ID 1120569731) from the Overpass API at page load and renders it as a non-interactive `L.polygon()` overlay; styled with the site's primary blue (`#1967d2`), 2.5px stroke at 80% opacity, 7% fill opacity; fails silently if Overpass is unavailable
- **Search results now show `details`** — a third `.result-detail` line appears below the category subtitle in each location search result when the location has a non-empty `details` field; styled at 11px / `#80868b`, truncated with ellipsis

### Fixed
- **Toggle button label desync** — clicking a category header after "Papar Semua Kategori" left the button stuck on "Tutup Semua Senarai" even though all other groups had collapsed; extracted `updateToggleButtonLabel()` helper that reads actual DOM state and sets correct label; called at the end of both the category header `onclick` and `toggleAllGroups()`

---

## [1.9] — 2026-04-11

### Added
- **`flyToMarker(coords, duration?)`** — shared helper that pans and zooms to a location with a bottom-sheet-aware vertical offset, so the marker appears above the sheet instead of behind it; used by both marker tap and list select for consistent positioning
- **`minZoom: 14`** on `L.map()` — prevents zooming out past the full-campus view

### Changed
- **Mobile tooltips now appear above the marker** (`direction: 'top'`) with a downward-pointing CSS arrow; desktop remains `direction: 'right'` with a left-pointing arrow; `tooltipAnchor` in `createMarkerIcon()` is set per-breakpoint accordingly
- **Bottom sheet collapses to `peek` when tapping the map** (empty area); marker taps are unaffected (`stopPropagation` already in place)
- **Back (`←`) and close (`×`) buttons in the info overlay now have different behaviors**: `←` dismisses the panel only, keeping the selected marker on the map; `×` resets everything and restores all locations
- **Info overlay cross-fades when switching locations**: if an overlay is already open, content is updated in place with a 120 ms opacity transition instead of remove + slide-in — the sidebar is never visible during the switch; the slide-in animation is preserved for the first open
- **"Papar semua Lokasi" zoom corrected**: `flyTo` now uses mobile `16` / desktop `14` to match the initial page-load zoom (was mobile `15.5` / desktop `16`)
- `showLocationOnMap()` now calls `flyToMarker()` instead of `flyToBounds` — both map tap and list select now produce the same screen position for the selected marker

---

## [1.8] — 2026-04-06

### Added
- **Map text labels** — static area/landmark labels rendered directly on the map (e.g. "Tasik UniSZA", "Padang New Zealand") using `L.marker` with `L.divIcon`; defined in a global `mapLabels` array for easy addition of new entries
- Labels are zoom-responsive: hidden below `minZoom`, font scales from 60% → 100% of `fontSize` over 3 zoom levels above the threshold
- Labels support multi-line text using `<br>` in the `text` field (e.g. `'Padang<br>New Zealand'`); both lines center-aligned
- **Search includes map labels** — the search dropdown now finds kawasan/tapak labels; clicking a result flies to the coordinate with the same `flyToBounds` zoom behaviour as location markers (collapses mobile sheet to peek)

### Changed
- `mapLabels` and `mapLabelRefs` moved to global scope (were local to `initMap`) to allow search and other functions to access label data

---

## [1.7] — 2026-04-06

### Changed
- **KOLEJ KEDIAMAN** markers now render as a **rounded square** (30×30px, `border-radius: 6px`) instead of a circle, to visually distinguish residential colleges from other categories
- Tooltip hover text changed from marker code (e.g. `K1`) to **full location name** for faster identification without clicking
- Tooltip expanded state (on click) no longer shows the duplicate location name row — name is already shown in the collapsed hover state
- Info overlay header now has a **back button** (chevron left) on the far left, alongside the existing `×` close button — both trigger the same close+restore behaviour
- Removed large empty space below `i` and `Arah` buttons in expanded tooltip — was caused by a now-removed `min-height: 90px` on the expanded wrapper
- Tooltip popup horizontal padding increased (`5px` → `16px`) and `min-width` raised (`80px` → `120px`) for better readability on short location names
- `showAllLocations()` now accepts an `animate` flag — initial page load uses `setView` (no animation) while subsequent calls use `flyTo` with animation
- Initial map load starts at zoom **14** then animates (`flyTo`) to zoom **16.5** over the campus centre, making the intro animation clearly visible
- Map initialised with `zoomSnap: 0.5` to support half-integer zoom levels
- Added **debug zoom indicator** (bottom-right corner) showing live zoom level — commented-out-friendly for removal after testing

### Fixed
- Initial page load was zooming out then in due to `flyToBounds` overriding `setView` — resolved by separating animated vs. non-animated paths in `showAllLocations()`

---

## [1.6] — 2026-04-05

### Changed
- Category bar color (left border on accordion header) widened from `4px` to `6px` for better visual prominence

---

## [1.5] — 2026-04-05

### Changed
- Accordion is now single-select: clicking a category header collapses all other open groups before expanding the selected one
- If the clicked group was already open, it collapses (toggle behavior preserved)

---

## [1.4] — 2026-04-05

### Fixed
- Page was blank on Vercel deployment — `kgb/map.html` (an empty file) was shadowing `kgb/map/index.html` on Vercel's Linux server, causing `/kgb/map` to serve the empty file instead of the directory
- Deleted `kgb/map.html`
- Moved `document.getElementById('show-all')` and `toggle-all-groups` event wiring inside `window.onload` to prevent potential null-reference crash if script executes before DOM is ready

---

## [1.3] — 2026-04-05

### Changed
- Closing the location info overlay (`×` button) now calls `showAllLocations()` after the slide-out animation completes
- Map zooms back to full campus view with all markers restored when the details pane is dismissed

---

## [1.2] — 2026-04-05

### Changed
- Selecting a location from the sidebar list or search results now hides all other markers — only the selected location's marker remains on the map
- `filterByLocation()` and `showLocationOnMap()` both call `clearMarkers()` before placing the single selected marker
- Both functions also reset `currentActiveCategory` and clear `.category-active` highlight from group headers
- "📍 Papar semua Lokasi" and closing the info overlay both restore all markers via `showAllLocations()`

---

## [1.1] — 2026-04-05

### Fixed
- Tooltip inner buttons (`i`, `Arah`, `×`) were unreachable — tooltip disappeared before clicks could register when moving the mouse from the marker to the tooltip content

### Changed
- Tooltip is now `permanent: true` (always present in DOM) but hidden by default via CSS (`opacity: 0; pointer-events: none`)
- Tooltip becomes visible via `.tooltip-visible` class, applied by JS on `mouseover` (marker) and `mouseenter` (tooltip element itself) — this keeps the tooltip open as the mouse travels from marker to tooltip
- Click on a marker sets "sticky" mode (`.expanded` class) — tooltip stays visible regardless of mouse position until explicitly dismissed
- Opening a new sticky tooltip auto-closes any previously open one
- Clicking the map background clears all sticky/visible states
- Removed inline `onclick` from the close button in tooltip HTML; handled via event listener instead

---

## [1.0] — 2026-04-05

### Added
- Initial release of `kgb/map/` interactive campus map
- `index.html` — HTML shell with sidebar, search bar, map container, mobile toggle; correct DOM order for CSS `~` sibling selectors (sidebar → expand btn → search container)
- `script.js` — full application logic:
  - `parseCoords()` — extracts `[lat, lng]` from `googleMapLink` URL (`?q=lat,lng`) with Malaysia bounding box validation
  - `processData()` — filters blank entries, assigns unique `id` (array index) to handle duplicate `number` values across categories
  - `customSort()` — alphanumeric sort: letter-prefixed codes (P1, A5) before pure numbers; handles dormitory block single-letter codes (A, B, C…Q)
  - `CATEGORY_COLORS` — 10-category color lookup (background + text color)
  - `createMarkerIcon()` — colored `L.divIcon`: circle (32×32px) for ≤3 char codes, pill (44×22px) for ≥4 char codes
  - `createMarker()` — permanent tooltip with hover-reveal and click-to-expand/sticky behavior
  - `renderGroupedList()` — 10-category accordion list in `DESIRED_ORDER` with colored number badges and mobile "Lihat di peta" buttons
  - `showAllLocations()` — renders all markers, fits campus bounds
  - `filterByCategory()` — shows only selected category; toggle: clicking same category restores all
  - `filterByLocation()` — single marker focus with zoom, desktop only
  - `showLocationOnMap()` — single marker focus with zoom + collapses mobile sheet
  - `showLocationInfoOverlay()` — text-only details panel (no images); fields: number badge, place, category, shortForm, details, Google Maps link
  - Full mobile bottom sheet touch system (peek/half/full states, handle/header/content drag zones) — ported from `bus-stop-kgb/`
  - Desktop sidebar collapse/expand — ported from `bus-stop-kgb/`
  - Search dropdown with real-time filtering across locations and categories — ported from `bus-stop-kgb/`
- `style.css` — full styles adapted from `bus-stop-kgb/style.css`:
  - CSS custom properties for 10 category colors
  - `.category-btn` replaces `.company-btn`
  - `.location-number-badge` — colored pill badge in accordion list
  - `.no-coords` — `opacity: 0.55; cursor: default` for entries without map coordinates
  - `.info-overlay-details`, `.info-overlay-detail-row`, `.info-overlay-number-badge` — text-only info overlay layout
  - `.popup-location-fullname` — full place name shown in expanded tooltip
  - Removed all image-related rules (no photos in this project): `.stop-image-container`, `.fullscreen-overlay`, `.fullscreen-close`, `.fullscreen-caption`, `.info-overlay-image`, `.info-overlay-companies`
