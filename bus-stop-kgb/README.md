# Bus Stop @ UniSZA Gong Badak

> Peta Lokasi Pick Up & Drop Point Bas Ekspres di sekitar UniSZA Kampus Gong Badak

**Version:** 2.3.0

An interactive map application showing bus stop locations and express bus operators around Universiti Sultan Zainal Abidin (UniSZA), Kampus Gong Badak, Terengganu, Malaysia.

## Features

- **Interactive Satellite Map** - High-resolution satellite imagery with place name labels
- **Bus Stop Markers** - Visual markers for all bus stop locations
- **Operator Information** - See which bus companies serve each stop
- **Search Functionality** - Search for bus stops or operators with Google Maps-style dropdown
- **Google Maps Directions** - One-click directions to any bus stop
- **Responsive Design** - Works on desktop and mobile devices
- **Collapsible Sidebar** - Minimize sidebar to see more of the map (desktop)
- **Mobile Bottom Sheet** - Swipe-enabled panel with peek/half/full states (mobile)

## Bus Stops Covered

| Location | Operators |
|----------|-----------|
| Bus Stop HoSZA | Moraza, Adik Beradik, Mayang Sari, SP Bumi |
| Bus Stop @ Jasa Pelangi | Adam Express, Prisma, Kesatuan Ekspress, Ayu Expres, Adik Beradik |
| Sani Expres Terminal | Sani Ekspress |
| Terminal Bus Telolet Darul Iman | Darul Iman |
| Bus Stop/Wakaf Pintu Depan UniSZA | Transmalaya, Mutiara, Musafir, Alibaba Ekspress |

## Quick Start

This is a static web application with no build process required.

### Option 1: Open Directly
Simply open `index.html` in a web browser.

### Option 2: Local Server (Recommended)
```bash
# Using Python
python -m http.server 8000

# Or using Node.js
npx serve

# Or using PHP
php -S localhost:8000
```
Then open `http://localhost:8000` in your browser.

## Usage

### Desktop
- **Search Bar** - Type to search for stops or operators; results appear in dropdown
- **Sidebar** - Click stop headers to zoom to location, click operator buttons to filter
- **Collapse Sidebar** - Click the chevron button to minimize sidebar
- **Tooltips** - Click markers to show "Get Directions" button; click × to zoom out

### Mobile
- **Bottom Sheet** - Swipe up/down to adjust panel height (peek → half → full)
- **Search** - Type in search bar; sheet auto-expands to show results
- **Map Toggle** - Use "Show Map" / "Show List" button to switch views

## Technology Stack

- **[Leaflet.js](https://leafletjs.com/)** - Interactive maps
- **[ArcGIS World Imagery](https://www.arcgis.com/)** - Satellite tile layer
- **[CartoDB](https://carto.com/)** - Labels overlay layer
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Animations, transitions, responsive design
- **HTML5** - Semantic markup

## Project Structure

```
bus-stop-kgb/
├── index.html          # Main HTML entry point
├── script.js           # Application logic
├── style.css           # Styles and responsive layout
├── data.json           # Bus stop data
├── CHANGELOG.md        # Version history
├── README.md           # This file
├── DEVELOPER.md        # Development guide
└── CLAUDE.md           # AI assistant instructions
```

## Adding New Bus Stops

Edit `data.json` to add new stops:

```json
{
  "id": 6,
  "name": "New Bus Stop Name",
  "coords": [5.3950, 103.0830],
  "companies": ["Operator 1", "Operator 2"],
  "tooltipPosition": "right"
}
```

- `id` - Unique identifier
- `name` - Display name for the stop
- `coords` - [latitude, longitude] from Google Maps
- `companies` - Array of bus operators
- `tooltipPosition` - "left" or "right" (optional, defaults to "right")

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome for Android)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.

## License

This project is for educational and informational purposes for UniSZA students and the public.

## Contributing

Contributions are welcome! Please ensure any changes:
1. Maintain mobile responsiveness
2. Follow existing code style
3. Test on both desktop and mobile
4. Update CHANGELOG.md with changes

---

**Made for UniSZA Kampus Gong Badak community**
