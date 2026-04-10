# CLAUDE.md — kgb/map/

This file provides guidance to Claude Code when working with the `kgb/map/` sub-project.

## Project Overview

**Peta Kampus UniSZA KGB** — an interactive Leaflet.js campus map for UniSZA Kampus Gong Badak. Displays ~110 campus locations (buildings, facilities, accommodation blocks, etc.) as colored markers on a satellite map. Data is sourced from `kgb/data/map.json`, the same file used by `kgb/index.html`.

This project is a structural adaptation of `bus-stop-kgb/` — same layout, same mobile/desktop UX patterns, but tailored for campus locations instead of bus stops.

Pure static HTML5/CSS3/Vanilla JS — no npm, no build tools. Uses Leaflet.js 1.9.4 via CDN.

---

## Core Files

```
kgb/map/
  index.html    ← HTML shell (map, sidebar, search, mobile toggle)
  script.js     ← All application logic
  style.css     ← All styles
  CLAUDE.md     ← This file

kgb/data/map.json   ← Data source (NOT inside kgb/map/)
```

---

## Data Model

Data is fetched from `../data/map.json` (relative path from `kgb/map/`):

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
| `markers` | Array | Currently rendered Leaflet markers |
| `mapData` | Array | Processed location data (from `processData()`) |
| `currentActiveCategory` | string\|null | Category currently filtered/highlighted |
| `currentSelectedLocationId` | number\|null | `id` of currently selected single location |
| `currentInfoOverlayLocationId` | number\|null | `id` of location whose info overlay is open |
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

### 3. Map Setup

- **Center**: `[5.3950, 103.0830]` (UniSZA Gong Badak area)
- **Default zoom**: 16
- **Base layer**: ArcGIS World Imagery (satellite)
- **Overlay layer**: CartoDB Positron labels (place names)
- **Zoom control**: bottom-right

### 4. Marker System

Each location gets an `L.divIcon` colored circle/pill:
- **Circle** (32×32px, border-radius 50%) — for number codes 1–3 characters (`P1`, `A5`, `K3`)
- **Pill** (44×22px, border-radius 11px) — for 4+ character codes (`USM`, `UKS`, etc.)

Markers use `permanent: true` tooltip but are **hidden by default via CSS** (`opacity: 0; pointer-events: none`). They become visible via:
- **Hover** — `mouseover` on marker or `mouseenter` on tooltip element adds `.tooltip-visible`
- **Click (sticky)** — adds `.tooltip-visible` + `.expanded`, persists until closed

This solves the problem of non-permanent tooltips disappearing when the mouse moves from marker to tooltip content.

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

Slides over the sidebar content (`.stop-info-overlay`). Text-only — no images.

Contains:
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

Real-time search filters both locations and categories. Results appear as dropdown below the search input. Clicking a result:
- Locations with coords: calls `filterByLocation()` (desktop) or `showLocationOnMap()` (mobile) + `showLocationInfoOverlay()`
- Locations without coords: calls `showLocationInfoOverlay()` only
- Categories: calls `filterByCategory()`

---

## Key Functions in script.js

| Function | Purpose |
|---|---|
| `parseCoords(googleMapLink)` | Extracts `[lat, lng]` from `?q=lat,lng` in URL; Malaysia bounding-box sanity check |
| `processData(rawData)` | Filters blank entries, assigns unique `id` (array index), attaches `coords` |
| `customSort(a, b)` | Alphanumeric sort: letter-prefixed codes (P1, A1) before pure numbers; handles dormitory block codes (A, B...Q) |
| `getCategoryColor(lt)` | Returns hex bg color for a `locationType` string |
| `getCategoryTextColor(lt)` | Returns text color (`'white'`/`'black'`) for a `locationType` string |
| `createMarkerIcon(location)` | Returns `L.divIcon` — circle for short codes, pill for long codes |
| `createMarker(location)` | Creates marker + permanent-but-hidden tooltip; wires hover and click handlers |
| `renderGroupedList()` | Builds 10-category accordion in `#company-list` |
| `showAllLocations()` | Clears markers, re-renders all, fits bounds |
| `filterByCategory(name)` | Shows only one category's markers; toggles on repeat click |
| `filterByLocation(loc)` | Clears to single marker, zooms in (desktop) |
| `flyToMarker(coords, duration?)` | Pans/zooms to a location with bottom-sheet-aware offset (mobile); reused by both marker tap and list select for consistent positioning |
| `showLocationOnMap(loc)` | Clears to single marker, calls `flyToMarker()`, collapses sheet (mobile) |
| `showLocationInfoOverlay(id)` | Renders text-only info panel; cross-fades if already open; back button dismisses, close button resets all |
| `initBottomSheet()` | Sets up mobile swipe gesture handlers |
| `setSheetState(state)` | Sets sheet to `'peek'`/`'half'`/`'full'` with CSS transition |
| `initDesktopSidebar()` | Wires collapse/expand button handlers |
| `clearMarkers()` | Removes all markers from map and empties `markers` array |
| `getMapPadding()` | Returns `[top, right, bottom, left]` padding array accounting for sidebar width |

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

---

## Development

No build process. Serve locally:

```bash
python -m http.server 8000
# Open: http://localhost:8000/kgb/map/
```

Data is fetched from `../data/map.json` (relative path), so it works immediately on a local server without needing to push to GitHub.

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
- [ ] Info overlay shows: number badge, place name, category, shortForm, details, Google Maps link
- [ ] No-coords locations appear in sidebar (dimmed) but don't crash on click
- [ ] Search dropdown filters both locations and categories in real-time
- [ ] Clicking search result: zooms to location (if has coords) + opens info overlay
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

Edit `kgb/data/map.json` (not `kgb/map/` — data lives one level up):

```json
{
  "number": "P10",
  "place": "New Building Name",
  "googleMapLink": "https://maps.google.com/?q=5.4010,103.0805",
  "locationType": "PENTADBIRAN & PTJ",
  "shortForm": "NBN",
  "details": "Optional extra info"
}
```

Get coordinates from Google Maps (right-click on location → copy coordinates).

To add a new category: add it to `DESIRED_ORDER` in `script.js` and add a color entry to `CATEGORY_COLORS`.

---

## Changelog

### v1.0 — Initial Release
- Created `kgb/map/` sub-project: `index.html`, `script.js`, `style.css`
- Adapted from `bus-stop-kgb/` architecture for campus locations
- Data source: `../data/map.json` (fetched via relative path, cache-busted with `Date.now()`)
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

### v1.4 — Mobile UX Improvements
- **Bottom sheet collapses on map tap**: tapping empty map area on mobile collapses sheet to `peek`; marker taps are unaffected (stopPropagation)
- **Back vs close buttons differentiated**: `←` dismisses the info overlay only (keeps selected marker); `×` resets to all locations
- **Mobile tooltips appear above marker**: `direction: 'top'` with downward-pointing CSS arrow on mobile; desktop remains `direction: 'right'`; `tooltipAnchor` set per-breakpoint in `createMarkerIcon()`
- **Consistent marker focus position**: extracted `flyToMarker(coords)` helper used by both marker tap and list select — same bottom-sheet-aware offset calculation for both paths
- **Info overlay cross-fade on location switch**: switching between locations while overlay is open cross-fades in place (120ms) instead of remove + slide-in; sidebar never exposed during transition
- **`minZoom: 14`** added to `L.map()` options to prevent zooming out past campus view
- **"Papar semua Lokasi" zoom fixed**: `flyTo` now uses mobile `16`, desktop `14` to match initial load zoom
