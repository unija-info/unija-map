# Changelog — Peta Kampus UniSZA KGB

All notable changes to `kgb/map/` are documented here.

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
