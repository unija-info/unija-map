# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static web application ("Bus Stop @ UniSZA Gong Badak") displaying bus stop locations and express bus operators around UniSZA Kampus Gong Badak, Terengganu, Malaysia on an interactive satellite map. Uses vanilla JavaScript with Leaflet.js - no build process required.

## Architecture

### Core Files

- `index.html` - Main HTML entry point
- `script.js` - All application logic (map initialization, filtering, UI interactions)
- `style.css` - All styles including responsive mobile layout
- `../data/bus-stop.json` - Bus stop data source (stops, coordinates, company associations)
- `../data/bus-stop/image/` - Bus stop photos (`{stopname}.png`); loaded via absolute path `/kgb/data/bus-stop/image/`

### Data Model

The application uses a single JSON data structure in `kgb/data/bus-stop.json`:
```json
{
  "stops": [
    {
      "id": number,
      "name": "string",
      "coords": [latitude, longitude],
      "companies": ["company1", "company2", ...],
      "tooltipPosition": "left" | "right",  // optional, defaults to "right"
      "description": "string"               // optional; shown in sidebar + info overlay when present
    }
  ]
}
```

### Key Architecture Patterns

1. **Map Integration**: Uses Leaflet.js with dual tile layers:
   - Base layer: ArcGIS World Imagery (satellite view)
   - Overlay layer: CartoDB light labels for place names
   - Centered on coordinates [5.3950, 103.0830] (UniSZA area, Terengganu, Malaysia)

2. **State Management**: Global variables track application state:
   - `map` - Leaflet map instance
   - `markers` - Array of current map markers
   - `busData` - Loaded stop data
   - `currentActiveCompany` - Currently selected company filter
   - `currentSelectedStopId` - Track selected stop to prevent repeat animations
   - `currentInfoOverlayStopId` - Track info overlay to prevent duplicate opens
   - `sheetState` - Mobile bottom sheet state: 'peek' (15%), 'half' (50%), or 'full' (90%)
   - Touch tracking variables: `touchStartY`, `touchCurrentY`, `isDragging`, `sheetElement`
   - Content drag variables: `scrollContainer`, `scrollStartTop`, `gestureMode`, `contentTouchStartY`

3. **Filtering System**: Three main filtering modes:
   - **Show All Stops**: Displays all stops with markers
   - **Filter by Stop**: Zooms to specific stop, shows only that stop's marker
   - **Filter by Company**: Shows only stops served by selected company, highlights all matching buttons

4. **UI Components**:
   - Accordion-style sidebar with collapsible stop groups
   - Search bar filters companies/stops in real-time and auto-expands matching groups
   - Clear search button (× icon) appears when search has input
   - Company buttons that toggle active state
   - Mobile: Bottom sheet with swipe/tap gestures (peek/half/full states) instead of toggle button
   - Desktop: Floating sidebar card overlay on left side
   - Hamburger button (`#info-menu-btn`) in the search bar opens the info menu panel

5. **Marker System**: When filtering by company, creates two markers per stop:
   - Ground dot (white circle with blue border, z-index -100)
   - Standard Leaflet marker with bounce animation on selection

6. **Mobile Bottom Sheet** (< 768px width):
   - Three height states: peek (15vh), half (50vh), full (90vh)
   - Swipe up on handle: peek → half → full
   - Swipe down on handle: full → half → peek
   - Tap handle: cycles through all three states
   - **Extended drag controls**: Header and list content also respond to drag gestures
   - **Scroll-aware list dragging**: Drag down scrolls list first, then collapses sheet when at top
   - **Expand-first behavior**: Drag up expands sheet first, then allows list scrolling at full
   - Auto-expands to half when user starts typing in search
   - Uses CSS transitions with cubic-bezier easing for smooth animation
   - Semi-transparent with backdrop-filter blur for modern iOS/Android look

7. **List Section Header**:
   - Title "Senarai Bus Stop" with subtitle instructions above the bus stop list
   - Styled with `.list-section-header` class (flex-shrink: 0 to stay fixed)

