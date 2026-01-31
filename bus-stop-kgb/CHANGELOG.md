# Changelog

All notable changes to the Bus Stop @ UniSZA Gong Badak project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.0] - 2026-01-31

### Added
- **Info Button on Tooltips**:
  - New "i" button appears next to "Get Directions" when tooltip expands
  - Circular blue button with italic serif "i" icon
  - Opens detailed stop info overlay on sidebar

- **Stop Info Overlay Panel**:
  - Full-height overlay slides over sidebar content
  - Shows stop name, image (clickable for fullscreen), directions button, and operator list
  - Smooth slide-in/out animations
  - Close button (×) to dismiss overlay
  - Prevents duplicate opens when same stop info is already displayed

- **Mobile Bottom Sheet Integration**:
  - Info overlay appears inside bottom sheet on mobile
  - Bottom sheet automatically expands to full height (90vh) when info button clicked
  - Overlay positioned below handle (24px offset) so sheet remains controllable
  - Handle stays visible and functional with overlay open

- **Mobile-Specific Animations**:
  - Opening: Slides up from bottom (translateY)
  - Closing: Slides down to bottom
  - Desktop maintains left-to-right slide animation

### Technical Details
- New tracking variable: `currentInfoOverlayStopId` prevents duplicate overlay triggers
- `showStopInfoOverlay(stopId)` function creates and manages overlay
- Mobile detection: `window.innerWidth <= 768` triggers sheet expansion
- CSS keyframes: `slideInFromBottom`, `slideOutToBottom` for mobile animations
- Overlay uses `position: absolute` with `top: 24px` on mobile for handle visibility

---

## [2.5.0] - 2026-01-27

### Added
- **Extended Mobile Bottom Sheet Drag Controls**:
  - Entire sheet content (sidebar header + bus stop list) now responds to drag gestures
  - Scroll-aware behavior: dragging down on list scrolls first, then collapses sheet when at top
  - Dragging up expands sheet first (peek → half → full), then allows list scrolling at full
  - Header area always moves sheet directly (no scrollable content)
  - Handle maintains original behavior (tap cycles states, drag moves sheet)

- **List Section Header**:
  - Added "Senarai Bus Stop" title above the bus stop list
  - Subtitle: "Sila click/tap pada nama bus stop untuk melihat senarai operator bas"
  - Provides context and instructions for users

### Technical Details
- New state variables: `scrollContainer`, `scrollStartTop`, `gestureMode`, `contentTouchStartY`
- New touch handlers: `handleContentTouchStart/Move/End` (scroll-aware for company list)
- New touch handlers: `handleHeaderTouchStart/Move/End` (always moves sheet)
- `gestureMode` flag prevents jittery switching between scroll and sheet movement mid-gesture
- Added `.list-section-header` CSS class with title/subtitle styling

---

## [2.4.0] - 2026-01-26

### Added
- **"See on Map" Button Per Stop (Mobile)**:
  - Each bus stop now has a dedicated "See on map" button below the header
  - Button appears on its own row, separate from the accordion toggle
  - Tapping the button zooms to that stop and collapses the bottom sheet to peek
  - Tapping the stop header still expands/collapses the accordion (no zoom on mobile)
  - Button hidden on desktop - current desktop behavior preserved

- **Bottom Sheet Auto-Expand**:
  - "Papar Semua Operator" button now fully expands the bottom sheet on mobile
  - Allows users to see all operators without manually dragging the sheet

### Changed
- **"See on Map" Button Styling**:
  - Pill-shaped button with `border-radius: 50px`
  - Google Sans font family for consistency
  - Teal color scheme: `#c2eaf2` background, `#014f5a` text
  - Compact inline-flex layout (not full-width)
  - Left margin alignment within button row

### Fixed
- **Search Bar Position on Mobile**:
  - Changed from `position: absolute` to `position: fixed`
  - Search bar now stays fixed at top of viewport
  - No longer moves when scrolling content inside the bottom sheet

