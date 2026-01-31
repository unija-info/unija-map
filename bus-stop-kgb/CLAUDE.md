# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static web application ("Bus Stop @ UniSZA Gong Badak") displaying bus stop locations and express bus operators around UniSZA Kampus Gong Badak, Terengganu, Malaysia on an interactive satellite map. Uses vanilla JavaScript with Leaflet.js - no build process required.

## Architecture

### Core Files

- `index.html` - Main HTML entry point
- `script.js` - All application logic (map initialization, filtering, UI interactions)
- `style.css` - All styles including responsive mobile layout
- `data.json` - Bus stop data source (stops, coordinates, company associations)

### Data Model

The application uses a single JSON data structure in `data.json`:
```json
{
  "stops": [
    {
      "id": number,
      "name": "string",
      "coords": [latitude, longitude],
      "companies": ["company1", "company2", ...],
      "tooltipPosition": "left" | "right" (optional, defaults to "right")
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
   - Desktop: slides in from left, slides out to left
   - Mobile: slides up from bottom, slides down to close
   - Mobile: sheet auto-expands to full (90vh), overlay offset 24px for handle visibility
   - Clicking image opens fullscreen view
   - Close button (×) dismisses overlay with animation

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

## Adding New Bus Stops

Edit `data.json`:

```json
{
  "id": 6,
  "name": "New Stop Name",
  "coords": [5.3950, 103.0830],
  "companies": ["Operator 1", "Operator 2"],
  "tooltipPosition": "right"
}
```

- Get coordinates from Google Maps (right-click → coordinates)
- `tooltipPosition` is optional, defaults to "right"

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
| `getStopImageFilename(stopName)` | Maps stop name to image filename |

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

## CSS Sibling Selector Pattern

The HTML structure requires sidebar to come before search container for CSS `~` sibling selectors:
```css
.sidebar.collapsed ~ .search-container { left: 70px; }
.sidebar.collapsed ~ .sidebar-expand-btn { opacity: 1; }
```
