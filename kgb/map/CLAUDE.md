# CLAUDE.md — kgb/map/

This file provides guidance to Claude Code when working with the `kgb/map/` sub-project.

## Project Overview

**Peta Kampus UniSZA KGB** — an interactive Leaflet.js campus map for UniSZA Kampus Gong Badak. Displays ~110 campus locations (buildings, facilities, accommodation blocks, etc.) as colored markers on a satellite map. Data is sourced from `kgb/data/kgb-map/kgb-map.json`, the same file used by `kgb/index.html`.

This project is a structural adaptation of `kgb/bus-stop/` — same layout, same mobile/desktop UX patterns, but tailored for campus locations instead of bus stops.

Pure static HTML5/CSS3/Vanilla JS — no npm, no build tools. Uses Leaflet.js 1.9.4 via CDN.

---

## Core Files

```
kgb/map/
  index.html      ← HTML shell (map, sidebar, search, mobile toggle)
  script.js       ← All application logic
  style.css       ← All styles
  CLAUDE.md       ← This file (technical architecture)
  README.md       ← User-facing feature overview & data/image update instructions
  CHANGELOG.md    ← Full version history (v1.0–present); update this, not the section below
  link-guide.md   ← Deep-link/share system reference, written as a blueprint for porting the same feature to kgb/bus-stop/

kgb/data/kgb-map/kgb-map.json   ← Data source (NOT inside kgb/map/)
```

---

## Data Model

Data is fetched from `../data/kgb-map.json` (relative path from `kgb/map/`):

```json
[
  {
    "number": "P1",
    "place": "Canselori",
    "googleMapLink": "https://maps.google.com/?q=5.4012,103.0801",
    "locationType": "PENTADBIRAN & PTJ",
    "shortForm": "",
    "details": "Optional extra info"
  }
]
```

**Key points:**
- `number` uses category prefix codes: `P` = Pentadbiran, `A`/`B` = Akademik, `K` = Kolej Kediaman, `F` = Fakulti, etc.
- `number` values are **not globally unique** — e.g. "A1" exists in both `BLOK AKADEMIK & KELAS` and `PUSAT AKTIVITI`. Use `location.id` (array index assigned in `processData()`) as the unique identifier everywhere.
- Coordinates are **embedded inside `googleMapLink`** as `?q=lat,lng` — there is no dedicated `coords` field. Use `parseCoords()` to extract them.
- Entries with missing/invalid coordinates get `coords: null`. They appear in the sidebar list but not on the map. Clicking them opens the info overlay without zooming.

---

## Architecture

### 1. State Variables

| Variable | Type | Purpose |
|---|---|---|
| `map` | Leaflet Map | Map instance |
| `markers` | Array | Currently rendered Leaflet markers (each has `._location` and `._tooltipSticky`) |
| `mapData` | Array | Processed location data (from `processData()`) |
| `currentActiveCategory` | string\|null | Category currently filtered/highlighted |
| `currentSelectedLocationId` | number\|null | `id` of currently selected single location |
| `currentInfoOverlayLocationId` | number\|null | `id` of location whose info overlay is open |
| `currentHighlightedMarker` | L.Marker\|null | Marker with `.marker-highlighted` class; kept as full icon regardless of zoom |
| `currentOverlaySource` | `null\|'category'` | Tracks whether the location info overlay was opened from the category overlay; controls `←` behavior in `dismissOverlay()` |
| `sheetState` | string | Mobile bottom sheet state: `'peek'`/`'half'`/`'full'` |

### 2. Category Color System

10 categories, each with a background color and readable text color:

```javascript
const CATEGORY_COLORS = {
    'PENTADBIRAN & PTJ':              { bg: '#2b8a8f', text: 'white' },
    'BLOK AKADEMIK & KELAS':          { bg: '#205c8c', text: 'white' },
    'BLOK FAKULTI & PUSAT PENGAJIAN': { bg: '#d4a000', text: 'black' },
    'KOLEJ KEDIAMAN':                 { bg: '#ecaa2b', text: 'black' },
    'PUSAT AKTIVITI':                 { bg: '#e0468a', text: 'black' },
    'SUKAN & REKREASI':               { bg: '#8A2BE2', text: 'white' },
    'CAFE & MAKANAN':                 { bg: '#b0a020', text: 'black' },
    'KESIHATAN':                      { bg: '#DC143C', text: 'white' },
    'IBADAH':                         { bg: '#32CD32', text: 'black' },
    'FASILITI & KEMUDAHAN':           { bg: '#8f9ce2', text: 'black' },
};
```

Unknown categories fall back to `#778899` (grey). Colors are applied to markers, list badges, and info overlay header.

`CATEGORY_SLUG` — parallel lookup mapping each `locationType` to its image subfolder slug:

```javascript
const CATEGORY_SLUG = {
    'PENTADBIRAN & PTJ':              'pentadbiran',
    'BLOK AKADEMIK & KELAS':          'akademik',
    'BLOK FAKULTI & PUSAT PENGAJIAN': 'fakulti',
    'KOLEJ KEDIAMAN':                 'kolej-kediaman',
    'PUSAT AKTIVITI':                 'aktiviti',
    'SUKAN & REKREASI':               'sukan',
    'CAFE & MAKANAN':                 'cafe',
    'KESIHATAN':                      'kesihatan',
    'IBADAH':                         'ibadah',
    'FASILITI & KEMUDAHAN':           'fasiliti',
};
```

Unknown types fall back to `'lain'` via `??` operator. Used by `showLocationInfoOverlay()` to build the image URL: `kgb/data/kgb-map/images/{folder}/{number}.jpg`.

### 3. Map Setup

- **Center**: `[5.3950, 103.0830]` (UniSZA Gong Badak area)
- **Default zoom**: 16
- **Base layers**: ArcGIS World Imagery (satellite, default) or CartoDB Voyager no-labels tiles (regular), user-toggleable. Both are rendered from OpenStreetMap's underlying contributor data — Voyager is just CartoDB's own tile rendering of it, chosen over raw OSM standard tiles because it ships a label-split variant (see 3c)
- **Label overlays**: `satelliteLabelsLayer` (CartoDB `light_only_labels`) over satellite, `regularLabelsLayer` (CartoDB `voyager_only_labels`) over regular — only one is ever attached at a time, matching `currentBaseView`

#### 3b. Base Layer Toggle (Satellite / Regular)

