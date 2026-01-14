# Changelog

All notable changes to the Bus Stop @ UniSZA Gong Badak project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
