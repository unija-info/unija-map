# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**unija-map** — Interactive navigation maps for Universiti Sultan Zainal Abidin (UniSZA), Kampus Gong Badak, Terengganu, Malaysia. A community project by [unija.info](https://unija.info). Content is primarily in Malay (Bahasa Melayu).

Pure static HTML5/CSS3/Vanilla JS — no npm, no build tools, no frameworks (except Leaflet.js in `kgb/map/` and `kgb/bus-stop/`). Deployed on Vercel; Vercel Analytics script present on all pages.

## Architecture

```
index.html              ← Root landing page: campus-group layout linking to all sub-maps
style.css               ← Landing page styles (campus-group cards)

kgb/                    ← UniSZA Gong Badak hub
  index.html            ← Hub: static map image + "Peta Interaktif" cards + searchable directory
  script.js             ← Fetches kgb-map.json from GitHub raw URL (cache-busted), renders list
  style.css
  data/
    kgb-map/
      kgb-map.json      ← Campus location data (single source of truth — edit to update locations)
      images/           ← Location photos ({folder}/{number}.jpg|png|webp)
    bus-stop.json       ← Bus stop data (single source of truth for kgb/bus-stop/)
    bus-stop/
      image/            ← Bus stop photos ({stopname}.png)
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
    CLAUDE.md           ← Detailed architecture for this sub-project (read this before editing)
```

### Inter-page Navigation

All three Gong Badak pages are linked together:
- `kgb/index.html` — "Peta Interaktif" section with cards linking to `/kgb/map/` and `/kgb/bus-stop/`
- `kgb/map/` sidebar — `.sidebar-nav-footer` at bottom links to `/kgb/bus-stop/` and `/` (root)
- `kgb/bus-stop/` — hamburger menu panel links to `/kgb/map/`, `/` (root), bas.my Kuala Terengganu, and bas.my Tracker (`.sidebar-nav-footer` removed)

## Development

No build process. Serve locally with any static server:

```bash
python -m http.server 8000
# Or: npx serve
```

`kgb/script.js` fetches `kgb-map.json` from `raw.githubusercontent.com` (not locally), so the `kgb/` map always reflects what is pushed to GitHub `main`. Local edits to `kgb/data/kgb-map/kgb-map.json` require pushing before they appear in the app.

`kgb/bus-stop/` reads `../data/bus-stop.json` locally, so it works immediately with a local server.

## Data Models

### `kgb/data/kgb-map/kgb-map.json` — Campus location array

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

**Important:** `kgb-map.json` is auto-generated from a Google Sheet — do not edit it directly. See the **Google Sheets Sync** section below.

### `kgb/data/bus-stop.json` — Bus stop array

See `kgb/bus-stop/CLAUDE.md` for full schema and architecture details.

## Google Sheets Sync (`kgb-map.json`)

`kgb-map.json` is managed via Google Sheets, not by hand. The pipeline:

```
Google Sheet  →  code.gs (Apps Script)  →  GitHub API  →  kgb-map.json  →  Live map
```

**Sheet**: [Google Sheet (JSON DATA tab)](https://docs.google.com/spreadsheets/d/13pyAleVZXs57ox8okhuyt6Rj8EEUx2TZkTzq_JEM7bE/edit?usp=sharing) — columns: `number | place | googleMapLink | locationType | shortForm | details`

**Script**: `kgb/data/code.gs` runs inside the sheet as a Google Apps Script. It adds a **"Campus Map Guide → Update Website Data"** menu. When triggered:
1. Reads all rows from the "JSON DATA" tab
2. Maps only the 6 required columns (extra sheet columns are ignored)
3. Skips blank rows, serializes to JSON
4. Calls the GitHub Contents API (`PUT`) to commit the new file to `main` — fetches the current file `sha` first (required by GitHub to update without conflict)
5. The GitHub Personal Access Token is stored in **Apps Script Script Properties** (never hardcoded)

**After a push**: `kgb/script.js` fetches `kgb-map.json` from `raw.githubusercontent.com` with a cache-bust timestamp, so the live site reflects the new data within seconds.

**Rule**: Always edit location data in the Google Sheet, then click "Update Website Data". Direct edits to `kgb-map.json` will be overwritten on the next sync.

## Key Patterns

- **Cache-busting**: JSON fetches append `?v=${new Date().getTime()}`
- **GitHub API for update dates**: `kgb/script.js` calls `api.github.com/repos/unija-info/unija-map/commits?path=...` to display last-updated timestamps in the footer
- **Mobile breakpoint**: 768px across all sub-projects
- **Font**: Poppins (Google Fonts) across all pages
- **Filtering**: `kgb/` supports multi-select category filters + text search (combinable); list hidden until a filter/search is active
