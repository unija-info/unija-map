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
  index.html    ← HTML shell (map, sidebar, search, mobile toggle)
  script.js     ← All application logic
  style.css     ← All styles
  CLAUDE.md     ← This file

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
- **Base layer**: ArcGIS World Imagery (satellite)
- **Overlay layer**: CartoDB Positron labels (place names)
- **Campus boundary**: fetched from `../data/campus-boundary.json` (local cached coords for OSM Way 1120569731) via `loadCampusBoundary()` on init; rendered as non-interactive `L.polygon()` in `#1967d2`
- **Zoom control**: bottom-right
- **Mobile zoom gestures**: Leaflet's `doubleClickZoom` is disabled on mobile (≤768px) and replaced with custom touch handlers:
  - **Double tap** (one finger, within 300ms, within 40px) → `setZoomAround()` zoom in 1 level at tap position
  - **Hold one finger (≥150ms) + tap with second finger (<300ms)** → `zoomOut(1)`; mirrors Google Maps two-finger zoom-out
  - Pinch zoom unaffected (second finger held >300ms hands off to Leaflet); desktop `dblclick` zoom untouched

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
- Header click: expands/collapses accordion + calls `filterByCategory()` on desktop
- Mobile: separate "📍 Lihat di peta" button row to trigger `filterByCategory()`
- Each location item: colored `number` badge + place name + short form
- Locations with `coords === null` get `.no-coords` class (dimmed, cursor:default on map interaction)

### 7. Filtering Modes

| Action | Result |
|---|---|
| `showAllLocations()` | All markers shown, `flyToBounds` to campus |
| `filterByCategory(name)` | Only that category's markers, `flyToBounds` to fit; toggle: clicking same category again calls `showAllLocations()` |
| `filterByLocation(loc)` | Only that one marker, zoomed in to max; used on desktop |
| `showLocationOnMap(loc)` | Same as `filterByLocation` but also collapses mobile sheet to peek; used on mobile |

Both `filterByLocation` and `showLocationOnMap` call `clearMarkers()` first, then `createMarker()` for the single location only.

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

**Back (`←`) behavior**: animates out, removes overlay, keeps current map state (selected marker stays visible).

**Close (`×`) behavior**: animates out, removes overlay, then calls `showAllLocations()` to restore all markers and zoom to campus bounds.

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
| `showAllLocations()` | Clears markers, re-renders all, fits bounds |
| `filterByCategory(name)` | Shows only one category's markers; toggles on repeat click |
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
- [ ] Desktop sidebar: collapse/expand via chevron button
- [ ] Desktop: search bar repositions when sidebar is collapsed
- [ ] Closing info overlay (`×`) calls `showAllLocations()` — all markers restored

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

### v1.0 — Initial Release
- Created `kgb/map/` sub-project: `index.html`, `script.js`, `style.css`
- Adapted from `bus-stop-kgb/` architecture for campus locations
- Data source: `../data/kgb-map.json` (fetched via relative path, cache-busted with `Date.now()`)
- 10 category color system with `CATEGORY_COLORS` lookup and CSS custom properties
- `parseCoords()` to extract lat/lng from `googleMapLink` URL (`?q=lat,lng`)
- `processData()` assigns unique `id` (array index) to handle duplicate `number` values across categories
- `customSort()` ported from `kgb/script.js` — letter-prefix before pure-number sort
- Colored `L.divIcon` markers: circle (≤3 chars) and pill (≥4 chars)
- Permanent tooltips (hidden by default) with hover-reveal and click-to-expand/sticky behavior
- 10-category accordion sidebar with "📍 Lihat di peta" mobile button per category
- Text-only info overlay (no images) — slides in from left on desktop, bottom on mobile
- All mobile bottom sheet touch logic and desktop sidebar collapse/expand ported verbatim from `bus-stop-kgb/`

### v1.1 — Tooltip Hover Fix
- Changed tooltip to `permanent: true` (always in DOM) but hidden via CSS (`opacity: 0; pointer-events: none`)
- Added `.tooltip-visible` CSS class — applied via JS `mouseover`/`mouseenter` on both marker and tooltip element
- This fixes the race condition where non-permanent tooltips disappeared before inner buttons could be clicked (mouse moving from marker to tooltip triggered `mouseout` → tooltip closed)
- Sticky state (`.expanded`) persists tooltip after click regardless of mouse position
- `map.on('click')` clears all sticky/visible states

