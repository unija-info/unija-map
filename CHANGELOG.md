# CHANGELOG — unija-map

High-level project history. For technical detail see:
[`kgb/map/CHANGELOG.md`](kgb/map/CHANGELOG.md) · [`kgb/bus-stop/CHANGELOG.md`](kgb/bus-stop/CHANGELOG.md)

---

## 2026-04-22 — SEO Improvements (`kgb/map/` + site-wide)

- `kgb/map/`: added `<meta name="description">` and `<link rel="canonical">`; fixed OG title typo (stray `>`); corrected `og:url` from `/kgb` to `/kgb/map/`; fixed `apple-mobile-web-app-title` from `"MyWebSite"` to `"Peta UniSZA KGB"`
- `robots.txt`: created at repo root — allows all crawlers, references sitemap
- `sitemap.xml`: created at repo root — lists all four indexable pages (`/`, `/kgb/`, `/kgb/map/`, `/kgb/bus-stop/`) with priority weights

→ Full detail: [`kgb/map/CHANGELOG.md`](kgb/map/CHANGELOG.md) v2.5

---

## 2026-04-19 — Info Menu Panel & Documentation Update

- `kgb/map/`: hamburger button in search bar opens a right-slide info panel (full-screen on mobile, 380px popup on desktop) containing campus hero image, nav links, feedback buttons, and version info; sidebar title/subtitle and version bar moved exclusively to the panel; "Senarai Lokasi" header reordered above action buttons on mobile
- `kgb/info.html`: updated features list (satellite map, bus stop map, mobile bottom sheet, campus boundary, 360° VT, live location count), clarified tech stack, fixed `lang` attribute, updated copyright year
- `feedback/kgb/report.html`: iframe height overridden to 2060px (inline style) to match shorter bug report form

→ Full detail: [`kgb/map/CHANGELOG.md`](kgb/map/CHANGELOG.md) v2.4

---

## 2026-04-16 — Zoom-Based Marker Tiers (`kgb/map/`)

- Priority categories (PENTADBIRAN, AKADEMIK, FAKULTI) always show full markers; other categories show as small colored dots at low zoom, upgrading to full at zoom ≥ 17.5 (desktop) / 17 (mobile)
- Hovering a dot temporarily upgrades it to full; selecting a location keeps its marker full until deselected
- Location count in sidebar subtitle now fetched live from data (`mapData.length`)

→ Full detail: [`kgb/map/CHANGELOG.md`](kgb/map/CHANGELOG.md) v2.3

---

## 2026-04-16 — Version Info Bar & Campus Boundary Path Fix (`kgb/map/`)

- `kgb/map/` now shows app version (parsed from CHANGELOG.md) and last data update date (GitHub Commits API) in a sidebar info bar above the nav footer
- Fixed campus boundary fetch failing on Vercel: path changed from relative `../data/` to absolute `/kgb/data/campus-boundary.json` (Vercel `cleanUrls` drops the trailing slash, breaking relative resolution)

→ Full detail: [`kgb/map/CHANGELOG.md`](kgb/map/CHANGELOG.md) v2.1–v2.2

---

## 2026-04-16 — Navigation Linking & Landing Page Restructure

- Root `index.html` restructured into campus-group layout (Gong Badak, Besut, Kota) with sub-cards per campus
- `kgb/index.html` now acts as a hub with "Peta Interaktif" cards linking to both interactive maps
- Sidebar footer added to `kgb/map/` and `kgb/bus-stop/` with cross-links between maps and back to root

---

## 2026-04-15 — File Reorganisation, Description Field & Campus Boundary Fix

- `bus-stop-kgb/` moved to `kgb/bus-stop/`; data files consolidated under `kgb/data/` and renamed (`map.json` → `kgb-map.json`, `data.json` → `bus-stop.json`)
- Campus boundary polygon switched from live Overpass API query to a local cached file (`kgb/data/campus-boundary.json`), fixing 504 timeout errors
- Optional `description` field on bus stops now shown in the sidebar and info overlay when present

---

## 2026-04-05 to 2026-04-11 — `kgb/map/` Interactive Campus Map

New sub-project launched. Highlights across v1.0–v2.0:
- Interactive Leaflet.js map of ~110 campus locations with 10-category color system
- Accordion sidebar, text-only info overlay, real-time search, mobile bottom sheet
- Zoom-responsive area labels (Tasik UniSZA, Padang New Zealand, etc.)
- KOLEJ KEDIAMAN rendered as rounded squares; full location name on tooltip hover
- Campus boundary polygon overlay

→ Full version history: [`kgb/map/CHANGELOG.md`](kgb/map/CHANGELOG.md)

---

## 2026-01-14 to 2026-01-31 — `kgb/bus-stop/` Bus Stop Map

Bus stop map built up from v1.0 to v2.6. Highlights:
- Interactive Leaflet.js map of express bus pick-up/drop-off points around UniSZA KGB
- Expandable tooltips, accordion sidebar, company filtering, real-time search dropdown
- Mobile bottom sheet with swipe gestures and scroll-aware drag behavior
- Stop info overlay with photo, directions, and operator list

→ Full version history: [`kgb/bus-stop/CHANGELOG.md`](kgb/bus-stop/CHANGELOG.md)

---

## 2025-10-23 to 2025-11-04 — Initial Setup

- Repository created; `index.html` root landing page
- `kgb/index.html` — static campus map image with searchable, filterable location directory
- Google Sheet → Apps Script → GitHub API data sync pipeline established
- `vercel.json`, `info.html`, `feedback.html`, map image assets added