### Technical Details
- Added `.stop-map-btn-row` container for button positioning (hidden on desktop via CSS)
- New `showStopOnMap()` function for mobile-specific zoom behavior
- Updated `toggleAllGroups()` to expand sheet to full state when expanding operators
- CSS fix in mobile media query for search container positioning

---

## [2.3.0] - 2026-01-26

### Added
- **Google Maps-style Search Dropdown**:
  - Search results now appear in a dropdown below the search bar (like Google Maps autocomplete)
  - Stop results show 📍 icon with stop name and associated companies
  - Company results show 🚌 icon with company name and stop count
  - Clicking a stop result zooms to that location
  - Clicking a company result filters all stops served by that company
  - Dropdown closes on click outside, Escape key, or after selection
  - Clear search button (×) in search bar for quick clearing

- **Tooltip Close Button**:
  - Added × button to top-right of tooltip when a specific stop is focused
  - Button only appears in "single focus" mode (after clicking search result or sidebar stop)
  - Button hidden in default view showing all stops
  - Clicking × zooms out and shows all bus stops (same as "Papar semua Lokasi Bus Stop")

- **Desktop Collapsible Sidebar**:
  - Sidebar attached to left edge of screen (Google Maps style)
  - Collapse button (chevron) in sidebar header to minimize
  - Expand button appears when sidebar is collapsed
  - Map padding adjusts dynamically based on sidebar state
  - Smooth CSS transitions for collapse/expand animations
  - Search bar and expand button repositioning via CSS sibling selectors

### Changed
- **Search Architecture**:
  - Search results moved from sidebar filtering to dedicated dropdown
  - Sidebar now remains static and shows all stops/companies at all times
  - Independent search functionality that doesn't modify sidebar content

- **HTML Structure**:
  - Reordered sidebar, expand button, and search container for CSS sibling selectors
  - Added `#search-results` container inside `.search-container`
  - Added collapse/expand button elements

### Technical Details
- Implemented `renderSearchResults()` function for dropdown HTML generation
- Added `initSearchDropdown()` for event handling (input, click, escape, outside click)
- Used CSS class `.show-close-btn` to conditionally display tooltip close button
- `filterByStop()` adds close button class via `setTimeout` after tooltip DOM ready
- CSS sibling selector (`~`) used to reposition search bar when sidebar collapsed
- Map padding via `getMapPadding()` returns different values based on sidebar state

## [2.2.0] - 2026-01-14

### Added
- Side-by-side button layout for sidebar header controls
- Flexbox-based button container (`.button-group`) for responsive horizontal layout
- Equal width distribution for action buttons using `flex: 1`

### Changed
- **Sidebar Button Layout**:
  - Changed "Show All Locations" and "Show All Operators" buttons from stacked (vertical) to side-by-side (horizontal) layout
  - Buttons now appear next to each other on both desktop and mobile views
  - Maintained 8px gap between buttons using flexbox `gap` property
  - Each button takes 50% of available width with equal distribution
  - Improved visual hierarchy and better use of horizontal space