`setBaseView(view, persist)` (`view`: `'satellite'` | `'osm'`) swaps the active Leaflet base tile layer:
- Removes the previously active base layer, adds the requested one (`satelliteLayer` or `regularLayer`, both created once in `initMap()`)
- Calls `applyLabelVisibility()` so the correct label overlay for the new view is shown/hidden per the current `showLabels` state
- Syncs `#toggle-satellite-checkbox`'s checked state (checked = satellite, unchecked = regular)
- When `persist` is `true`, saves the choice to `localStorage.kgbMapBaseLayer`

On load, `initMap()` reads `localStorage.kgbMapBaseLayer` (defaults to `'satellite'` if unset/invalid) and calls `setBaseView(savedView, false)` — no localStorage write on the initial restore, only on user-initiated toggles.

The toggle (`#toggle-satellite-checkbox`) lives in the hamburger info-menu panel's "Paparan Peta" section alongside the marker/label toggles (3c) — not a floating map button. The custom `mapLabels` (Tasik UniSZA, Padang New Zealand) render in both views regardless of `currentBaseView` or `showLabels` — they're campus landmarks not present on any base map provider.

#### 3c. Marker & Label Visibility Toggles

Three independent toggles live in the hamburger info-menu panel (`#info-menu-panel`, section `.info-menu-section-layers`): the satellite/regular toggle (3b) plus these two:

