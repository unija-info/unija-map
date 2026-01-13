# Changelog

All notable changes to the Bus Stop @ UniSZA Gong Badak project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Collapsed height: 32px (reduced from 46px)
  - Expanded height: 75px (reduced from 110px)
  - Minimum width: 200px with flexible width for longer names
- Refined typography:
  - Stop name font size: 14px
  - Line height: 1.3 for better readability
  - Button padding: 8px 16px for compact appearance
- Enhanced visual design:
  - Tooltip padding: 8px 0px (vertical only)
  - Stop name padding: 0px 15px (horizontal only)
  - Negative margin offset: -80px for upward expansion

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
