# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**unija-map** — Interactive navigation maps for Universiti Sultan Zainal Abidin (UniSZA), Kampus Gong Badak, Terengganu, Malaysia. A community project by [unija.info](https://unija.info). Content is primarily in Malay (Bahasa Melayu).

Pure static HTML5/CSS3/Vanilla JS — no npm, no build tools, no frameworks (except Leaflet.js in `bus-stop-kgb/`). Deployed on Vercel; Vercel Analytics script present on all pages.

## Architecture

```
index.html              ← Landing page: campus selector (links to sub-maps)
style.css               ← Landing page styles

kgb/                    ← Campus map: UniSZA Gong Badak location directory
  index.html            ← Map image + searchable/filterable location list
  script.js             ← Fetches map.json from GitHub raw URL (cache-busted), renders list
  style.css
  data/map.json         ← Location data (single source of truth — edit this to update locations)
  file/                 ← Map image assets (PDF + PNG)
  beta/                 ← Beta mirror of kgb/ for testing new features (same structure)
  info.html             ← Project info & documentation page
  feedback.html         ← Feedback form page

bus-stop-kgb/           ← Interactive Leaflet.js bus stop map (self-contained sub-project)
  index.html
  script.js
  style.css
  data.json             ← Bus stop data (single source of truth)
  image/bus-stop/       ← Stop photos for info overlay
  CLAUDE.md             ← Detailed architecture for this sub-project (read this before editing)
```

## Development

No build process. Serve locally with any static server:

```bash
python -m http.server 8000
# Or: npx serve
```

`kgb/script.js` fetches `map.json` from `raw.githubusercontent.com` (not locally), so the `kgb/` map always reflects what is pushed to GitHub `main`. Local edits to `kgb/data/map.json` require pushing before they appear in the app.

`bus-stop-kgb/` reads `data.json` locally, so it works immediately with a local server.

## Data Models

### `kgb/data/map.json` — Campus location array

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

### `bus-stop-kgb/data.json` — Bus stop array

See `bus-stop-kgb/CLAUDE.md` for full schema and architecture details.

## Key Patterns

- **Cache-busting**: JSON fetches append `?v=${new Date().getTime()}`
- **GitHub API for update dates**: `kgb/script.js` calls `api.github.com/repos/unija-info/unija-map/commits?path=...` to display last-updated timestamps in the footer
- **Mobile breakpoint**: 768px across all sub-projects
- **Font**: Poppins (Google Fonts) across all pages
- **Filtering**: `kgb/` supports multi-select category filters + text search (combinable); list hidden until a filter/search is active