### v1.2 — Single-Marker Focus on Location Select
- `filterByLocation()` and `showLocationOnMap()` now call `clearMarkers()` before creating the selected location's marker
- Selecting a location from the sidebar list or search results hides all other markers
- Both functions also reset `currentActiveCategory` and clear `.category-active` header highlights
- "Papar semua Lokasi" and closing the info overlay (`×`) both restore all markers via `showAllLocations()`

### v1.3 — Info Overlay Close Restores All Markers
- `showLocationInfoOverlay()` close button (`×`) now calls `showAllLocations()` after the slide-out animation completes
- Closing the details pane zooms the map back to the full campus view with all markers

### v2.7 — Mobile Zoom Gestures
- Leaflet's `doubleClickZoom` disabled on mobile (≤768px); replaced with custom touch handlers
- **Double tap** (one finger) → `setZoomAround()` zoom in 1 level at tap position — same feel as Leaflet default
- **Hold one finger + tap second finger** → `zoomOut(1)` — mirrors Google Maps two-finger zoom-out gesture
- Pinch zoom and desktop double-click zoom unaffected

### v2.6 — Multi-Format Image Support
- Info overlay image loading now tries `.jpg` → `.png` → `.webp` in order before falling back to the "Tiada Gambar" placeholder
- Implemented via chained `onerror` handlers on the `<img>` element — each failure updates `this.src` to the next extension; if all three fail, image is hidden and sibling placeholder shown
- No folder structure or `kgb-map.json` schema changes — upload the image in any supported format

### v2.5 — Location Images in Info Overlay
- `CATEGORY_SLUG` constant maps each `locationType` to its image subfolder slug
- `showLocationInfoOverlay()` builds image URL by convention (`kgb/data/kgb-map/images/{folder}/{number}.jpg`) from existing fields — no schema changes
- `<img>` with `onerror` fallback: hides image and shows sibling `.info-overlay-image-placeholder` div when the file is missing
- CSS: `.info-overlay-image-wrap`, `.info-overlay-image`, `.info-overlay-image-placeholder`, `.info-overlay-image-placeholder .material-symbols-outlined`

### v2.4 — Info Menu Panel
- **Hamburger button** (`#info-menu-btn`) added to right of search bar; `z-index: 12` to appear above search input
- **Info menu panel** (`#info-menu-panel`): full-screen right-slide on mobile, 380px popup card on desktop
- Panel sections: hero image with gradient text overlay, nav pill buttons (Bus Stop / 360° VT / Menu Utama), feedback pill buttons, version/kemaskini
- `openInfoMenu()` / `closeInfoMenu()` functions; backdrop click closes panel
- `#map-data-info` and `.sidebar-nav-footer` globally hidden (display: none) — superseded by panel
- Mobile: sidebar title/subtitle hidden; CSS `order` reorders sheet: "Senarai Lokasi" header → action buttons → accordion list

### v1.5 — Navigation & Campus Boundary Fix
- **Sidebar nav footer**: added `.sidebar-nav-footer` at bottom of sidebar with links to `/kgb/bus-stop/` (Peta Bus Stop) and `/` (Kembali ke menu utama)
- **Campus boundary local cache**: `loadCampusBoundary()` now fetches `../data/campus-boundary.json` instead of querying Overpass API — eliminates 504 timeout failures; polygon loads reliably on every page load
- `kgb/data/campus-boundary.json` contains 45 hardcoded lat/lon pairs for OSM Way 1120569731

### v1.4 — Mobile UX Improvements
- **Bottom sheet collapses on map tap**: tapping empty map area on mobile collapses sheet to `peek`; marker taps are unaffected (stopPropagation)
- **Back vs close buttons differentiated**: `←` dismisses the info overlay only (keeps selected marker); `×` resets to all locations
- **Mobile tooltips appear above marker**: `direction: 'top'` with downward-pointing CSS arrow on mobile; desktop remains `direction: 'right'`; `tooltipAnchor` set per-breakpoint in `createMarkerIcon()`
- **Consistent marker focus position**: extracted `flyToMarker(coords)` helper used by both marker tap and list select — same bottom-sheet-aware offset calculation for both paths
- **Info overlay cross-fade on location switch**: switching between locations while overlay is open cross-fades in place (120ms) instead of remove + slide-in; sidebar never exposed during transition
- **`minZoom: 14`** added to `L.map()` options to prevent zooming out past campus view
- **"Papar semua Lokasi" zoom fixed**: `flyTo` now uses mobile `16`, desktop `14` to match initial load zoom
