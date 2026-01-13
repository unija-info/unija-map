# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static web application called "Bus Stop Locator" that displays bus stop locations and associated bus companies on an interactive map. The application is located in the `bus-stop-kgb/` directory and uses vanilla JavaScript with Leaflet.js for mapping functionality.

## Architecture

### Core Files Structure

- `bus-stop-kgb/index.html` - Main HTML entry point
- `bus-stop-kgb/script.js` - All application logic (map initialization, filtering, UI interactions)
- `bus-stop-kgb/style.css` - All styles including responsive mobile layout
- `bus-stop-kgb/data.json` - Bus stop data source (stops, coordinates, company associations)

### Data Model

The application uses a single JSON data structure in `data.json`:
```json
{
  "stops": [
    {
      "id": number,
      "name": "string",
      "coords": [latitude, longitude],
      "companies": ["company1", "company2", ...]
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
   - `isMapView` - Mobile view toggle state
   - `currentActiveCompany` - Currently selected company filter

3. **Filtering System**: Three main filtering modes:
   - **Show All Stops**: Displays all stops with markers
   - **Filter by Stop**: Zooms to specific stop, shows only that stop's marker
   - **Filter by Company**: Shows only stops served by selected company, highlights all matching buttons

4. **UI Components**:
   - Accordion-style sidebar with collapsible stop groups
   - Search bar filters companies in real-time and auto-expands matching groups
   - Company buttons that toggle active state
   - Mobile responsive with toggle between list/map views

5. **Marker System**: When filtering by company, creates two markers per stop:
   - Ground dot (white circle with blue border, z-index -100)
   - Standard Leaflet marker with bounce animation on selection

## Development Commands

### Running the Application

This is a static site with no build process. To run locally:

```bash
cd bus-stop-kgb
# Use any static file server, for example:
python -m http.server 8000
# Or:
npx serve
```

Then open browser to the provided localhost URL.

### Testing

No automated tests are configured. Manual testing should verify:
- Map loads with correct center point
- All stops appear when "Show All Stops" is clicked
- Company filtering shows only relevant stops
- Search bar filters companies correctly
- Mobile toggle switches between list and map views
- Marker animations work on company selection
- "Get Directions" links open correct Google Maps URLs

## Adding New Bus Stops

To add new stops, edit `bus-stop-kgb/data.json`:

1. Get coordinates from Google Maps (right-click location > coordinates)
2. Add new stop object to the `stops` array with unique `id`
3. Ensure `coords` are in [latitude, longitude] format
4. List all bus companies serving that stop in the `companies` array

## Modifying Map Behavior

Key functions to modify in `script.js`:

- `initMap()` - Map initialization, center point, zoom levels, tile layers
- `filterByStop()` - Behavior when clicking stop headers
- `filterByCompany()` - Behavior when clicking company buttons
- `createMarker()` - Marker appearance, popup content, tooltip styling
- `toggleMobileView()` - Mobile view switching logic

## Styling Notes

- Mobile breakpoint: 768px (defined in media query)
- Active company button uses blue theme (#007bff)
- Marker animations use `margin-top` instead of `transform` to avoid GPS coordinate conflicts
- Accordion collapse uses `max-height` transition for smooth animation
