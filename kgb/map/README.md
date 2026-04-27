# Peta Kampus UniSZA KGB

Interactive campus map for **Universiti Sultan Zainal Abidin (UniSZA), Kampus Gong Badak**, Terengganu, Malaysia.

Displays ~110 campus locations as colored markers on a satellite map — buildings, academic blocks, faculty centres, residential colleges, facilities, and more.

> Part of the [unija-map](https://github.com/unija-info/unija-map) project by [unija.info](https://unija.info)

---

## Features

- **Interactive satellite map** powered by Leaflet.js with ArcGIS World Imagery
- **Color-coded markers** by location category (10 categories); KOLEJ KEDIAMAN uses a distinct rounded-square shape
- **Zoom-adaptive markers** — priority categories (PENTADBIRAN, AKADEMIK, FAKULTI) always show full markers; other categories appear as small colored dots at low zoom, upgrading to full markers as you zoom in (threshold: 17.5 desktop / 17 mobile)
- **Hover upgrade** — hovering a dot temporarily expands it to full size; clicking keeps it full until another location is selected
- **Accordion sidebar** — single-select grouped list; selecting a category collapses all others
- **Category filtering** — click a category to show only its markers on the map
- **Location focus** — click any location to zoom in on it (all other markers hidden)
- **Marker tooltips** — hidden by default; hover reveals the location code, click expands with full name, directions and info button
- **Info overlay** — detailed panel with location photo (or placeholder if unavailable), location name, category, short form, notes, and Google Maps link; back (`←`) or close (`×`) button restores full map view
- **Animated intro** — map flies in from a wide view to campus zoom on first load
- **Map area labels** — static text labels on the map for landmarks and open areas (e.g. Tasik UniSZA, Padang New Zealand); zoom-responsive with configurable visibility threshold
- **Real-time search** — search by location name, number code, short form, details, or area label
- **Info menu panel** — hamburger button in the search bar opens a panel (full-screen slide-in on mobile, popup card on desktop) with campus hero image, navigation links, feedback buttons, and version/update info
- **Responsive** — bottom sheet UI on mobile, collapsible sidebar on desktop

---

## Location Categories

| Color | Category |
|---|---|
| ![#2b8a8f](https://placehold.co/12x12/2b8a8f/2b8a8f.png) Teal | PENTADBIRAN & PTJ |
| ![#205c8c](https://placehold.co/12x12/205c8c/205c8c.png) Navy | BLOK AKADEMIK & KELAS |
| ![#d4a000](https://placehold.co/12x12/d4a000/d4a000.png) Gold | BLOK FAKULTI & PUSAT PENGAJIAN |
| ![#ecaa2b](https://placehold.co/12x12/ecaa2b/ecaa2b.png) Amber | KOLEJ KEDIAMAN |
| ![#e0468a](https://placehold.co/12x12/e0468a/e0468a.png) Pink | PUSAT AKTIVITI |
| ![#8A2BE2](https://placehold.co/12x12/8A2BE2/8A2BE2.png) Purple | SUKAN & REKREASI |
| ![#b0a020](https://placehold.co/12x12/b0a020/b0a020.png) Olive | CAFE & MAKANAN |
| ![#DC143C](https://placehold.co/12x12/DC143C/DC143C.png) Red | KESIHATAN |
| ![#32CD32](https://placehold.co/12x12/32CD32/32CD32.png) Green | IBADAH |

---

## Tech Stack

- **Leaflet.js 1.9.4** — interactive map
- **ArcGIS World Imagery** — satellite tile layer
- **CartoDB Positron** — labels overlay
- **Vanilla JavaScript (ES6+)** — no frameworks, no build tools
- **Google Sans** — font (Google Fonts)
- **Vercel Analytics** — usage tracking

---

## Data Source

Location data is loaded from [`kgb/data/kgb-map/kgb-map.json`](../data/kgb-map.json) at runtime via `raw.githubusercontent.com` (cache-busted). This is the same file used by the main `kgb/` directory page.

Each entry follows this schema:

```json
{
  "number": "P1",
  "place": "Canselori",
  "googleMapLink": "https://maps.google.com/?q=5.4012,103.0801",
  "locationType": "PENTADBIRAN & PTJ",
  "shortForm": "",
  "details": ""
}
```

### Updating location data

`kgb-map.json` is **auto-generated from a Google Sheet** — do not edit it directly.

**Pipeline:**
```
Google Sheet  →  Apps Script (code.gs)  →  GitHub API  →  kgb-map.json  →  Live map
```

1. Open the [Google Sheet](https://docs.google.com/spreadsheets/d/13pyAleVZXs57ox8okhuyt6Rj8EEUx2TZkTzq_JEM7bE/edit?usp=sharing) and edit the **"JSON DATA"** tab
2. Click **Campus Map Guide → Update Website Data** in the sheet menu
3. The Apps Script (`kgb/data/code.gs`) commits the new JSON to GitHub
4. The live map reflects the change within seconds

Direct edits to `kgb-map.json` will be overwritten on the next sync from the sheet.

### Location images

Photos are stored in `kgb/data/kgb-map/images/` organized by category subfolder:

```
kgb/data/kgb-map/images/
  pentadbiran/        ← P1.jpg, P2.jpg, ...
  akademik/
  fakulti/
  kolej-kediaman/
  aktiviti/
  sukan/
  cafe/
  kesihatan/
  ibadah/
  fasiliti/
```

Image URL pattern: `https://raw.githubusercontent.com/unija-info/unija-map/main/kgb/data/kgb-map/images/{folder}/{number}.jpg`

Upload images named exactly `{number}.jpg` (e.g. `P1.jpg`). Locations with no image file automatically show a "Tiada Gambar" placeholder — no data changes required.

---

## Running Locally

No build process. Use any static file server from the repo root:

```bash
python -m http.server 8000
# Open: http://localhost:8000/kgb/map/
```

---

## File Structure

```
kgb/map/
  index.html      ← HTML shell
  script.js       ← All application logic
  style.css       ← All styles
  README.md       ← This file
  CHANGELOG.md    ← Version history
  CLAUDE.md       ← Technical documentation for Claude Code
```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
