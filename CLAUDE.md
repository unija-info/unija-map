# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**unija-map** — Interactive navigation maps for Universiti Sultan Zainal Abidin (UniSZA), Kampus Gong Badak, Terengganu, Malaysia. A community project by [unija.info](https://unija.info). Content is primarily in Malay (Bahasa Melayu).

Pure static HTML5/CSS3/Vanilla JS — no npm, no build tools, no frameworks (except Leaflet.js in `kgb/bus-stop/`). Deployed on Vercel; Vercel Analytics script present on all pages.

## Architecture

```
index.html              ← Root landing page: campus-group layout linking to all sub-maps
style.css               ← Landing page styles (campus-group cards)

kgb/                    ← UniSZA Gong Badak hub
  index.html            ← Hub: static map image + "Peta Interaktif" cards + searchable directory
  script.js             ← Fetches kgb-map.json from GitHub raw URL (cache-busted), renders list
  style.css
  data/
    kgb-map.json        ← Campus location data (single source of truth — edit to update locations)
    bus-stop.json       ← Bus stop data (single source of truth for kgb/bus-stop/)
    campus-boundary.json← UniSZA KGB campus polygon coords (OSM Way 1120569731, cached locally)
    code.gs             ← Google Apps Script: syncs kgb-map.json from Google Sheet to GitHub
  file/                 ← Map image assets (PDF + PNG)
  beta/                 ← Beta mirror of kgb/ for testing new features (same structure)
  info.html             ← Project info & documentation page
  feedback.html         ← Feedback form page
  map/                  ← Interactive Leaflet.js campus location map (self-contained sub-project)
    index.html
    script.js
    style.css
    CLAUDE.md           ← Detailed architecture for this sub-project (read this before editing)
  bus-stop/             ← Interactive Leaflet.js bus stop map (self-contained sub-project)
    index.html
    script.js
    style.css
    image/bus-stop/     ← Stop photos for info overlay
    CLAUDE.md           ← Detailed architecture for this sub-project (read this before editing)
```

### Inter-page Navigation

All three Gong Badak pages are linked together:
- `kgb/index.html` — "Peta Interaktif" section with cards linking to `/kgb/map/` and `/kgb/bus-stop/`
- `kgb/map/` sidebar — `.sidebar-nav-footer` at bottom links to `/kgb/bus-stop/` and `/` (root)
- `kgb/bus-stop/` sidebar — `.sidebar-nav-footer` at bottom links to `/kgb/map/` and `/` (root)

## Development

No build process. Serve locally with any static server:

```bash
python -m http.server 8000
# Or: npx serve
```

`kgb/script.js` fetches `kgb-map.json` from `raw.githubusercontent.com` (not locally), so the `kgb/` map always reflects what is pushed to GitHub `main`. Local edits to `kgb/data/kgb-map.json` require pushing before they appear in the app.

`kgb/bus-stop/` reads `../data/bus-stop.json` locally, so it works immediately with a local server.

## Data Models

### `kgb/data/kgb-map.json` — Campus location array

```json
[
  {
    "number": "P1",
    "place": "Canselori",
    "googleMapLink": "https://maps.google.com/?q=LAT,LNG",
    "locationType": "PENTADBIRAN & PTJ",
    "shortForm": "",
    "details": "Optional extra info"
  }
]
```

`number` uses prefix codes: `P` = Pentadbiran, `A`/`B` = Akademik, `K` = Kolej Kediaman, etc. `customSort()` in `script.js` sorts letter-prefixed entries before pure numbers, then numerically within each prefix group.

Category filter order is hardcoded in `script.js` (`desiredOrder` array). Add new categories there to control button order.

### `kgb/data/bus-stop.json` — Bus stop array

See `kgb/bus-stop/CLAUDE.md` for full schema and architecture details.

## Key Patterns

- **Cache-busting**: JSON fetches append `?v=${new Date().getTime()}`
- **GitHub API for update dates**: `kgb/script.js` calls `api.github.com/repos/unija-info/unija-map/commits?path=...` to display last-updated timestamps in the footer
- **Mobile breakpoint**: 768px across all sub-projects
- **Font**: Poppins (Google Fonts) across all pages
- **Filtering**: `kgb/` supports multi-select category filters + text search (combinable); list hidden until a filter/search is active