### Technical Details
- Added `.button-group` wrapper div in HTML ([index.html:26-29](index.html#L26-L29))
- Implemented flexbox container with `display: flex`, `gap: 8px`, `width: 100%` ([style.css:129-134](style.css#L129-L134))
- Changed button width from `width: 100%` to `flex: 1` for equal distribution ([style.css:99](style.css#L99))
- No JavaScript changes required - purely HTML/CSS layout modification
- Maintains all existing button functionality (zoom to all stops, expand/collapse operators)
- Responsive across all screen sizes without media queries

## [2.1.0] - 2026-01-14

### Added
- Dynamic tooltip width with `width: max-content` for better text fitting
- Configurable minimum tooltip width (200px default)
- Single-line text display option with `white-space: nowrap` support

### Changed
- **Tooltip Styling Improvements**:
  - Reduced vertical padding from 8px to 4px for more compact appearance
  - Changed tooltip text to single-line display (no wrapping)
  - Tooltip width now dynamically adjusts to content width with 5px horizontal padding
  - Minimum width set to 200px (expandable for longer names)
  - Removed fixed min-height constraint to allow natural content sizing

- **Arrow/Triangle Indicator**:
  - Moved arrow pseudo-element from `.custom-tooltip-popup::after` to `.popup-content-wrapper::after`
  - Fixed gap between tooltip box and arrow indicator
  - Changed parent container background to transparent
  - Arrow now seamlessly connects with tooltip box regardless of border-radius value

- **Expanded State Optimization**:
  - Reduced upward shift from -80px to -60px when tooltip expands
  - Minimized gap between tooltip and marker while maintaining clearance
  - Improved visual alignment when "Get Directions" button appears

### Fixed
- **Critical**: Eliminated visible gap/stray line between tooltip box and arrow indicator
- Fixed arrow positioning issue that appeared with larger border-radius values
- Resolved tooltip content sizing issues with transparent parent container
- Fixed box-shadow positioning (moved from parent to content wrapper)
- Corrected text alignment and spacing in collapsed tooltip state

### Technical Details
- Restructured tooltip DOM hierarchy for better arrow attachment
- Implemented transparent parent container pattern (`.custom-tooltip-popup`)
- Centralized visual styling on content wrapper (`.popup-content-wrapper`)
- Arrow now positioned relative to actual content box, not parent container
- Updated CSS architecture:
  - Parent container: Transparent, no visual styling
  - Content wrapper: White background, border-radius, box-shadow
  - Arrow: Attached to content wrapper bottom edge

## [2.0.0] - 2026-01-14

### Added
- Interactive tooltip system with expandable "Get Directions" button
- Click-to-expand tooltip functionality with smooth transitions
- Collapsible accordion-style bus stop groups in sidebar
- "Show All Operators" / "Close All Lists" toggle button
- Advanced search functionality for both stop names and company names
- Auto-expand accordion groups when searching
- Text wrapping support for long location names
- Responsive tooltip positioning (30px right offset from markers)

### Changed
- **BREAKING**: Tooltip UI/UX completely redesigned
  - Tooltips now permanently visible with stop names
  - "Get Directions" button hidden by default, shows on marker click
  - Tooltips expand upward when button appears to prevent marker overlap
  - Only one tooltip can be expanded at a time
- Improved tooltip compactness with reduced padding and spacing
- Updated tooltip dimensions:
  - Collapsed height: Dynamic (content-based)
  - Expanded height: 75px minimum
  - Minimum width: 200px with flexible width for longer names
- Refined typography:
  - Stop name font size: 14px
  - Line height: 1.3 for better readability
  - Button padding: 8px 16px for compact appearance
- Enhanced visual design:
  - Tooltip padding: 4px 5px (reduced vertical padding)
  - Negative margin offset: -60px for upward expansion (optimized)

### Fixed
- Tooltip no longer overlaps marker icon when expanded
- Fixed toggle behavior - clicking marker twice now properly collapses tooltip
- Resolved text overflow issues for long location names
- Fixed tooltip width calculation for absolutely positioned elements
- Corrected empty space issue below non-wrapped text
- Fixed tooltip button visibility toggle logic

### Technical Details
- Implemented absolute positioning for stop name and button elements
- Added negative margin-top technique for upward tooltip expansion
- Utilized CSS transitions (300ms ease) for smooth animations
- Implemented word-wrap and overflow-wrap for proper text handling
- Used `max-width: 100%` constraint to prevent text overflow
- Added proper z-index layering for button (z-index: 2) and stop name (z-index: 1)

## [1.0.0] - Initial Release

### Added
- Interactive map with Leaflet.js showing bus stops around UniSZA Gong Badak
- Satellite imagery base layer with labels overlay
- Marker-based bus stop locations
- Sidebar with company/operator list
- Basic tooltip functionality
- Search functionality for bus stops
- Mobile-responsive design with toggle view
- Google Maps directions integration
- JSON-based data structure for bus stops and companies