8. **Stop Info Overlay**:
   - "i" button in tooltip opens detailed stop info overlay
   - Overlay slides over sidebar content with stop name, image, directions, operators
   - `description` field (if present) shown below stop name in `.info-overlay-header-text` wrapper
   - Desktop: slides in from left, slides out to left
   - Mobile: slides up from bottom, slides down to close
   - Mobile: sheet auto-expands to full (90vh), overlay offset 24px for handle visibility
   - Clicking image opens fullscreen view
   - Close button (×) dismisses overlay with animation

9. **Description Field**:
   - Optional `description` field on each stop in `bus-stop.json`
   - Shown in the **sidebar** (below stop group header, hidden when group is collapsed): `.stop-description` class
   - Shown in the **info overlay** (below stop name, inside `.info-overlay-header-text`): `.info-overlay-description` class
   - Stops without `description` show nothing extra — no empty elements rendered

10. **Info Menu Panel**:
    - Hamburger button (`#info-menu-btn`) is `position: absolute; right: 10px; z-index: 12` inside `.search-container` — above search input's `z-index: 11`
    - `#search-bar` uses `padding-right: 52px` to prevent text going under the button; `.clear-search-btn` is offset to `right: 52px` so both are visible side-by-side
    - **Mobile** (≤768px): `#info-menu-panel` slides in full-screen from the right (`transform: translateX(100%)` → `.open { translateX(0) }`); `body.style.overflow = 'hidden'` locks scroll; `#info-menu-backdrop` (semi-transparent) appears behind and clicking it closes the panel
    - **Desktop** (>768px): panel is a 380px card (`top: 68px`, `border-radius: 12px`, `box-shadow`); uses `opacity`/`translateY` fade-drop animation; backdrop is transparent; `panel.style.left` set dynamically via JS (420px when sidebar expanded, 70px when collapsed)
    - **Panel content**: hero image (`unisza-kgb-aerial.jpg`, 220px, `object-fit: cover`) with gradient text overlay and `#info-menu-close` button; nav section with pill buttons (Peta Kampus UniSZA KGB, bas.my Kuala Terengganu, bas.my Tracker, Menu Utama); feedback section (⭐ Beri Rating, 🐛 Laporkan Masalah)
    - `#menu-stop-count` in subtitle is populated after `busData` loads
    - Note: `.sidebar-nav-footer` was removed — navigation links now live exclusively in the info menu panel

## Development Commands

### Running Locally

Static site with no build process. Use any static file server:

```bash
python -m http.server 8000
# Or: npx serve
# Or: php -S localhost:8000
```

### Manual Testing Checklist

- Map loads centered on UniSZA area with satellite imagery
- "Show All Stops" displays all markers and fits bounds
- Company filtering shows only relevant stops, highlights all matching buttons
- Search dropdown filters both stops and companies
- Mobile bottom sheet: swipe up/down cycles peek (15%) → half (50%) → full (90%)
- Mobile bottom sheet: drag on header moves sheet up/down
- Mobile bottom sheet: drag down on list scrolls first, then collapses when at top
- Mobile bottom sheet: drag up on list expands sheet first, then scrolls when full
- List section header displays "Senarai Bus Stop" title above bus stop list
- Desktop sidebar: collapse/expand via chevron button
- Marker click toggles "Get Directions" and "i" buttons in tooltip
- Click "i" button opens info overlay on sidebar
- Info overlay shows stop name, image, directions, and operators
- Click image in overlay opens fullscreen view
- Click "×" closes overlay with animation
- Mobile: clicking "i" expands bottom sheet to full and shows overlay
- Mobile: handle remains visible and usable with overlay open
- Tooltip arrows point correctly based on `tooltipPosition` (left/right)
- Hamburger button visible in search bar on both desktop and mobile
- Desktop: hamburger opens 380px popup card; clicking outside (backdrop) closes it
- Desktop: popup card shifts left when sidebar is collapsed
- Mobile: hamburger opens full-screen panel sliding from right; body scroll is locked
- Info panel: stop count in subtitle matches actual number of stops (5)
- Info panel: nav buttons (Peta Kampus, bas.my KT, bas.my Tracker, Menu Utama) open correct URLs
- Info panel: feedback buttons link to correct rating/report pages
- Close button (×) in hero dismisses the panel