**Markers** (`#toggle-markers-checkbox`) — controls all ~110 campus location pins + their tooltips:
- `createMarker(location, exempt = false)` renders into dedicated panes `campusMarkerPane` / `campusTooltipPane` (created in `initMap()`, z-index matched to Leaflet's default `markerPane`/`tooltipPane`) unless `exempt` is `true`, in which case it renders into Leaflet's default panes instead
- `filterByLocation()` and `showLocationOnMap()` — the two functions that render exactly one marker for an explicit user selection (sidebar list, search result, category-overlay item) — pass `exempt = true`, so that selected pin always shows even if markers are toggled off
- `setMarkersVisible(visible, persist)` toggles `display` on the two custom panes as a group; persists to `localStorage.kgbMapShowMarkers` when `persist` is `true`

**Labels** (`#toggle-labels-checkbox`) — controls base-map place/road name text (not the custom `mapLabels`):
- Module-scope `showLabels` (default `true`, read from `localStorage.kgbMapShowLabels !== 'false'` on init)
- `applyLabelVisibility()` picks the label layer matching `currentBaseView`, removes the other entirely, and adds/removes the active one based on `showLabels`
- Called from `setBaseView()` (on view switch) and from the labels-checkbox change handler (on toggle)

Both checkboxes are wired in `initMap()`, reading their initial state from localStorage and applying it before any user interaction.

#### 3d. GPS Positioning & OSRM Directions (Experiment)

A fourth toggle, `#toggle-user-location-checkbox` ("Lokasi Saya (GPS)"), lives in the same `.info-menu-section-layers` block as 3b/3c, but is **not** persisted to localStorage — it always starts OFF on page load (auto-starting a GPS watch without a fresh confirmation would be surprising, and the browser's permission prompt is per-session anyway).

- `setUserLocationVisible(visible)` starts/stops `navigator.geolocation.watchPosition()` (`enableHighAccuracy: true`). On stop, it clears the watch, removes the GPS marker/accuracy circle, clears `currentUserLocation`, and calls `clearRoute()` — **unless** the Directions panel is open (`directionsModeActive`), in which case the active two-point route is left alone since it doesn't depend on the live watch (see 3e).
- `updateUserLocationMarker(coords)` renders/moves a blue dot (`L.marker` with `.user-location-dot` divIcon) plus an accuracy `L.circle`, both in the dedicated `userLocationPane` (z-index 650, created in `initMap()` alongside `campusMarkerPane`/`campusTooltipPane`).
- `drawOSRMRoute(fromCoords, toCoords)` fetches a route from the **public OSRM demo server** (`router.project-osrm.org`, `driving` profile only — no `foot`/walking profile is reliably available there) and draws it as a 3-layer glow/base/dash `L.geoJSON` group in the `routeLinePane` (z-index 450, below markers). Self-hosting OSRM with a `foot` profile would be needed for an accurate walking route on campus footpaths — out of scope for this experiment. Generic two-point signature — no implicit dependency on GPS state; see 3e for how the two points are chosen.
- `clearRoute()` removes the active route layer; called whenever the info overlay closes (`closeOverlay`/`dismissOverlay`), a different location's overlay is opened (`showLocationInfoOverlay`), or the Directions panel closes/recomputes — so a stale route never lingers across selections.
- The old single "Arah Dari Lokasi Saya (Eksperimen)" button has been replaced by "Dapatkan Arah" in the info overlay, which opens the Directions panel (see 3e) instead of drawing a route directly.

#### 3e. Directions Panel (Two-Point Routing)

A Google-Maps-style Directions panel lets users pick any **Start** and **End** point (campus location, map label, or "Lokasi Saya (GPS)") and get an OSRM driving route between them — superseding the old single-button "route from GPS to here" flow.

- **Entry points**: `#directions-toggle-btn` (next to `#info-menu-btn` in the search bar) opens the panel with both fields empty. The info overlay's "Dapatkan Arah" button (`.info-overlay-directions-to-here`) calls `dismissOverlay()` then `openDirectionsPanel({ start: {type:'gps', coords:null, ...}, end: {type:'location', coords: location.coords, ...} })` — Start pre-fills to GPS (auto-resolving), End to that location.
- **State**: `directionsModeActive`, `directionsStart`/`directionsEnd` (`{ type:'location'|'maplabel'|'gps', id?, coords:[lat,lng]|null, label }`), `directionsActiveField` (`'start'|'end'|null`, tracks which input the shared dropdown feeds), `directionsStartMarker`/`directionsEndMarker` (pin `L.marker`s).
- **Picking a point**: `renderDirectionsResults(term, field)` always pins a "Lokasi Saya (GPS)" row at the top of `#directions-dropdown`, then filters `mapData` (via the shared `matchLocationsByTerm()`, also used by the main search bar) and `mapLabels` — locations with `coords === null` are excluded. Selecting a row calls `setDirectionsField(field, value)`, which updates the input label, drops/moves a colored pin via `renderDirectionsPin()` (`directionsPinPane`, z-index 700 — above `campusMarkerPane`(600) and `userLocationPane`(650)), and triggers `maybeComputeRoute()`.
- **GPS as an endpoint** (`resolveGpsPoint(field)`): if the continuous watch is already running (`currentUserLocation` set via the hamburger toggle), reuse it immediately. Otherwise call `navigator.geolocation.getCurrentPosition()` **once** — this is deliberately decoupled from `#toggle-user-location-checkbox`/`watchPosition()`: picking GPS in Directions never starts/stops the continuous watch, and toggling the watch never affects an already-resolved directions point (coordinates are a snapshot, not a live reference).
- **Route drawing**: `maybeComputeRoute()` calls the generalized `drawOSRMRoute(directionsStart.coords, directionsEnd.coords)` once both points are set, and writes the loading/result/error text into `#directions-route-info` via `updateDirectionsRouteInfo()`.
- **Cleanup**: `closeDirectionsPanel()` clears the route, removes both pins (`clearDirectionsPins()`), and resets all directions state. The swap button (`swapDirectionsFields()`) exchanges Start/End (including their pins) and recomputes the route. Clearing a single field (`.directions-field-clear`) only clears that field and its pin.
- The panel and the main search bar share the same screen slot and are mutually exclusive — opening Directions adds `.directions-hidden` to `.search-container`; closing it removes that class. They do **not** share dropdown DOM (`#search-results` vs `#directions-dropdown`), only the `matchLocationsByTerm()` predicate.

- **Campus boundary**: fetched from `../data/campus-boundary.json` (local cached coords for OSM Way 1120569731) via `loadCampusBoundary()` on init; rendered as non-interactive `L.polygon()` in `#1967d2`
- **Zoom control**: bottom-right
- **Mobile zoom gestures**: Leaflet's `doubleClickZoom` is disabled on mobile (≤768px) and replaced with custom touch handlers:
  - **Double tap** (one finger, within 300ms, within 40px) → `setZoomAround()` zoom in 1 level at tap position
  - **Hold one finger (≥150ms) + tap with second finger (<300ms)** → `zoomOut(1)`; mirrors Google Maps two-finger zoom-out
  - Pinch zoom unaffected (second finger held >300ms hands off to Leaflet); desktop `dblclick` zoom untouched

### 3a. Map Text Labels

`mapLabels` (top of `script.js`, global scope so search can read it) defines static landmark/area labels rendered directly on the map — not tied to a `kgb-map.json` entry:

```js
const mapLabels = [
    { coords: [5.405672070610966, 103.08435741479786], text: 'Tasik UniSZA', fontSize: 13, minZoom: 15 },
    { coords: [5.4027246673160985, 103.07766728429158], text: 'Padang<br>New Zealand', fontSize: 13, minZoom: 15 },
];
```

In `initMap()`, each entry becomes a non-interactive `L.marker` with an `L.divIcon` (`.map-text-label` class, `zIndexOffset: -1000`). `mapLabelRefs` stores `{ marker, fontSize, minZoom }` for each. `updateMapTextLabels()` (called on `zoomend` and once on init) hides labels below `minZoom` and scales `fontSize` from 60%→100% over the 3 zoom levels above threshold. Supports `<br>` for multi-line text.

Labels are included in the search dropdown (`renderSearchResults()` matches `mapLabels` by `text`); selecting one flies to its coordinate like a location marker, with mobile sheet collapse to `peek`. To add a label, just append an entry to `mapLabels` — no JSON/data changes needed.

### 4. Marker System

`createMarkerIcon(location, mode)` returns an `L.divIcon` in one of two modes:

**`mode = 'full'`** (default) — full colored marker:
- **Circle** (25×25px, border-radius 50%) — for codes 1–3 chars (`P1`, `A5`, `K3`)
- **Pill** (25×25px, border-radius 11px) — for 4+ char codes (`USM`, `UKS`, etc.)
- **Square** (20×20px, border-radius 6px) — for `KOLEJ KEDIAMAN` category

**`mode = 'dot'`** — small colored dot for low-zoom non-priority markers:
- 12×12px circle, category background color, `2px solid white` border

`createMarker(location)` stores `marker._location = location` so `updateMarkerModes()` can re-evaluate the icon on zoom changes.

Markers use `permanent: true` tooltip but are **hidden by default via CSS** (`opacity: 0; pointer-events: none`). They become visible via:
- **Hover** — `mouseover` on marker (or `mouseenter` on tooltip element) adds `.tooltip-visible`; if currently a dot, icon is temporarily upgraded to full on hover and reverted on `mouseout`
- **Click (sticky)** — adds `.tooltip-visible` + `.expanded`, persists until closed

This solves the problem of non-permanent tooltips disappearing when the mouse moves from marker to tooltip content.

### 4a. Zoom-Based Marker Tiers

Constants (top of `script.js`):
```js
const ZOOM_FULL_DESKTOP   = 17.5;
const ZOOM_FULL_MOBILE    = 17;
const PRIORITY_CATEGORIES = ['PENTADBIRAN & PTJ', 'BLOK AKADEMIK & KELAS', 'BLOK FAKULTI & PUSAT PENGAJIAN'];
```

`shouldShowFullMarker(location)` returns `true` (use full icon) when any condition holds:
1. Location is in `PRIORITY_CATEGORIES`
2. `map.getZoom() >= threshold` (17.5 desktop / 17 mobile)
3. `location.id === currentSelectedLocationId`
4. `location.locationType === currentActiveCategory`
5. `currentHighlightedMarker._location.id === location.id`

`updateMarkerModes()` — called on `zoomend`, iterates `markers[]`, calls `marker.setIcon()` in-place. After `setIcon()`, re-applies `.marker-highlighted` class if this is the highlighted marker (Leaflet replaces the DOM element on `setIcon`, losing the class).

`setMarkerHighlight(marker)` — sets `currentHighlightedMarker` to the new marker **first**, then reverts the old marker's icon. This order ensures `shouldShowFullMarker` evaluates the old marker without the highlight condition, correctly reverting a previously-selected dot to dot mode.

### 5. Tooltip Interaction

The tooltip has two visual states:

**Default (collapsed)** — just the number code visible on hover (`.tooltip-visible` class)

**Expanded** (`.expanded` class) — shows:
- Full place name + short form
- `i` button → opens info overlay
- `Arah` link → opens Google Maps directions
- `×` button → closes sticky state

Click a marker to toggle sticky/expanded. Click `×` or the map background to close. Opening a new sticky tooltip auto-closes the previous one.

**Mobile tooltip direction**: On mobile (`≤768px`), tooltips appear **above** the marker (`direction: 'top'`) with a downward-pointing arrow. On desktop, tooltips appear to the right (`direction: 'right'`). The `tooltipAnchor` in `createMarkerIcon()` is also set per-breakpoint accordingly.

### 6. Sidebar List (Accordion)

Categories rendered in `DESIRED_ORDER` (defined in `script.js`). Each group:
- Collapsed by default (`.stop-group.collapsed`)
- **Header click: calls `filterByCategory()` directly on both desktop and mobile** — accordion does NOT expand; the category overlay serves as the location list
- Accordion expansion only happens via the "Papar Semua Kategori" toggle button
- Each location item: colored `number` badge + place name + short form
- Locations with `coords === null` get `.no-coords` class (dimmed, cursor:default on map interaction)

### 7. Filtering Modes

| Action | Result |
|---|---|
| `showAllLocations()` | All markers shown, `flyToBounds` to campus; removes category overlay from DOM |
| `filterByCategory(name)` | Only that category's markers, `flyToBounds` to fit (mobile-aware padding); opens category overlay; toggle: clicking same category calls `showAllLocations()` |
| `filterByLocation(loc)` | Only that one marker, zoomed in to max; used on desktop |
| `showLocationOnMap(loc)` | Same as `filterByLocation` but also collapses mobile sheet to peek; used on mobile |

Both `filterByLocation` and `showLocationOnMap` call `clearMarkers()` first, then `createMarker()` for the single location only.

**Mobile `flyToBounds` in `filterByCategory()`** uses asymmetric padding — `paddingTopLeft: [40, 60]` / `paddingBottomRight: [40, 50vh + 20px]` — so all category markers fit in the visible map area above the half-height sheet.

### 8. Info Overlay

Slides over the sidebar content (`.stop-info-overlay`). Shows a location photo at the top of the content area, followed by detail rows.

**Image block** — built in `showLocationInfoOverlay()` before the `innerHTMLString` is assembled:
```js
const folder = CATEGORY_SLUG[location.locationType] ?? 'lain';
const imgBase = `https://raw.githubusercontent.com/unija-info/unija-map/main/kgb/data/kgb-map/images/${folder}/${location.number}`;
```
`CATEGORY_SLUG` maps each `locationType` to a subfolder slug (e.g. `'PENTADBIRAN & PTJ'` → `'pentadbiran'`). The `<img>` starts with `src="${imgBase}.jpg"` and uses chained `onerror` handlers to try `.jpg` → `.png` → `.webp` in order; if all three fail, the image is hidden and the sibling `.info-overlay-image-placeholder` div (grey card, `hide_image` icon, "Tiada Gambar" text) is shown instead. No external placeholder file is required — uses the `material-symbols-outlined` font already loaded on the page.

**Image file convention:** `kgb/data/kgb-map/images/{folder}/{number}.{jpg|png|webp}` on the `main` branch. Upload in any of the three formats; the first found is used.

Contains:
- Location photo (or "Tiada Gambar" placeholder)
- Colored `number` badge + place name heading
- Detail rows: Kategori, Singkatan, Info, and a "no coordinates" warning if applicable
- "🗺️ Buka di Google Maps" link

**Back (`←`) behavior** — two cases controlled by `currentOverlaySource`:
- `currentOverlaySource === 'category'`: overlay animates out, category markers restored (`clearMarkers()` + re-render), category overlay (still in DOM behind) becomes visible, URL updated to `?type=slug`
- `currentOverlaySource === null`: overlay animates out, keeps current map state, URL updated

**Close (`×`) behavior**: animates out, removes overlay, then calls `showAllLocations()` to restore all markers and zoom to campus bounds.

**Category badge**: the "Kategori" detail row renders as `<button class="info-overlay-category-badge">` with the category's background/text color. Tapping it animates the location overlay out and calls `filterByCategory(location.locationType)` — opening the category overlay for that category. Styled as a small colored pill; `cursor: pointer`; hover reduces opacity.

**Switching locations**: if an overlay is already open, the panel updates **in place** via a 120ms cross-fade (fade out → swap content → fade in). The sidebar is never exposed. The slide-in animation only plays on first open.

**Animations**:
- Desktop: `slideInFromLeft` / `slideOutToLeft`
- Mobile: `slideInFromBottom` / `slideOutToBottom` with `top: 24px` offset (leaves handle visible)
- Mobile: auto-expands sheet to `half` state when overlay opens

### 9. Mobile Bottom Sheet

Three height states: `peek` (22vh), `half` (50vh), `full` (90vh).

Drag zones and behavior:
- **Handle** — always moves the sheet directly
- **Header** — always moves the sheet (same as handle)
- **List content** — drag down: scrolls list first, collapses sheet when scroll is at top; drag up: expands sheet first, then allows scrolling when at `full`

Tap the handle to cycle peek → half → full.

Sheet auto-collapses to `peek` when a location or category is selected from the list.

**Tapping the map** (empty area) also collapses the sheet to `peek`.

### 10. Desktop Sidebar

- Width: 400px, fixed left
- Collapse/expand via chevron button (`#sidebar-collapse-btn` / `#sidebar-expand-btn`)
- CSS `~` sibling selectors reposition `.search-container` and show `.sidebar-expand-btn` when `.sidebar.collapsed`
- **Critical DOM order**: `#sidebar` must come before `#sidebar-expand-btn` and `.search-container` in `index.html` for the CSS selectors to work

### 11. Search Dropdown

Real-time search filters both locations and categories. Results appear as dropdown below the search input. Each location result shows three lines: place name + number, category (`.result-subtitle`), and `details` if non-empty (`.result-detail`, truncated with ellipsis). Clicking a result:
- Locations with coords: calls `filterByLocation()` (desktop) or `showLocationOnMap()` (mobile) + `showLocationInfoOverlay()`
- Locations without coords: calls `showLocationInfoOverlay()` only
- Categories: calls `filterByCategory()`

### 12. Toggle Button Label Sync

The "📋 Papar Semua Kategori / Tutup Semua Senarai" button (`#toggle-all-groups`) label is managed by `updateToggleButtonLabel()`, which reads the actual DOM state (checks if any `.stop-group` has `.collapsed`) and sets the correct text. Called by both `toggleAllGroups()` and the category header `onclick` to stay in sync whenever accordion state changes.

### 13. Info Menu Panel

A hamburger icon button (`#info-menu-btn`) is positioned at the right of the search bar (`position: absolute; right: 10px; z-index: 12` — must be above the search input's `z-index: 11`). Clicking it opens `#info-menu-panel`.

**Mobile** (≤768px): panel slides in from the right (`transform: translateX(100%)` → `.open { translateX(0) }`), covers the full screen (`100vw × 100vh`, `z-index: 2001`). `body.style.overflow = 'hidden'` prevents background scroll. `#info-menu-backdrop` (semi-transparent, `z-index: 2000`) appears behind it; clicking the backdrop closes the panel.

**Desktop** (>768px): panel is a 380px popup card (`top: 68px`, `border-radius: 12px`, `box-shadow`), positioned next to the search bar. Uses `opacity`/`translateY` fade-drop animation instead of a slide. Backdrop is transparent (no scroll lock needed).

**Panel content:**
1. **Hero** — `#info-menu-hero`: aerial campus image (`unisza-kgb-aerial.jpg`), `object-fit: cover`, `height: 220px`. Text overlay (`Peta Kampus UniSZA KGB` + `#menu-location-count` subtitle) sits at the bottom via `position: absolute` + linear-gradient. Close button (`#info-menu-close`) is `position: absolute; top: 12px; right: 12px` with frosted-glass background.
2. **Nav** — pill buttons for Peta Bus Stop, 360° Virtual Tour, Menu Utama. `.info-menu-nav { flex-direction: column; align-items: flex-start }` prevents buttons from stretching full width.
3. **Feedback** — thank-you text + "⭐ Beri Rating" and "🐛 Laporkan Masalah" pill buttons (placeholder `href="#"` links).
4. **Version** — `#menu-version` and `#menu-kemaskini` spans (11px, `#80868b`), populated by `fetchMapDataInfo()`.

`openInfoMenu()` sets `panel.style.left` dynamically on desktop based on whether the sidebar is collapsed (70px) or expanded (420px). `closeInfoMenu()` removes `.open` from both panel and backdrop and restores `body.style.overflow`.

**Sidebar changes driven by panel:**
- `#map-data-info` and `.sidebar-nav-footer`: globally `display: none` — superseded by panel
- Mobile: `.sidebar-header h2` and `.sidebar-header .subtitle` hidden — content moved to panel hero
- Mobile: CSS `order` property reorders bottom-sheet content so "Senarai Lokasi" header appears above action buttons (`.list-section-header { order: 1 }`, `.sidebar-header { order: 2 }`, `.company-list { order: 3 }`)

---

## Key Functions in script.js

| Function | Purpose |
|---|---|
| `parseCoords(googleMapLink)` | Extracts `[lat, lng]` from `?q=lat,lng` in URL; Malaysia bounding-box sanity check |
| `processData(rawData)` | Filters blank entries, assigns unique `id` (array index), attaches `coords` |
| `customSort(a, b)` | Alphanumeric sort: letter-prefixed codes (P1, A1) before pure numbers; handles dormitory block codes (A, B...Q) |
| `getCategoryColor(lt)` | Returns hex bg color for a `locationType` string |
| `getCategoryTextColor(lt)` | Returns text color (`'white'`/`'black'`) for a `locationType` string |
| `createMarkerIcon(location, mode)` | Returns `L.divIcon`; `mode='full'` → circle/pill/square; `mode='dot'` → 12px colored dot |
| `createMarker(location)` | Creates marker (mode from `shouldShowFullMarker`), stores `._location`, wires hover/click handlers |
| `shouldShowFullMarker(location)` | Returns `true` if location should use full icon (priority category, zoom ≥ threshold, selected, filtered, or highlighted) |
| `updateMarkerModes()` | Called on `zoomend`; updates all marker icons in-place via `setIcon()`; re-applies `.marker-highlighted` class |
| `setMarkerHighlight(marker)` | Sets highlighted marker; reverts old marker's icon before switching |
| `renderGroupedList()` | Builds 10-category accordion in `#company-list` |
| `showAllLocations(animate?, updateUrl?)` | Clears markers, re-renders all, fits bounds; also removes `.stop-category-overlay` from DOM and resets `currentOverlaySource`. `updateUrl` defaults to `true`; pass `false` on initial load so `handleDeepLink()` can read URL params before they are cleared |
| `filterByCategory(name)` | Shows only one category's markers; calls `showCategoryOverlay()`; mobile sheet → `half`; toggles on repeat click |
| `showCategoryOverlay(categoryName)` | Renders `.stop-category-overlay` panel into sidebar: colored header with back/close buttons, share button, location count subtitle, scrollable location list. Cross-fades if a category overlay is already open (different category). Wires: back/close → `showAllLocations()`; location items → save `currentActiveCategory`, set `currentOverlaySource = 'category'`, call `filterByLocation`/`showLocationOnMap` + `showLocationInfoOverlay()`; share → `copyToClipboard(?type=slug)` |
| `filterByLocation(loc)` | Clears to single marker, zooms in (desktop) |
| `flyToMarker(coords, duration?)` | Pans/zooms to a location with bottom-sheet-aware offset (mobile); reused by both marker tap and list select for consistent positioning |
| `showLocationOnMap(loc)` | Clears to single marker, calls `flyToMarker()`, collapses sheet (mobile) |
| `showLocationInfoOverlay(id)` | Renders info panel with location photo (or placeholder) + detail rows; cross-fades if already open; back button dismisses, close button resets all |
| `initBottomSheet()` | Sets up mobile swipe gesture handlers |
| `setSheetState(state)` | Sets sheet to `'peek'`/`'half'`/`'full'` with CSS transition |
| `initDesktopSidebar()` | Wires collapse/expand button handlers |
| `clearMarkers()` | Removes all markers from map and empties `markers` array |
| `getMapPadding()` | Returns `[top, right, bottom, left]` padding array accounting for sidebar width |
| `loadCampusBoundary()` | Fetches `../data/campus-boundary.json` (local cached polygon); renders as non-interactive `L.polygon()`; fails silently |
| `updateToggleButtonLabel()` | Reads DOM state of all `.stop-group` elements and sets `#toggle-all-groups` button text to match; called after any accordion state change |
| `openInfoMenu()` | Adds `.open` to `#info-menu-panel` and `#info-menu-backdrop`; sets `panel.style.left` on desktop based on sidebar collapse state; locks body scroll on mobile only |
| `closeInfoMenu()` | Removes `.open` from panel and backdrop; restores `body.style.overflow` |
| `slugify(text)` | Converts text to URL-safe slug: lowercase → strip diacritics → replace non-alphanumeric with `-` → trim hyphens. Used for both place names and category names in deep-link URLs |
| `updateURL({ type, location })` | Single source of truth for URL state. Sets `?type=<category-slug>` and/or `#<place-slug>` via `history.replaceState`. Pass no args to clear both. **Always use this — never manipulate `window.location` directly** |
| `showToast(message)` | Shows a fixed bottom-center fade-in/out toast (`#map-toast`). Auto-removes after 2s |
| `copyToClipboard(text)` | Writes text to clipboard; uses `navigator.clipboard` on HTTPS, falls back to `execCommand('copy')` on HTTP (local dev). Always calls `showToast('Pautan disalin!')` |
| `handleDeepLink()` | Reads URL on page load (after `mapData` is ready) and restores map state. Resolution order: `#hash` (location) takes priority over `?type=` (category). Called once in `initMap()` after `showAllLocations(true, false)` |

---

## Styling Notes

- **Mobile breakpoint**: 768px
- **Font**: Google Sans (via Google Fonts)
- **Primary color**: `#1967d2` (buttons, active states, borders)
- **Tooltip visibility**: controlled by `.tooltip-visible` and `.expanded` CSS classes (not Leaflet's open/close)
- **Tooltip hidden state**: `opacity: 0; pointer-events: none` on `.custom-tooltip-popup`
- **Tooltip shown state**: `opacity: 1; pointer-events: auto` on `.custom-tooltip-popup.tooltip-visible, .custom-tooltip-popup.expanded`
- **Bottom sheet states**: CSS classes `.sheet-half`, `.sheet-full` (peek is classless default)
- **Info overlay**: `position: absolute` covers sidebar; animations use `@keyframes slideInFromLeft` etc.
- **Mobile info overlay**: `top: 24px` offset leaves handle bar visible
- **No-coords items**: `.no-coords` class — `opacity: 0.55; cursor: default`
- **Search result detail line**: `.result-detail` — 11px, `#80868b`, `text-overflow: ellipsis`; shown only when `loc.details` is non-empty
- **Campus boundary**: `L.polygon()` with `color: #1967d2`, `weight: 2.5`, `opacity: 0.8`, `fillOpacity: 0.07`; `interactive: false`; fetched from `/kgb/data/campus-boundary.json` (absolute path — relative path breaks on Vercel `cleanUrls`)
- **Dot marker**: 12×12px, `border-radius: 50%`, category bg color, `2px solid white` border, `box-shadow: 0 1px 3px rgba(0,0,0,0.4)`
- **Sidebar nav footer**: `.sidebar-nav-footer` — links to `/kgb/bus-stop/` and `/` (root); `border-top: 1px solid #e8eaed`, 12px muted text; globally `display: none` (superseded by info menu panel)
- **Version/update bar**: `#map-data-info` — globally `display: none`; superseded by info menu panel
- **Hamburger button**: `#info-menu-btn` — `position: absolute; right: 10px; z-index: 12`; z-index must exceed search input's `z-index: 11`
- **Info menu panel (mobile)**: `position: fixed; top: 0; right: 0; width: 100%; height: 100vh; z-index: 2001; transform: translateX(100%)`; `.open { translateX(0) }`
- **Info menu panel (desktop, `min-width: 769px`)**: `width: 380px; top: 68px; border-radius: 12px; opacity/translateY fade-drop animation`; `left` set dynamically via JS in `openInfoMenu()`
- **Info menu hero**: `height: 220px; overflow: hidden`; image `object-fit: cover`; text overlay `position: absolute; bottom: 0` with `linear-gradient(to top, rgba(0,0,0,0.72), transparent)`
- **Info menu close button**: `position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.35); backdrop-filter: blur(4px); border-radius: 50%; color: white`
- **Mobile bottom sheet reorder**: `.list-section-header { order: 1 }`, `.sidebar-header { order: 2 }`, `.company-list { order: 3 }` via CSS flex `order`
- **Mobile title/subtitle hidden**: `.sidebar-header h2, .sidebar-header .subtitle { display: none }` inside `@media (max-width: 768px)`
- **Info overlay image**: `.info-overlay-image-wrap` — `width: 100%; border-radius: 8px; overflow: hidden; margin-bottom: 12px`; `.info-overlay-image` — `width: 100%; max-height: 200px; object-fit: cover`
- **Info overlay image placeholder**: `.info-overlay-image-placeholder` — `display: none` by default; `onerror` sets it to `display: flex`; `height: 110px; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: #bdc1c6; background: #f5f5f5`; icon `font-size: 36px`
- **Info overlay share button**: `.info-overlay-share` — mirrors `.info-overlay-directions` layout (`display: flex; justify-content: center`); grey background `#f1f3f4`; `border: none`; full-width; appears below the Google Maps link
- **Toast**: `#map-toast` — `position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%)` with `opacity`/`translateY` fade animation; `z-index: 9999`; `pointer-events: none`; `.visible` class triggers the transition
- **Category share icon**: `.category-share-btn` — `<span role="button">` inside `.stop-header` (not a `<button>` — nested buttons are invalid HTML); `flex-shrink: 0; margin-right: 4px`; blue on hover
- **Category header label**: `.stop-header-label` — `flex: 1` so it fills available space, pushing the share icon and `::after` chevron to the right. `justify-content: space-between` removed from `.stop-header` when this was added
- **Category overlay**: `.stop-category-overlay` — `position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 100; display: flex; flex-direction: column`; animation `slideInFromLeft` (desktop) / `slideInFromBottom` with `top: 24px` (mobile)
- **Category overlay header**: `.category-overlay-header` — flex row; `border-left: 6px solid {bgColor}` set inline; back/close buttons same size as info overlay equivalents
- **Category overlay share row**: `.category-overlay-share-row` — `padding: 10px 16px 6px; flex-shrink: 0`; sits between header and subtitle
- **Category overlay share button**: `.category-overlay-share` — full-width grey pill button (`#f1f3f4`), flex row with `link` icon
- **Info overlay category badge**: `.info-overlay-category-badge` — `font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; border: none; cursor: pointer`; background/color set inline from category colors; hover reduces opacity

---

## URL / Deep-Link System

### URL Format

```
/kgb/map/                                  → default (all locations, no filter)
/kgb/map/?type=kolej-kediaman              → category filter only
/kgb/map/#canselori                        → location overlay (all markers shown)
/kgb/map/?type=kolej-kediaman#canselori    → location overlay (single marker; type= stored as context)
```

**Slug rule:** `slugify(text)` — lowercase → strip NFD diacritics → replace non-alphanumeric runs with `-` → trim hyphens.

All URL changes use `history.replaceState` — map navigation does **not** add browser history entries. The back button exits the page.

### URL State Machine

| User action | `?type=` | `#hash` |
|---|---|---|
| Page load default | — | — |
| `filterByCategory(X)` | `slugify(X)` | — |
| Category toggled off | — | — |
| `showAllLocations()` | — | — |
| Open overlay (no category active) | — | `slugify(place)` |
| Open overlay (category active) | `slugify(category)` | `slugify(place)` |
| `←` dismiss (from category overlay) | `slugify(category)` | — |
| `←` dismiss (standalone, no category) | — | — |
| `×` close | — | — |
| Tap category badge in location overlay | `slugify(category)` | — |

### Deep-Link Resolution on Load

`handleDeepLink()` runs once after `mapData` is ready, called with `showAllLocations(true, false)` (animate but skip URL clear so params survive):

1. **`#hash` present** → `find` by slug → `filterByLocation()` + `showLocationInfoOverlay()`. If `?type=` also present, sets `currentActiveCategory` silently (no map change) so `←` dismiss correctly restores `?type=` in URL.
2. **`?type=` only** → `filterByCategory()` + accordion expands.
3. **Neither** → normal load.

### Known Constraints

- **Slug collision** — if two locations produce the same slug, `find()` returns the first match. Full place names on this campus are unique in practice.
- **`copyToClipboard()`** — `navigator.clipboard` requires HTTPS. On `http://localhost`, falls back to `execCommand('copy')`.
- **Category share button** is a `<span role="button">` not `<button>` — nesting `<button>` inside `.stop-header <button>` is invalid HTML; browsers hoist inner buttons out of DOM.
- **Leftover debug zoom indicator** — `initMap()` still appends a fixed bottom-right "Zoom: N" div on every load (marked `// DEBUG` / `// END DEBUG` in `script.js`, originally added for v1.7 development). Harmless but shows on production; remove if/when cleaning up.

---

## Development

No build process. Serve locally:

```bash
python -m http.server 8000
# Open: http://localhost:8000/kgb/map/
```

Data is fetched from `../data/kgb-map.json` (relative path), so it works immediately on a local server without needing to push to GitHub.

---

## Manual Testing Checklist

- [ ] Map loads centered on UniSZA campus with all ~110 colored markers
- [ ] Markers are hidden by default; hovering shows the tooltip (number code)
- [ ] Clicking a marker expands tooltip (full name + `i` + `Arah` buttons)
- [ ] Clicking same marker again collapses tooltip
- [ ] `×` in tooltip closes it; opening a new tooltip auto-closes previous
- [ ] Clicking a location in the sidebar list zooms to that location only (all other markers removed)
- [ ] Clicking a category header (desktop) filters to that category's markers
- [ ] Clicking same category header again restores all markers
- [ ] `📍 Papar semua Lokasi` restores all markers and fits campus bounds
- [ ] `i` button in tooltip opens info overlay; `×` closes it and restores all markers
- [ ] Info overlay shows: location photo (or "Tiada Gambar" placeholder), number badge, place name, category, shortForm, details, Google Maps link
- [ ] Locations without an uploaded image show the grey placeholder card with `hide_image` icon
- [ ] Switching between locations while overlay is open updates the image correctly (cross-fade still works)
- [ ] No-coords locations appear in sidebar (dimmed) but don't crash on click
- [ ] Search dropdown filters both locations and categories in real-time
- [ ] Search results show `details` as a third line when non-empty (truncated with ellipsis)
- [ ] Clicking search result: zooms to location (if has coords) + opens info overlay
- [ ] Campus boundary polygon appears on page load (fetched from local `campus-boundary.json`)
- [ ] Campus boundary does not respond to clicks (non-interactive)
- [ ] "📋 Papar Semua Kategori" expands all groups; button changes to "Tutup Semua Senarai"
- [ ] Clicking a category header after "Papar Semua" correctly resets button to "📋 Papar Semua Kategori"
- [ ] Mobile bottom sheet: swipe up/down on handle cycles peek → half → full
- [ ] Mobile: tapping handle cycles through sheet states
- [ ] Mobile: drag down on list scrolls first, then collapses sheet when at top
- [ ] Mobile: selecting a location collapses sheet to peek, shows info overlay at half
- [ ] Mobile: tapping empty map area collapses sheet to peek
- [ ] Mobile: tooltips appear above marker with downward arrow; desktop tooltips appear to the right
- [ ] Mobile: tapping marker and selecting from list both position the marker at the same screen position
- [ ] Info overlay: `←` dismisses panel only, selected marker stays on map
- [ ] Info overlay: `×` dismisses panel and resets to all locations
- [ ] Info overlay: switching between locations cross-fades content (no sidebar flicker)
- [ ] Map cannot zoom out past level 14
- [ ] Hamburger menu "Paparan Peta" section's "Paparan Satelit" toggle switches between satellite and regular (CartoDB Voyager) view
- [ ] Switching to regular view hides the satellite's label overlay; custom map text labels (Tasik UniSZA, Padang New Zealand) remain visible
- [ ] Switching back to satellite view restores the satellite label overlay
- [ ] "Paparan Satelit" toggle reflects current state (checked = satellite, unchecked = regular)
- [ ] Reloading the page after switching views restores the last-selected view (localStorage `kgbMapBaseLayer`)
- [ ] Hamburger menu shows "Paparan Peta" section with "Paparan Satelit", "Penanda Lokasi" and "Nama Tempat & Jalan" toggles, all ON by default
- [ ] Toggling "Penanda Lokasi" OFF hides all campus pins + tooltips on both satellite and regular view; campus boundary and custom map text labels stay visible
- [ ] While markers are OFF, selecting a location from the sidebar list or search still shows that single pin; returning to all-locations/category view hides pins again
- [ ] Toggling "Nama Tempat & Jalan" OFF hides the active label overlay (satellite: `light_only_labels`; regular: `voyager_only_labels`); custom landmark labels (Tasik UniSZA, Padang New Zealand) remain visible regardless
- [ ] Switching base view while labels are OFF keeps labels OFF on the new view, with no leaked label layer from the previous view
- [ ] Reloading the page after changing either toggle restores both states (localStorage `kgbMapShowMarkers`, `kgbMapShowLabels`)
- [ ] "Lokasi Saya (GPS)" toggle is OFF by default on every page load (not persisted)
- [ ] Toggling GPS ON triggers a browser geolocation permission prompt; accepting shows a blue dot + accuracy circle at the device's real position, updating as the device moves
- [ ] Opening a location's info overlay (with coords) always shows both "Buka di Google Maps" (unchanged) and "Dapatkan Arah" — no longer gated on the GPS toggle
- [ ] Tapping "Dapatkan Arah" dismisses the overlay and opens the Directions panel with Start = "Lokasi Saya (GPS)" (auto-resolving) and End = that location; route auto-draws once GPS resolves
- [ ] Toggling GPS OFF removes the dot/accuracy circle and stops further position updates, but does **not** clear an active Directions route/pins
- [ ] Directions icon (`#directions-toggle-btn`, next to hamburger) opens the panel with both fields empty; clicking again closes it
- [ ] Focusing either Start/End field shows "Lokasi Saya (GPS)" pinned at the top of the dropdown even with no text typed
- [ ] Typing in a field filters campus locations and map labels identically to the main search bar; locations with no coords are excluded
- [ ] Picking GPS with the watch OFF shows a one-shot loading state, resolves without turning the hamburger toggle on; picking GPS with the watch ON resolves instantly
- [ ] Selecting a location/map label for a field drops a colored pin (green = start, red = end) in `directionsPinPane`, visually above regular markers and the blue GPS dot
- [ ] Once both fields are set, the route auto-draws with the existing glow/dash polyline styling and distance/duration readout (`X.X km · Y minit (memandu)`); OSRM failure shows "Gagal mengira laluan."
- [ ] Swap button exchanges Start/End (labels, pins, and the route all update)
- [ ] Clearing a single field (×) removes only that field's pin and clears the route
- [ ] Closing the Directions panel removes both pins and the route, and restores the search bar in the same screen slot
- [ ] All of the above behave identically on desktop (>768px) and mobile (≤768px)
- [ ] Desktop sidebar: collapse/expand via chevron button
- [ ] Desktop: search bar repositions when sidebar is collapsed
- [ ] Closing info overlay (`×`) calls `showAllLocations()` — all markers restored
- [ ] Opening info overlay updates URL hash to `#place-slug` (e.g. `#canselori`)
- [ ] If category was active when overlay opened, URL is `?type=slug#place-slug`
- [ ] Closing overlay with `←` removes hash but preserves `?type=` if category was active
- [ ] Closing overlay with `×` clears URL completely
- [ ] Selecting a category updates URL to `?type=slug`; toggling same category clears URL
- [ ] "Salin Pautan" in info overlay copies current URL to clipboard; toast "Pautan disalin!" appears
- [ ] Share icon in category header copies `?type=slug` URL; toast appears; accordion/filter not triggered
- [ ] Deep-link `#place-slug` on page load: single marker, overlay opens, correct location
- [ ] Deep-link `?type=slug` on page load: category filtered, accordion expanded, no overlay
- [ ] Deep-link `?type=slug#place-slug` on page load: single marker + overlay (category param stored in `currentActiveCategory` for correct `←` dismiss)
- [ ] Deep-link with invalid slug: page loads normally, no crash
- [ ] Deep-link to no-coords location: overlay opens, map stays at campus view
- [ ] Toast appears on both desktop and mobile; fades after 2 seconds
- [ ] Clicking a category header (desktop) → category overlay slides in, accordion stays collapsed, map filters
- [ ] Clicking a category header (mobile) → category overlay opens, sheet rises to half height, map filters
- [ ] "Papar Semua Kategori" button still expands all accordion groups (not blocked by new behavior)
- [ ] In category overlay: tapping a location opens location info overlay on top; category overlay stays in DOM
- [ ] In location overlay (from category): `←` closes location overlay, category overlay visible, category markers restored
- [ ] In location overlay (from category): `×` closes both overlays, all markers restored
- [ ] In category overlay: `←` and `×` both reset to all locations
- [ ] "Salin Pautan Kategori" button (below header) copies `?type=slug` URL; toast appears
- [ ] Deep link `?type=slug` → category overlay opens, map filters, mobile sheet at half
- [ ] Deep link `?type=slug#place-slug` → category overlay does NOT open, location overlay opens directly
- [ ] Mobile: all category markers fit in visible map area above the half-height sheet (bottom padding correct)
- [ ] "Kategori" field in location info overlay shows as colored pill badge
- [ ] Tapping the category badge closes the location overlay and opens the category overlay for that category

---

## Adding New Locations

`kgb-map.json` is **auto-generated from a Google Sheet** — do not edit the JSON file directly. Changes will be overwritten on the next sync.

**To add or edit a location:**
1. Open the [Google Sheet](https://docs.google.com/spreadsheets/d/13pyAleVZXs57ox8okhuyt6Rj8EEUx2TZkTzq_JEM7bE/edit?usp=sharing) and edit the **"JSON DATA"** tab
2. Add a row with these columns: `number | place | googleMapLink | locationType | shortForm | details`
3. Get coordinates from Google Maps (right-click on location → copy coordinates) and put them in `googleMapLink` as `https://maps.google.com/?q=LAT,LNG`
4. Click **Campus Map Guide → Update Website Data** in the sheet menu to push to GitHub
5. The live map reflects the change within seconds

**Pipeline:** Google Sheet → `code.gs` (Apps Script) → GitHub API → `kgb-map.json` → live map

To add a new category: add it to `DESIRED_ORDER` in `script.js` and add a color entry to `CATEGORY_COLORS`.

---

## Changelog

Full version history (v1.0–present) lives in [CHANGELOG.md](CHANGELOG.md) — update that file when shipping changes, not this one. Current version: **v2.9** (Category Overlay Panel).
