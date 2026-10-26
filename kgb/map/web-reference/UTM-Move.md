# UTM-Move — web reference (spike candidate)

Source: https://github.com/r64genji/UTM-Move · demo: https://utm-move.vercel.app
Read: 2026-10-26. Our project: `kgb/map/` vanilla-JS MapLibre 3D campus map (`beta`).

## What it is

Campus navigator for Universiti Teknologi Malaysia: walking + campus-bus
directions. v2 runs **fully in the browser, no backend**. v1 (Express +
GraphHopper) kept at tag `v1`.

Stack: Vite, React 19, TypeScript (strict), MapLibre + **PMTiles**, React
Router, Zustand, Comlink (router Web Worker), MiniSearch, kdbush, zod,
Vitest, Playwright.

## Ideas worth replicating (ranked)

1. **Self-hosted PMTiles basemap** — `public/basemap/` (campus cut + margin,
   z0–15, glyphs, sprites) is committed, so builds need **no tile/font/sprite
   network at all**. This is our biggest fragility: blank-beige waits, boot
   loader, CDN dependence (OpenFreeMap/Carto/Esri). Replicable as a pipeline
   script (`pipeline/basemap/fetch-basemap.sh` pattern) cutting Protomaps to
   KGB + margin.
2. **In-browser routing worker** (Comlink) — foot routing with zero server
   dependency. We depend on external FOSSGIS OSRM (`routed-foot`); a local
   router removes that failure point and works offline.
3. **Campus-bus directions model** (`src/domain/transit/`) — we keep the bus
   map as a separate page (`kgb/bus-stop/`); their transit domain is the
   template if we ever merge bus routing into the main map.
4. **Search + spatial index** (MiniSearch, kdbush) — fine at our ~110 pins
   today, but the pattern to adopt if the dataset grows.
5. **Data validation** (zod schemas, `npm run validate`) — our Sheet →
   Apps Script → JSON pipeline has **no validation** (remember the blank-row
   incident). A build-time schema check is cheap and directly useful.
6. **Real tests** (Vitest + Playwright) vs our `harness.debug.js` — direction
   to grow into, not a spike item.

## What does NOT fit

The framework: React 19 + Vite + TS is a **rewrite**, not an experiment.
Our vanilla single-file setup is what lets the owner iterate fast via
screenshots. Take algorithms and data patterns, not the stack.

## License warning

UTM-Move is **AGPL-3.0**. Reimplement ideas in our own code — do **not**
paste their code in, that triggers copyleft obligations on our repo.

## Suggested experiment path

Branch `exp/utm-spike` off `beta` (integrates against the real rail/sheet
UI; `main` stays deployed-clean). Spike order: (a) zod-style JSON
validation, (b) PMTiles KGB cut served locally, (c) worker router prototype.

## Spike test 2026-10-26 (branch `exp/utm-spike`, pushed)

- Cut KGB with their exact procedure (go-pmtiles 1.31.2, build `20261025`,
  bbox `103.058,5.384,103.100,5.416` + margin, maxzoom 15): **839 KB,
  44 tiles**, OSM data 2026-10-25. Cut file kept in local temp only,
  not committed.
- `buildings` layer present with **`height` + `min_height` (Number)** —
  3D extrusion survives; our style layer needs a one-line port
  (`render_height` → `height`, `render_min_height` → `min_height`).
- Open question remains the far-field: cut ends at the bbox edge, so
  Kubang Ikan context becomes void (our dim-mask becomes redundant).
- Next: serve the cut + port the extrusion layer + screenshot on-device.