## Adding New Bus Stops

Edit `kgb/data/bus-stop.json`:

```json
{
  "id": 6,
  "name": "New Stop Name",
  "coords": [5.3950, 103.0830],
  "companies": ["Operator 1", "Operator 2"],
  "tooltipPosition": "right",
  "description": "Optional direction note, e.g. Perjalanan menghala ke Utara/Kota Bharu."
}
```

- Get coordinates from Google Maps (right-click → coordinates)
- `tooltipPosition` is optional, defaults to "right"
- `description` is optional — omit entirely for stops with no direction note

## Key Functions in script.js

| Function | Purpose |
|----------|---------|
| `initMap()` | Map setup, center point [5.3950, 103.0830], tile layers |
| `filterByStop(stop)` | Zoom to specific stop, show single marker |
| `filterByCompany(name)` | Show all stops for a company, highlight buttons |
| `createMarker(stop, isSelected)` | Creates marker with permanent tooltip |
| `initBottomSheet()` | Mobile swipe gesture setup for handle, header, and list |
| `setSheetState(state)` | Set bottom sheet height ('peek'/'half'/'full') |
| `initDesktopSidebar()` | Desktop collapse/expand button handlers |
| `handleContentTouchStart/Move/End` | Scroll-aware touch handlers for company list |
| `handleHeaderTouchStart/Move/End` | Touch handlers for sidebar header (always moves sheet) |
| `showStopInfoOverlay(stopId)` | Opens info overlay with stop details on sidebar |
| `openFullscreenImage(name, file)` | Opens fullscreen image overlay |
| `loadImage(img, base, onMissing)` | Loads image with `.png`→`.jpg`→`.webp` onerror chain; calls `onMissing()` if all fail |
| `openInfoMenu()` | Opens info panel; sets `panel.style.left` dynamically on desktop; locks body scroll on mobile |
| `closeInfoMenu()` | Closes info panel and backdrop; restores `body.style.overflow` |

## Styling Notes

- **Mobile breakpoint**: 768px
- **Primary color**: #1967d2 (blue for buttons, borders, active states)
- **Marker animation**: Uses `margin-top` instead of `transform` to avoid GPS coordinate conflicts
- **Bottom sheet states**: CSS classes `.sheet-half`, `.sheet-full` (peek is default)
- **Tooltip expansion**: `transform: translateY(-20px)` shifts tooltip up when "Get Directions" appears
- **Tooltip arrows**: Positioned via `.popup-content-wrapper::after`, direction based on `.leaflet-tooltip-left`/`.leaflet-tooltip-right`
- **Info overlay**: `.stop-info-overlay` uses `position: absolute` to cover sidebar
- **Info overlay animations**: Desktop uses `slideInFromLeft`/`slideOutToLeft`, mobile uses `slideInFromBottom`/`slideOutToBottom`
- **Mobile info overlay**: `top: 24px` offset leaves handle visible
- **Description (sidebar)**: `.stop-description` — 12px, `#5f6368`, `padding: 0 20px 10px`; hidden via `.stop-group.collapsed .stop-description { display: none }`
- **Description (overlay)**: `.info-overlay-description` inside `.info-overlay-header-text` wrapper (flex column) — 12px, `#5f6368`; `.info-overlay-header` uses `display: flex; justify-content: space-between` so the wrapper keeps name+description left-aligned while the × button stays right
- **Hamburger button**: `#info-menu-btn` — `position: absolute; right: 10px; z-index: 12`; above search input's `z-index: 11`
- **Search bar right padding**: `52px` to clear the hamburger button; `.clear-search-btn` at `right: 52px`
- **Info menu panel (mobile)**: `position: fixed; top: 0; right: 0; width: 100%; height: 100vh; z-index: 2001; transform: translateX(100%)`; `.open { translateX(0) }`
- **Info menu panel (desktop, `min-width: 769px`)**: `width: 380px; top: 68px; border-radius: 12px`; `opacity`/`translateY` fade-drop animation; `left` set dynamically via JS
- **Info menu hero**: `height: 220px; overflow: hidden`; image `object-fit: cover`; text overlay `position: absolute; bottom: 0` with `linear-gradient(to top, rgba(0,0,0,0.72), transparent)`
- **Info menu close button**: `position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.35); backdrop-filter: blur(4px); border-radius: 50%; color: white`
- **Sidebar nav footer**: removed — navigation links moved to info menu panel

