# Changelog — Peta Kampus UniSZA KGB

All notable changes to `kgb/map/` are documented here.

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
