# Developer Documentation
## Bus Stop @ UniSZA Gong Badak v2.2

This document provides technical details for developers working on the Bus Stop mapping application.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Core Components](#core-components)
4. [Tooltip System](#tooltip-system)
5. [Data Structure](#data-structure)
6. [Styling System](#styling-system)
7. [Event Handling](#event-handling)
8. [Development Workflow](#development-workflow)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The application is built using vanilla JavaScript with the following technologies:

- **Leaflet.js 1.9.4**: Interactive map library
- **ArcGIS World Imagery**: Satellite base layer
- **CartoDB Light Labels**: Street labels overlay
- **Google Fonts (Google Sans)**: Typography
- **Pure CSS3**: Styling and animations
- **JSON**: Data storage format

### Design Pattern
- **MVC-inspired structure**: Separation of data (JSON), view (HTML/CSS), and logic (JS)
- **Event-driven architecture**: User interactions trigger state changes
- **Single source of truth**: `busData` array holds all bus stop information

---

## File Structure

```
bus-stop-kgb/
├── index.html          # Main HTML structure
├── style.css           # Complete styling and animations
├── script.js           # Application logic and event handlers
├── data.json           # Bus stop and company data
├── CHANGELOG.md        # Version history
├── DEVELOPER.md        # This file
└── CLAUDE.md           # AI conversation history
```

---

## Core Components

### 1. Map Initialization ([script.js:7-23](script.js#L7-L23))

```javascript
function initMap() {
    map = L.map('map', { maxZoom: 22, zoomControl: false })
        .setView([5.3950, 103.0830], 14);

    // Satellite imagery base layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxNativeZoom: 19,
        maxZoom: 22
    }).addTo(map);

    // Labels overlay
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'shadowPane',
        maxNativeZoom: 20,
        maxZoom: 22
    }).addTo(map);

    // Zoom control positioned bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);
}
```

**Key Features**:
- Custom zoom control placement
- Dual-layer map (satellite + labels)
- Centered on UniSZA Gong Badak campus

### 2. Data Loading ([script.js:34-40](script.js#L34-L40))

```javascript
fetch('data.json')
    .then(res => res.json())
    .then(data => {
        busData = data.stops;
        renderGroupedList();
        showAllStops();
    });
```

**Flow**:
1. Fetch JSON data
2. Store in `busData` global variable
3. Render sidebar list
4. Display all markers on map

### 3. Sidebar Rendering ([script.js:43-79](script.js#L43-L79))

Creates accordion-style groups for each bus stop with nested company buttons.

```javascript
function renderGroupedList() {
    // Creates stop groups (collapsed by default)
    // Each group contains:
    // - Stop header (clickable to toggle + zoom)
    // - Sub-list of company buttons
}
```

### 4. Sidebar Button Layout (v2.2.0)

The sidebar header contains two action buttons displayed side-by-side using flexbox.

#### HTML Structure ([index.html:26-29](index.html#L26-L29))

```html
<div class="button-group">
    <button id="show-all" class="btn-reset">📍 Papar semua Lokasi Bus Stop</button>
    <button id="toggle-all-groups" class="btn-toggle-groups">📋 Papar Semua Operator</button>
</div>
```

**Layout Container**:
- `.button-group` wrapper enables flexbox horizontal layout
- Both buttons wrapped in single container for equal distribution
- Maintains semantic HTML structure

#### CSS Implementation

**Button Container ([style.css:129-134](style.css#L129-L134))**:
```css
.button-group {
    display: flex;
    gap: 8px;
    width: 100%;
}
```

**Button Styling ([style.css:98-111](style.css#L98-L111))**:
```css
.btn-reset, .btn-toggle-groups {
    flex: 1;  /* Equal width distribution */
    padding: 12px 24px;
    border: none;
    border-radius: 24px;
    background: #1967d2;
    color: white;
    font-size: 14px;
    font-weight: 700;
}
```

**Key Features** (v2.2.0):
- `flex: 1`: Buttons share available space equally (50% each)
- `gap: 8px`: Consistent spacing between buttons
- Responsive without media queries - works on all screen sizes
- Maintains Material Design styling with rounded corners and shadows
- Hover and active states preserved from v2.1

**Button Functions**:
- **Show All Locations** (`#show-all`): Zooms map to display all bus stop markers
- **Show All Operators** (`#toggle-all-groups`): Expands/collapses all accordion groups

**Layout Evolution**:
- v2.0-2.1: Buttons stacked vertically (`width: 100%`)
- v2.2.0: Buttons side-by-side (`flex: 1` with flexbox container)

---

## Tooltip System

### Overview
The tooltip system is the most complex part of v2.0, providing:
- Permanent tooltips showing stop names
- Click-to-expand "Get Directions" button
- Upward expansion to avoid marker overlap
- Single active tooltip at a time

### CSS Architecture

#### 1. Tooltip Container ([style.css:231-240](style.css#L231-L240))

```css
.custom-tooltip-popup {
    background: transparent !important;
    border: none !important;
    box-shadow: none;
    padding: 0;
    font-family: 'Google Sans', sans-serif;
    pointer-events: auto !important;
    overflow: visible !important;
    width: max-content !important;
}
```

**Key Properties** (v2.1):
- `background: transparent`: No background on parent, styling moved to content wrapper
- `width: max-content`: Dynamically sizes to content width
- `overflow: visible`: Allows button and arrow to extend beyond container
- `pointer-events: auto`: Enables click events on tooltip

#### 2. Content Wrapper ([style.css:251-262](style.css#L251-L262))

```css
.popup-content-wrapper {
    text-align: center;
    padding: 4px 5px;       /* Reduced vertical padding (v2.1) */
    position: relative;
    min-width: 200px;       /* Minimum width */
    overflow: visible;
    transition: min-height 0.3s ease, margin-top 0.3s ease;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);  /* Moved from parent (v2.1) */
}
```

**v2.1 Changes**:
- `padding`: Reduced from `8px 0px` to `4px 5px` for more compact appearance
- `box-shadow`: Moved from parent container to content wrapper
- Removed `min-height`: Now dynamically sizes based on content

#### 3. Expanded State ([style.css:280-284](style.css#L280-L284))

```css
.custom-tooltip-popup.expanded .popup-content-wrapper {
    min-height: 75px;
    margin-top: -60px;  /* Reduced from -80px (v2.1) */
}
```

**Why negative margin?**
- Leaflet anchors tooltips at the top edge
- When `min-height` increases, box expands downward
- Negative margin pulls the entire tooltip upward
- Result: Marker stays visible, button appears above

**v2.1 Optimization**:
- Reduced from `-80px` to `-60px` to minimize gap between tooltip and marker
- Balances marker clearance with visual connection
- User can adjust between `-20px` (minimal gap) to `-80px` (maximum clearance)

#### 4. Stop Name Positioning ([style.css:286-297](style.css#L286-L297))

```css
.popup-stop-name {
    font-family: 'Google Sans', sans-serif;
    font-weight: 600;
    font-size: 14px;
    line-height: 1.3;
    color: #202124;
    display: inline-block;  /* Changed from absolute (v2.1) */
    position: relative;     /* Changed from absolute (v2.1) */
    padding: 0;
    z-index: 1;
    white-space: nowrap;    /* Single-line display (v2.1) */
}
```

**v2.1 Changes**:
- Changed from `position: absolute` to `position: relative` with `display: inline-block`
- Added `white-space: nowrap` for single-line text display (no wrapping)
- Removed `word-wrap` and `overflow-wrap` (no longer needed for single-line)
- Text now flows naturally within flex container
- Width adjusts dynamically to text content

#### 5. Button Positioning ([style.css:298-317](style.css#L298-L317))

```css
.popup-link {
    display: block;
    position: absolute;
    bottom: 8px;        /* Positioned at bottom */
    left: 12px;
    right: 12px;
    padding: 8px 16px;
    background: #c2eaf2;
    color: #014f5a;
    border-radius: 24px;
    transition: all 0.3s ease;
    z-index: 2;
}

.popup-link-hidden {
    max-height: 0;
    opacity: 0;
    padding-top: 0;
    padding-bottom: 0;
    pointer-events: none;
}
```

**Visibility Control**:
- `.popup-link`: Visible state (opacity: 1, full height)
- `.popup-link-hidden`: Hidden state (opacity: 0, height: 0)
- CSS transitions provide smooth show/hide animation

#### 6. Arrow Indicator ([style.css:264-277](style.css#L264-L277)) **v2.1 Update**

```css
.popup-content-wrapper::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid white;
    filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
    pointer-events: none;
}
```

**v2.1 Critical Fix**:
- **Moved from** `.custom-tooltip-popup::after` **to** `.popup-content-wrapper::after`
- Arrow now positioned relative to content box, not parent container
- Eliminates gap/stray line between tooltip and arrow
- Seamless connection regardless of border-radius value
- Maintains proper centering with `left: 50%` and `translateX(-50%)`

### JavaScript Implementation

#### Marker Creation ([script.js:157-233](script.js#L157-L233))

```javascript
function createMarker(stop, isSelected) {
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.coords[0]},${stop.coords[1]}`;

    // Create ground dot for selected markers
    if (isSelected) {
        const dot = L.divIcon({ className: 'ground-dot' });
        markers.push(L.marker(stop.coords, { icon: dot, zIndexOffset: -100 }).addTo(map));
    }

    // Create main marker
    const marker = L.marker(stop.coords, { icon: defaultIcon });

    // Bind permanent tooltip
    marker.bindTooltip(tooltipContent, {
        permanent: true,
        direction: 'top',
        className: 'custom-tooltip-popup',
        offset: isSelected ? [-14, -20] : [-14, -15]
    });

    // Add click handler
    marker.on('click', toggleTooltipButton);

    return marker;
}
```

#### Toggle Logic ([script.js:200-228](script.js#L200-L228))

```javascript
marker.on('click', function(e) {
    L.DomEvent.stopPropagation(e);

    const tooltipEl = this.getTooltip() && this.getTooltip().getElement();
    if (tooltipEl) {
        const btn = tooltipEl.querySelector('.popup-link');
        if (btn) {
            // CRITICAL: Check state BEFORE hiding all buttons
            const isHidden = btn.classList.contains('popup-link-hidden');

            // Reset all tooltips
            document.querySelectorAll('.popup-link').forEach(btn => {
                btn.classList.add('popup-link-hidden');
            });
            document.querySelectorAll('.custom-tooltip-popup').forEach(tp => {
                tp.classList.remove('expanded');
            });

            // Toggle this tooltip based on previous state
            if (isHidden) {
                btn.classList.remove('popup-link-hidden');
                tooltipEl.classList.add('expanded');
            }
        }
    }
});
```

**Why check state first?**
- If we hide all buttons first, `isHidden` is always `true`
- This breaks the toggle behavior
- Solution: Store state BEFORE modifications

---

## Data Structure

### data.json Format

```json
{
  "stops": [
    {
      "name": "Bus Stop HoSZA",
      "coords": [5.39765, 103.08441],
      "companies": [
        "Sani Express",
        "Sri Jasa Travel",
        "Teratai Express"
      ]
    }
  ]
}
```

**Field Descriptions**:
- `name` (string): Display name of bus stop
- `coords` (array): [latitude, longitude] coordinates
- `companies` (array): List of bus operators serving this stop

**Adding New Stops**:
1. Open `data.json`
2. Add new object to `stops` array
3. Provide name, coordinates, and company list
4. Save and refresh browser

---

## Styling System

### Color Palette

```css
/* Primary Colors */
--primary-blue: #1967d2;      /* Buttons, active states */
--dark-blue: #1557b0;         /* Button hover */
--darker-blue: #0d47a1;       /* Button active */

/* Neutral Colors */
--text-primary: #202124;      /* Main text */
--text-secondary: #5f6368;    /* Subtitles, placeholders */
--background-light: #f8f9fa;  /* Hover backgrounds */
--background-gray: #ededed;   /* List backgrounds */
--border-gray: #e8e8e8;       /* Borders */

/* Button Colors */
--button-bg: #c2eaf2;         /* Get Directions button */
--button-text: #014f5a;       /* Button text */
--button-hover: #a8dfe9;      /* Button hover */
--button-active: #8fd4e0;     /* Button active */
```

### Responsive Breakpoints

```css
/* Mobile: 768px and below */
@media (max-width: 768px) {
    .search-container {
        top: 12px;
        left: 12px;
        right: 12px;
        width: auto;
    }

    .sidebar {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2000;
    }

    .mobile-toggle {
        display: block;
    }
}
```

**Mobile Behavior**:
- Sidebar becomes full-screen overlay
- Toggle button appears at bottom
- Search bar spans full width

---

## Event Handling

### Global Events

#### Map Click ([script.js:24-32](script.js#L24-L32))
```javascript
map.on('click', function() {
    // Hide all tooltip buttons
    // Collapse all tooltips
});
```
**Purpose**: Reset all tooltips when clicking empty map space

#### Search Input ([script.js:248-279](script.js#L248-L279))
```javascript
document.getElementById('search-bar').addEventListener('keyup', function(e) {
    const term = e.target.value.toLowerCase();
    // Filter stop groups
    // Filter company buttons
    // Auto-expand matching groups
});
```
**Features**:
- Real-time search (no submit button)
- Searches both stop names and company names
- Auto-expands accordion groups with matches

### Button Events

#### Show All Stops ([script.js:282](script.js#L282))
```javascript
document.getElementById('show-all').onclick = showAllStops;
```
**Action**: Display all markers and reset view

#### Toggle All Groups ([script.js:283](script.js#L283))
```javascript
document.getElementById('toggle-all-groups').onclick = toggleAllGroups;
```
**Action**: Expand/collapse all accordion groups

#### Mobile Toggle ([script.js:281](script.js#L281))
```javascript
document.getElementById('toggle-view').onclick = toggleMobileView;
```
**Action**: Switch between map and sidebar on mobile

---

## Development Workflow

### Setup
1. Clone or download project files
2. Ensure all files are in same directory
3. Open `index.html` in modern browser
4. No build process required (vanilla JS)

### Development
1. Edit files using any text editor
2. Save changes
3. Refresh browser to see updates
4. Use browser DevTools for debugging

### Testing Checklist
- [ ] All bus stops load correctly
- [ ] Tooltips expand/collapse on marker click
- [ ] Only one tooltip expanded at a time
- [ ] Search filters both stops and companies
- [ ] Mobile view toggles properly
- [ ] "Get Directions" button opens Google Maps
- [ ] Accordion groups expand/collapse
- [ ] Map zoom and pan work smoothly

### Adding Features

#### Add New Button to Tooltip
1. Modify tooltip HTML in `createMarker()` function
2. Add CSS styling in `style.css`
3. Implement click handler in marker event listener
4. Update `.expanded` state if needed

#### Add New Data Field
1. Update `data.json` structure
2. Modify `renderGroupedList()` to display new field
3. Update search logic if field should be searchable
4. Add CSS styling for new elements

---

## Troubleshooting

### Common Issues

#### Issue: Tooltips Not Expanding
**Symptoms**: Clicking marker does nothing
**Causes**:
- JavaScript error in console
- Event listener not attached
- Class toggle logic broken

**Solutions**:
1. Check browser console for errors
2. Verify `marker.on('click', ...)` is called
3. Inspect element to confirm classes are toggling

#### Issue: Tooltip Overlaps Marker
**Symptoms**: "Get Directions" button covers marker icon
**Causes**:
- Incorrect `margin-top` value in `.expanded` state
- Wrong `min-height` calculation

**Solutions**:
1. Adjust `margin-top` in [style.css:283](style.css#L283)
2. Recommended values:
   - `-20px`: Minimal gap, slight overlap with marker
   - `-30px`: Small gap, good balance
   - `-60px`: Current default (v2.1)
   - `-80px`: Original value (v2.0), larger gap
3. Test different values to find optimal balance

#### Issue: Gap Between Tooltip and Arrow **v2.1**
**Symptoms**: Visible line or space between tooltip box and arrow indicator
**Causes**:
- Arrow positioned on parent container (`.custom-tooltip-popup::after`)
- Parent has background/styling creating visual separation

**Solution**:
1. Move arrow from `.custom-tooltip-popup::after` to `.popup-content-wrapper::after`
2. Set parent container background to `transparent`
3. Move visual styling (background, box-shadow) to content wrapper
4. Arrow now seamlessly connects with content box

#### Issue: Long Location Names Overflow **v2.1**
**Symptoms**: Text extends beyond tooltip box
**Causes**:
- `white-space: nowrap` prevents wrapping (v2.1 intentional)
- Parent container width not adjusting

**Solutions (v2.1)**:
1. Ensure `.custom-tooltip-popup` has `width: max-content !important`
2. Set `min-width: 200px` on `.popup-content-wrapper` for minimum size
3. Text will display on single line with tooltip expanding as needed
4. For text wrapping, change `white-space: nowrap` to `white-space: normal`

#### Issue: Search Not Working
**Symptoms**: Typing in search bar does nothing
**Causes**:
- Event listener not attached
- Selector targeting wrong element

**Solutions**:
1. Check `document.getElementById('search-bar')` returns element
2. Verify event listener is added: `addEventListener('keyup', ...)`
3. Test search term matching logic

---

## Performance Considerations

### Optimization Tips

1. **Marker Clustering** (Future Enhancement)
   - For datasets > 50 stops, consider Leaflet.markercluster
   - Improves map performance with many markers

2. **Lazy Loading**
   - Current implementation loads all data upfront
   - For larger datasets, implement pagination or lazy loading

3. **CSS Animations**
   - Use `transform` and `opacity` for animations (GPU-accelerated)
   - Avoid animating `width`, `height`, `top`, `left` (CPU-bound)

4. **Event Delegation**
   - Consider delegating marker clicks to parent container
   - Reduces memory footprint for many markers

---

## Version History

### v2.2.0 (2026-01-14)
- Changed sidebar button layout from stacked to side-by-side
- Implemented flexbox-based button container for responsive horizontal layout
- Added `.button-group` wrapper with `display: flex` and `gap: 8px`
- Changed button width from `width: 100%` to `flex: 1` for equal distribution
- Improved visual hierarchy and better use of horizontal space
- Maintained Material Design styling and all existing functionality

### v2.1.0 (2026-01-14)
- Fixed critical gap between tooltip and arrow indicator
- Optimized tooltip styling for compact display
- Improved dynamic width calculation
- Reduced expanded state gap (margin-top: -60px)
- Restructured CSS architecture for arrow positioning

### v2.0.0 (2026-01-14)
- Complete tooltip system redesign
- Added expandable button functionality
- Improved mobile responsiveness
- Enhanced search capabilities

### v1.0.0
- Initial release
- Basic map and marker functionality
- Simple tooltip display
- Sidebar with company list

---

## Contributing

### Code Style
- **Indentation**: 4 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Naming**: camelCase for functions/variables

### Git Workflow
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test thoroughly
3. Commit with descriptive message
4. Push and create pull request

### Documentation
- Update `CHANGELOG.md` for all changes
- Add inline comments for complex logic
- Update this file for architectural changes

---

## Contact & Support

For questions or issues:
- Check `CLAUDE.md` for AI conversation history
- Review browser console for error messages
- Test in different browsers (Chrome, Firefox, Safari)

---

## License

This project is developed for UniSZA internal use.

---

**Last Updated**: 2026-01-14
**Version**: 2.2.0
**Maintained By**: Development Team