## CSS Sibling Selector Pattern

The HTML structure requires sidebar to come before search container for CSS `~` sibling selectors:
```css
.sidebar.collapsed ~ .search-container { left: 70px; }
.sidebar.collapsed ~ .sidebar-expand-btn { opacity: 1; }
```

## Changelog

### v1.4 — Info Menu Panel
- **Hamburger button** (`#info-menu-btn`) added to right of search bar; `z-index: 12` above search input
- **Info menu panel** (`#info-menu-panel`): full-screen right-slide on mobile, 380px popup card on desktop
- Panel content: hero aerial image with gradient text overlay, nav pill buttons (Peta Kampus UniSZA KGB, bas.my Kuala Terengganu, bas.my Tracker, Menu Utama), feedback buttons (⭐ Beri Rating, 🐛 Laporkan Masalah)
- `#menu-stop-count` in subtitle populated after `busData` loads
- `openInfoMenu()` / `closeInfoMenu()` functions; backdrop click closes panel on desktop
- `.sidebar-nav-footer` removed from sidebar — navigation links consolidated into info menu panel
- `#search-bar` `padding-right` bumped to `52px`; `.clear-search-btn` moved to `right: 52px` to avoid overlapping the hamburger button

### v1.3 — Image & Overlay Polish
- **Convention-based images**: `"image"` basename field added to `bus-stop.json` (e.g. `"image": "hosza"`); `getStopImageFilename()` replaced by `loadImage(img, base, onMissing)` with `.png`→`.jpg`→`.webp` onerror chain
- **Marker highlight glow**: `.marker-highlighted` CSS class adds `filter: drop-shadow` on selection; `setMarkerHighlight(marker)` manages state; `clearMarkers()` resets `currentHighlightedMarker`
- **Cross-fade overlay switching**: switching stops while info overlay is open fades content in-place (120ms opacity) — sidebar never exposed; slide-in animation only plays on first open
- **← back vs × close**: back button (chevron SVG) dismisses overlay only; close button (×) dismisses and calls `showAllStops()`; back button uses same SVG icon as sidebar collapse button

### v1.2 — Mobile UX Improvements
- **flyToMarker with sheet offset**: `flyToMarker(coords, duration?)` projects coords to screen pixels, shifts down by 15% viewport height (peek sheet height), unprojects — marker appears in visible area above sheet; used by both marker tap and list select
- **Mobile zoom gestures**: Leaflet `doubleClickZoom` disabled on mobile (≤768px); double-tap (300ms/40px threshold) → `setZoomAround(+1)`; hold one finger (≥150ms) + tap second finger (<300ms) → `zoomOut(1)`
- **`minZoom: 13`** prevents disorienting zoom-out on `L.map()` init

### v1.1 — Search & Filtering Improvements
- **Search opens info overlay**: clicking a stop result in the search dropdown calls `filterByStop(stop)` + `showStopInfoOverlay(stop.id)` in one action
- **Description in search**: `renderSearchResults()` filter includes `stop.description`; result shows name → description (if present) → companies
- **`updateToggleButtonLabel()`**: reads actual DOM state (`.collapsed` on `.stop-group`) to set correct label; called from `toggleAllGroups()`, group header `onclick`, and end of `renderGroupedList()`

### v1.0 — Initial Release
- Interactive Leaflet.js satellite map centered on UniSZA Gong Badak (`[5.3950, 103.0830]`)
- 5 bus stops from `kgb/data/bus-stop.json`; accordion sidebar with collapsible stop groups
- Filtering by stop (single marker, zoom in) and by company (all matching stops)
- Permanent tooltip with "Get Directions" link and "i" info button
- Info overlay slides over sidebar: stop name, image, directions link, operator list
- Mobile bottom sheet (peek/half/full), desktop collapsible sidebar
- Real-time search dropdown filtering stops and companies
