# Peta Kampus UniSZA KGB

Interactive campus map for **Universiti Sultan Zainal Abidin (UniSZA), Kampus Gong Badak**, Terengganu, Malaysia.

Displays ~110 campus locations as colored markers on a satellite map — buildings, academic blocks, faculty centres, residential colleges, facilities, and more.

> Part of the [unija-map](https://github.com/unija-info/unija-map) project by [unija.info](https://unija.info)

---

## Features

- **Interactive satellite map** powered by Leaflet.js with ArcGIS World Imagery
- **Color-coded markers** by location category (10 categories); KOLEJ KEDIAMAN uses a distinct rounded-square shape
- **Accordion sidebar** — single-select grouped list; selecting a category collapses all others
- **Category filtering** — click a category to show only its markers on the map
- **Location focus** — click any location to zoom in on it (all other markers hidden)
- **Marker tooltips** — hidden by default; hover reveals the location name, click expands with directions and info button
- **Info overlay** — detailed panel with location name, category, short form, notes, and Google Maps link; back (`←`) or close (`×`) button restores full map view
- **Animated intro** — map flies in from a wide view to campus zoom on first load
- **Map area labels** — static text labels on the map for landmarks and open areas (e.g. Tasik UniSZA, Padang New Zealand); zoom-responsive with configurable visibility threshold
- **Real-time search** — search by location name, number code, short form, details, or area label
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

Location data is loaded from [`kgb/data/kgb-map.json`](../data/kgb-map.json) — the same data file used by the main `kgb/` directory page.

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

To update locations, edit `kgb/data/kgb-map.json`. No rebuild required — the page fetches the file at runtime.

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
