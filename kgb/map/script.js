// ===== MAP ENGINE: MapLibre GL JS (OpenFreeMap 3D vector, default) =====
// Satellite (Esri World Imagery) is a toggleable style in the same engine.
const VECTOR_STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';
const SATELLITE_STYLE = {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
        esri: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: 'Tiles &copy; Esri',
            maxzoom: 19,
        },
        cartoLabels: {
            type: 'raster',
            tiles: [
                'https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
                'https://b.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
                'https://c.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
                'https://d.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            maxzoom: 20,
        },
    },
    layers: [
        { id: 'esri', type: 'raster', source: 'esri' },
        { id: 'sat-labels', type: 'raster', source: 'cartoLabels' },
    ],
};
const DEFAULT_PITCH_3D = 30;

// ===== APP CONFIG (kgb/map/config.json — all tuning knobs, safe fallbacks) =====
const CONFIG_DEFAULTS = {
    view: {
        center: [103.07990647727662, 5.400403569715876],
        mobileCenter: [103.07978857810325, 5.4030603222603855],
        zoom: { desktop: 16.3, mobile: 15.5 },
        pitch3D: 30,
        bearing: 0,
        minZoom: 14,
        maxZoom: 20,
        maxPitch: 70,
    },
    pins: {
        dotZoom: { desktop: 17.5, mobile: 17 },
        priorityCategories: [
            'PENTADBIRAN & PTJ',
            'BLOK AKADEMIK & KELAS',
            'BLOK FAKULTI & PUSAT PENGAJIAN',
        ],
        stem: { minPitch: 5, heightPx: 26 },
        badgePx: 25,
        dotPx: 12,
    },
    base: { default: 'vector' },
    mask: { dimOutside: 0.45, dimColor: '#868c96', restrictPanning: true, panBuffer: 0.02, boundaryFillColor: '#1967d2', boundaryFillOpacity: 0.07 },
    detail: { footpaths: true, sports: true, sportColor: '#7fd08a', sportLine: '#ffffff', pathColor: '#a34d4d', pathOpacity: 0.5, sportOpacity: 0.85, sportLineOpacity: 0.9, trackColor: '#c26a5a', trackOpacity: 0.9 },
    route: { loopSeconds: 14, dotSpacingM: 12, dotMax: 48, dotMaxSpeedMps: 20 },
};
const CONFIG = JSON.parse(JSON.stringify(CONFIG_DEFAULTS));

function numOr(v, fb) {
    return (typeof v === 'number' && isFinite(v)) ? v : fb;
}

function applyAppConfig(json) {
    if (!json || typeof json !== 'object') return;
    try {
        const v = json.view || {};
        if (Array.isArray(v.center) && v.center.length === 2) CONFIG.view.center = [numOr(v.center[0], CONFIG.view.center[0]), numOr(v.center[1], CONFIG.view.center[1])];
        if (Array.isArray(v.mobileCenter) && v.mobileCenter.length === 2) CONFIG.view.mobileCenter = [numOr(v.mobileCenter[0], CONFIG.view.mobileCenter[0]), numOr(v.mobileCenter[1], CONFIG.view.mobileCenter[1])];
        CONFIG.view.zoom.desktop = numOr(v.zoom && v.zoom.desktop, CONFIG.view.zoom.desktop);
        CONFIG.view.zoom.mobile = numOr(v.zoom && v.zoom.mobile, CONFIG.view.zoom.mobile);
        CONFIG.view.pitch3D = numOr(v.pitch3D, CONFIG.view.pitch3D);
        CONFIG.view.bearing = numOr(v.bearing, CONFIG.view.bearing);
        CONFIG.view.minZoom = numOr(v.minZoom, CONFIG.view.minZoom);
        CONFIG.view.maxZoom = numOr(v.maxZoom, CONFIG.view.maxZoom);
        CONFIG.view.maxPitch = numOr(v.maxPitch, CONFIG.view.maxPitch);
        const p = json.pins || {};
        CONFIG.pins.dotZoom.desktop = numOr(p.dotZoom && p.dotZoom.desktop, CONFIG.pins.dotZoom.desktop);
        CONFIG.pins.dotZoom.mobile = numOr(p.dotZoom && p.dotZoom.mobile, CONFIG.pins.dotZoom.mobile);
        if (Array.isArray(p.priorityCategories) && p.priorityCategories.every(c => typeof c === 'string')) {
            CONFIG.pins.priorityCategories = p.priorityCategories;
        }
        CONFIG.pins.stem.minPitch = numOr(p.stem && p.stem.minPitch, CONFIG.pins.stem.minPitch);
        CONFIG.pins.stem.heightPx = numOr(p.stem && p.stem.heightPx, CONFIG.pins.stem.heightPx);
        CONFIG.pins.badgePx = numOr(p.badgePx, CONFIG.pins.badgePx);
        CONFIG.pins.dotPx = numOr(p.dotPx, CONFIG.pins.dotPx);
        if (json.base && (json.base.default === 'vector' || json.base.default === 'satellite')) {
            CONFIG.base.default = json.base.default;
        }
        const mk = json.mask || {};
        if (typeof mk.dimOutside === 'number' && isFinite(mk.dimOutside)) {
            CONFIG.mask.dimOutside = Math.min(1, Math.max(0, mk.dimOutside));
        }
        if (typeof mk.dimColor === 'string' && /^#[0-9a-f]{6}$/i.test(mk.dimColor)) {
            CONFIG.mask.dimColor = mk.dimColor;
        }
        if (typeof mk.restrictPanning === 'boolean') CONFIG.mask.restrictPanning = mk.restrictPanning;
        CONFIG.mask.panBuffer = numOr(mk.panBuffer, CONFIG.mask.panBuffer);
        if (typeof mk.boundaryFillColor === 'string' && /^#[0-9a-f]{6}$/i.test(mk.boundaryFillColor)) {
            CONFIG.mask.boundaryFillColor = mk.boundaryFillColor;
        }
        if (typeof mk.boundaryFillOpacity === 'number' && isFinite(mk.boundaryFillOpacity)) {
            CONFIG.mask.boundaryFillOpacity = Math.min(1, Math.max(0, mk.boundaryFillOpacity));
        }
        const dt = json.detail || {};
        if (typeof dt.footpaths === 'boolean') CONFIG.detail.footpaths = dt.footpaths;
        if (typeof dt.sports === 'boolean') CONFIG.detail.sports = dt.sports;
        ['sportColor', 'sportLine', 'pathColor', 'trackColor'].forEach(k => {
            if (typeof dt[k] === 'string' && /^#[0-9a-f]{6}$/i.test(dt[k])) CONFIG.detail[k] = dt[k];
        });
        ['pathOpacity', 'sportOpacity', 'sportLineOpacity', 'trackOpacity'].forEach(k => {
            if (typeof dt[k] === 'number' && isFinite(dt[k])) CONFIG.detail[k] = Math.min(1, Math.max(0, dt[k]));
        });
        const rt = json.route || {};
        CONFIG.route.loopSeconds = Math.min(120, Math.max(1, numOr(rt.loopSeconds, CONFIG.route.loopSeconds)));
        CONFIG.route.dotSpacingM = Math.min(200, Math.max(2, numOr(rt.dotSpacingM, CONFIG.route.dotSpacingM)));
        CONFIG.route.dotMax = Math.round(Math.min(200, Math.max(1, numOr(rt.dotMax, CONFIG.route.dotMax))));
        CONFIG.route.dotMaxSpeedMps = Math.min(200, Math.max(1, numOr(rt.dotMaxSpeedMps, CONFIG.route.dotMaxSpeedMps)));
        const root = document.documentElement.style;
        root.setProperty('--pin-stem-height', `${CONFIG.pins.stem.heightPx}px`);
        root.setProperty('--pin-badge-px', `${CONFIG.pins.badgePx}px`);
        root.setProperty('--pin-dot-px', `${CONFIG.pins.dotPx}px`);
        dlog('[config] applied', CONFIG);
    } catch (e) {
        console.warn('[config] invalid file, using defaults:', e);
    }
}

function loadAppConfig() {
    return fetch('/kgb/map/config.json')
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(applyAppConfig)
        .catch(() => dlog('[config] missing/unreadable, using built-in defaults'));
}

// ===== STATE =====
let map;
let mapData = [];
let currentActiveCategory = null;
let currentSelectedLocationId = null;
let currentInfoOverlayLocationId = null;
let currentOverlaySource = null; // null | 'category'
// HTML pins v2: badge-only fixed-box elements (NO inner popup — the shared
// #pin-popup lives outside markers, so boxes never change size unexpectedly).
let pinMarkers = [];          // [{id, marker, el, loc, exempt}]
let highlightedPinId = null;  // location id with highlight ring or null
let pinPopupLocId = null;     // location id shown in shared popup (pinned) or null
let pinPopupHoverId = null;   // location id shown in shared popup (hover mini) or null
let pinPopupEl = null;        // shared popup element (single instance)
let currentBaseView = 'vector'; // 'vector' | 'satellite' (3D vector default)
let showLabels = true;
let markersVisible = true;
let show3D = true;
let pitchBeforeSatellite = DEFAULT_PITCH_3D;
let campusBoundaryData = null;   // GeoJSON coords cached for re-add after setStyle
let maskLastRun = null;          // ISO time of last ensureMaskLayers run (debug)
let maskLastError = null;        // last ensureMaskLayers error string (debug)
let maskPollTries = 0;           // mask poller attempts (debug)
let maskPollError = null;        // last mask poller error string (debug)
let routeGeoJSON = null;         // active route geometry cached for re-add after setStyle
let currentUserLocation = null;        // {lat, lng, accuracy}
let userLocationMarker = null;         // L.marker (blue dot)
let userLocationAccuracyCircle = null; // L.circle
let userLocationWatchId = null;        // navigator.geolocation.watchPosition handle
let showUserLocation = false;
let currentRouteLine = null;           // L.geoJSON layer for the active OSRM route
let directionsModeActive = false;      // is the Directions panel open
let directionsStart = null;            // { type:'location'|'maplabel'|'gps', id?, coords:[lat,lng]|null, label }
let directionsEnd = null;              // same shape
let directionsActiveField = null;      // 'start' | 'end' | null — which field the shared dropdown feeds
let directionsTravelMode = 'walk';     // 'walk' | 'drive' — persisted in localStorage
try { if (localStorage.getItem('kgbMapTravelMode') === 'drive') directionsTravelMode = 'drive'; } catch (e) { }
let directionsStartMarker = null;      // L.marker pin for the chosen start point
let directionsEndMarker = null;        // L.marker pin for the chosen end point

// ===== BOOT LOADER OVERLAY =====
// Covers the blank-map wait on cold/hard-refresh loads. Hidden when the map
// (first idle = style + initial tiles) AND the location data (pins mounted)
// are both ready; a 10s safety timeout + 15s CSS failsafe guarantee it never
// sticks, including on total data failure (error shows in the sidebar).
let bootMapReady = false;
let bootDataReady = false;
let bootLoaderHidden = false;
function hideBootLoader() {
    if (bootLoaderHidden) return;
    bootLoaderHidden = true;
    try {
        const el = document.getElementById('boot-loader');
        if (!el) return;
        el.classList.add('hidden');
        setTimeout(() => { try { el.style.display = 'none'; } catch (e) { } }, 500);
    } catch (e) { }
}
function maybeHideBootLoader() {
    if (bootMapReady && bootDataReady) hideBootLoader();
}

// App + code versions, shown in the boot loader and the menus so a glance
// proves whether the phone runs fresh code (code) with which release (app).
function bootVersionText(release) {
    const code = (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?');
    return release ? `Versi: ${release} · Kod ${code}` : `Kod: ${code}`;
}
function paintVersionLines(release) {
    const text = bootVersionText(release);
    try {
        const bootEl = document.getElementById('boot-version');
        if (bootEl) bootEl.textContent = text;
        const mapEl = document.getElementById('map-version');
        if (mapEl) mapEl.textContent = text;
        const menuEl = document.getElementById('menu-version');
        if (menuEl) menuEl.textContent = text;
    } catch (e) { }
}

// ===== ZOOM-BASED MARKER TIERS =====
// Defaults live in CONFIG (kgb/map/config.json) — these constants are the
// fallback when the file is missing. Always read via CONFIG at use sites.
const ZOOM_FULL_DESKTOP = 17.5;
const ZOOM_FULL_MOBILE = 17;
const PRIORITY_CATEGORIES = [
    'PENTADBIRAN & PTJ',
    'BLOK AKADEMIK & KELAS',
    'BLOK FAKULTI & PUSAT PENGAJIAN',
];

// ===== MAP TEXT LABELS DATA =====
// fontSize: max font size in px | minZoom: hide below this zoom level
const mapLabels = [
    { coords: [5.405672070610966, 103.08435741479786], text: 'Tasik UniSZA', fontSize: 13, minZoom: 15 },
    { coords: [5.4027246673160985, 103.07766728429158], text: 'Padang<br>New Zealand', fontSize: 13, minZoom: 15 },
];
const mapLabelRefs = [];

// Highlight is a CSS ring on the pin element (re-applied by refreshPinTiers).
function setMarkerHighlight(locationIdOrNull) {
    highlightedPinId = (locationIdOrNull === undefined) ? null : locationIdOrNull;
    pinMarkers.forEach(r => {
        if (r.el) r.el.classList.toggle('marker-highlighted', r.id === highlightedPinId);
    });
    refreshPinTiers();
    updateSelectedBuildingHighlight();
}

// ===== HTML PIN ENGINE v2 (badge-only markers, shared popup) =====

function pinZoomThreshold() {
    const mobile = window.innerWidth <= 768;
    const t = mobile ? CONFIG.pins.dotZoom.mobile : CONFIG.pins.dotZoom.desktop;
    return (typeof t === 'number' && isFinite(t)) ? t : (mobile ? ZOOM_FULL_MOBILE : ZOOM_FULL_DESKTOP);
}

// Circle/dot HTML for a pin element. Full mode is badge-on-stem (floating pin);
// the stem foot (element bottom-center, anchor:'bottom') is the glued point.
function pinBadgeHTML(location, mode) {
    const bgColor = getCategoryColor(location.locationType);
    if (mode === 'dot') return `<div class="ml-dot" style="background:${bgColor};"></div>`;
    const textColor = getCategoryTextColor(location.locationType);
    const num = location.number || '?';
    const isKolej = location.locationType === 'KOLEJ KEDIAMAN';
    const radius = isKolej ? '6px' : '50%';
    return `<div class="ml-badge" style="background:${bgColor};color:${textColor};border-radius:${radius};">${num}</div>`
        + `<div class="ml-stem"></div>`;
}

// Hysteresis band (±0.15 zoom) stops dot↔badge thrash when the camera sits
// exactly on the threshold: full pins hold on longer zooming out, dots wait
// longer zooming in. Fresh pins (no current mode) use the exact threshold.
function pinModeFor(location, currentMode) {
    if (CONFIG.pins.priorityCategories.includes(location.locationType)) return 'full';
    if (map) {
        const t = pinZoomThreshold(), z = map.getZoom();
        const edge = (currentMode === 'full') ? t - 0.15 : (currentMode === 'dot' ? t + 0.15 : t);
        if (z >= edge) return 'full';
    }
    if (currentSelectedLocationId !== null && location.id === currentSelectedLocationId) return 'full';
    if (currentActiveCategory !== null && location.locationType === currentActiveCategory) return 'full';
    if (highlightedPinId !== null && highlightedPinId !== undefined && highlightedPinId === location.id) return 'full';
    return 'dot';
}

function refreshPinTiers() {
    pinMarkers.forEach(r => {
        const mode = pinModeFor(r.loc, r.mode);
        if (r.mode === mode) return; // unchanged: skip DOM rewrite (no replayed pop)
        r.mode = mode;
        const slot = r.el && r.el.querySelector('.ml-badge-slot');
        if (slot) slot.innerHTML = pinBadgeHTML(r.loc, mode);
    });
}

function createPinMarker(location, exempt = false) {
    if (!location.coords || !map) return null;
    const el = document.createElement('div');
    el.className = 'ml-marker' + (exempt ? ' ml-exempt' : '');
    const initMode = pinModeFor(location);
    el.innerHTML = `<div class="ml-badge-slot">${pinBadgeHTML(location, initMode)}</div>`;
    const rec = { id: location.id, marker: null, el, loc: location, exempt: !!exempt, mode: initMode };
    try {
        // anchor:'bottom' — the stem foot is the glued point; badge floats above.
        rec.marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([location.coords[1], location.coords[0]])
            .addTo(map);
    } catch (e) { return null; }
    if (!exempt && !markersVisible) el.style.display = 'none';

    el.addEventListener('mouseenter', () => {
        if (window.innerWidth <= 768) return;
        // Full name lives in the hover popup; pill stays short.
        if (pinPopupLocId === null || pinPopupLocId === undefined) {
            if (pinPopupHoverId !== location.id) showPinPopup(location.id, 'mini');
        }
        // Hover-upgrade dot → chip (skip if already full: avoids replaying pop).
        if (rec.mode !== 'full') {
            const slot = el.querySelector('.ml-badge-slot');
            if (slot) slot.innerHTML = pinBadgeHTML(location, 'full');
            rec.mode = 'full';
        }
    });
    el.addEventListener('mouseleave', () => {
        if (window.innerWidth <= 768) return;
        if (pinPopupLocId === null || pinPopupLocId === undefined) hidePinPopup();
        else { pinPopupHoverId = null; positionPinPopup(); }
        const slot = el.querySelector('.ml-badge-slot');
        const mode = pinModeFor(location);
        if (slot && mode !== rec.mode) slot.innerHTML = pinBadgeHTML(location, mode);
        rec.mode = mode;
    });
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.innerWidth <= 768) {
            flyToMarker(location.coords, 0.6);
            setMarkerHighlight(location.id);
            showLocationInfoOverlay(location.id);
        } else {
            if (pinPopupLocId === location.id) {
                hidePinPopup();
                setMarkerHighlight(null);
            } else {
                showPinPopup(location.id, 'full');
                setMarkerHighlight(location.id);
            }
        }
    });

    pinMarkers.push(rec);
    return rec;
}

function removePinMarkers() {
    pinMarkers.forEach(r => { try { if (r.marker) r.marker.remove(); } catch (e) { } });
    pinMarkers = [];
    highlightedPinId = null;
}

// Clear + build markers for the given locations. exempt=true keeps the single
// focused pin visible even when the markers toggle is off.
function rebuildPinMarkers(locs, exempt = false) {
    removePinMarkers();
    hidePinPopup();
    setMarkerHighlight(null);
    locs.forEach(loc => { if (loc.coords) createPinMarker(loc, exempt); });
    dlog(`[pins-html] markers mounted: ${pinMarkers.length}`);
}

// (removed: canvas pin layers — v2 uses badge-only HTML markers above)

// v2: no canvas layers at all — markers are badge-only HTML elements.
// Kept as a no-op hook so style reloads don't need special-casing.
function ensurePinLayers() {
    dlog(`[pins-html] markers mounted: ${pinMarkers.length}`);
    return true;
}

// ===== SELECTED-BUILDING HIGHLIGHT (Stage 2) =====
// Tints the 3D building under the selected pin teal. Single hook: called from
// setMarkerHighlight(), so every select/deselect path (pin tap, search, list,
// overlay close, filter reset) is covered. Geometry is copied into our own
// GeoJSON source (no feature-state, no id stability needed) and cached so
// style reloads (satellite toggle) can re-apply without re-querying tiles.
let selectedBuildingCache = null; // {geometry, height, base} or null
let selBuildingDbg = { layer: null, found: 0, height: null, gtype: null, members: null, picked: null, linked: null, names: null, count: null, zoom: null, pitch: null, triedBox: false, lastBail: null, err: null }; // ?debugpage
let buildingRequeryPending = false; // one-shot idle retry scheduled
let buildingRequeriedFor = null;    // location id already granted its one retry
let buildingPollTimer = null;       // interim pop-in poll while the camera flies
let buildingPollTries = 0;

function stopBuildingPoll() {
    if (buildingPollTimer !== null) { try { clearInterval(buildingPollTimer); } catch (e) { } buildingPollTimer = null; }
    buildingPollTries = 0;
}

function ensureSelectedBuildingLayers() {
    if (!map || !map.isStyleLoaded()) return false;
    try {
        if (!map.getSource('selected-building')) {
            map.addSource('selected-building', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            let beforeId = undefined;
            try {
                const ls = (map.getStyle().layers || []);
                for (const l of ls) {
                    if (l.type === 'symbol' && l.layout && l.layout['text-field']) { beforeId = l.id; break; }
                }
            } catch (e) { }
            map.addLayer({
                id: 'selected-building-fill',
                type: 'fill-extrusion',
                source: 'selected-building',
                paint: {
                    'fill-extrusion-color': '#0aa08b',
                    'fill-extrusion-opacity': 0.55,
                    'fill-extrusion-height': 8,
                    'fill-extrusion-base': 0,
                },
            }, beforeId);
            map.addLayer({
                id: 'selected-building-line',
                type: 'line',
                source: 'selected-building',
                paint: { 'line-color': '#076b5d', 'line-width': 2, 'line-opacity': 0.9 },
            });
        }
        return true;
    } catch (e) { selBuildingDbg.err = String((e && e.message) || e); return false; }
}

function reapplySelectedBuildingCache() {
    if (!selectedBuildingCache) return;
    try {
        map.getSource('selected-building').setData({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: selectedBuildingCache.geometry, properties: {} }],
        });
        if (map.getLayer('selected-building-fill')) {
            map.setPaintProperty('selected-building-fill', 'fill-extrusion-height', selectedBuildingCache.height);
            map.setPaintProperty('selected-building-fill', 'fill-extrusion-base', selectedBuildingCache.base);
        }
        try { selBuildingDbg.count = (selectedBuildingCache && selectedBuildingCache.linked) || 0; } catch (e) { }
    } catch (e) { }
}

// Ray-casting point-in-ring on [lng,lat] coords.
function ringContainsPt(ring, x, y) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
}

// Two outer rings touch if any vertex pair is within ~0.6m (shared edge or
// corner). Bbox precheck keeps the all-pairs scan cheap on big relations.
function ringsTouch(a, b) {
    try {
        if (!a || !b || !a.length || !b.length) return false;
        const eps = 0.6 / 111320; // ~0.6m in degrees
        let ax0 = Infinity, ax1 = -Infinity, ay0 = Infinity, ay1 = -Infinity;
        for (let k = 0; k < a.length; k++) {
            const c = a[k];
            if (c[0] < ax0) ax0 = c[0]; if (c[0] > ax1) ax1 = c[0];
            if (c[1] < ay0) ay0 = c[1]; if (c[1] > ay1) ay1 = c[1];
        }
        let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
        for (let k = 0; k < b.length; k++) {
            const c = b[k];
            if (c[0] < bx0) bx0 = c[0]; if (c[0] > bx1) bx1 = c[0];
            if (c[1] < by0) by0 = c[1]; if (c[1] > by1) by1 = c[1];
        }
        if (ax1 + eps < bx0 || bx1 + eps < ax0 || ay1 + eps < by0 || by1 + eps < ay0) return false;
        const e2 = eps * eps;
        for (let i = 0; i < a.length; i++) {
            for (let j = 0; j < b.length; j++) {
                const dx = a[i][0] - b[j][0], dy = a[i][1] - b[j][1];
                if (dx * dx + dy * dy <= e2) return true;
            }
        }
        return false;
    } catch (e) { return false; }
}

function featName(f) {
    try {
        const p = f.properties || {};
        const n = p.name;
        return (typeof n === 'string' && n.trim()) ? n.trim() : null;
    } catch (e) { return null; }
}

function featHeight(f) {
    try {
        const p = f.properties || {};
        const h = p.render_height, b = p.render_min_height;
        return {
            h: (typeof h === 'number' && isFinite(h)) ? h : 8,
            base: (typeof b === 'number' && isFinite(b)) ? b : 0,
        };
    } catch (e) { return { h: 8, base: 0 }; }
}

// Cross-feature flood fill: OSM splits connected complexes (hall + podium)
// and distinct neighbours (two named halls sharing a wall) into separate
// features. Seed from the member containing the pin, then link touching
// members whose OSM name is missing or matches the seed's — a different name
// stays grey even when sharing a wall. Height follows the picked feature.
function pickLinkedFootprints(blds, lng, lat) {
    try {
        if (!blds || !blds.length) return null;
        const members = [];
        for (let fi = 0; fi < blds.length; fi++) {
            const g = blds[fi].geometry;
            if (!g) continue;
            if (g.type === 'Polygon') members.push({ poly: g.coordinates, feat: fi });
            else if (g.type === 'MultiPolygon') {
                for (let k = 0; k < g.coordinates.length; k++) members.push({ poly: g.coordinates[k], feat: fi });
            }
        }
        if (!members.length) return null;
        let picked = -1;
        for (let i = 0; i < members.length; i++) {
            if (members[i].poly[0] && ringContainsPt(members[i].poly[0], lng, lat)) { picked = i; break; }
        }
        if (picked === -1) {
            let best = Infinity;
            for (let i = 0; i < members.length; i++) {
                const ring = (members[i].poly && members[i].poly[0]) || [];
                if (!ring.length) continue;
                let sx = 0, sy = 0;
                for (let k = 0; k < ring.length; k++) { sx += ring[k][0]; sy += ring[k][1]; }
                const dx = sx / ring.length - lng, dy = sy / ring.length - lat;
                const d = dx * dx + dy * dy;
                if (d < best) { best = d; picked = i; }
            }
            if (picked === -1) return null;
        }
        const seedName = featName(blds[members[picked].feat]);
        const nameOk = fi => { const n = featName(blds[fi]); return n === null || n === seedName; };
        const seen = {};
        seen[picked] = true;
        const linked = [picked];
        const queue = [picked];
        while (queue.length) {
            const cur = queue.pop();
            for (let i = 0; i < members.length; i++) {
                if (seen[i] || !members[i].poly[0] || !nameOk(members[i].feat)) continue;
                if (ringsTouch(members[cur].poly[0], members[i].poly[0])) { seen[i] = true; linked.push(i); queue.push(i); }
            }
        }
        const coords = linked.map(i => members[i].poly);
        const singlePoly = coords.length === 1 && blds[members[linked[0]].feat].geometry.type === 'Polygon';
        const geom = singlePoly
            ? { type: 'Polygon', coordinates: coords[0] }
            : { type: 'MultiPolygon', coordinates: coords };
        const hb = featHeight(blds[members[picked].feat]);
        const nameSet = {};
        linked.forEach(i => { const n = featName(blds[members[i].feat]); nameSet[n === null ? '(unnamed)' : n] = true; });
        return {
            geometry: geom, gtype: singlePoly ? 'Polygon' : 'MultiPolygon',
            members: members.length, picked: picked, linked: linked.length,
            names: Object.keys(nameSet), height: hb.h, base: hb.base,
        };
    } catch (e) { return null; }
}

// A single queried OSM feature can be a MultiPolygon relation spanning many
// blocks (found:1 yet the whole campus tints). Superseded by
// pickLinkedFootprints() above (cross-feature, name-aware) — removed.

// Anti z-fighting: our highlight extrusion must not share planes with the base
// building (identical footprint + height = flicker/speckle while moving).
// Push each outer ring outward ~0.4m from its centroid and lift the roof, so no
// face is ever coplanar with the original. Holes kept as-is (hidden inside).
function expandPolygon(polyCoords, meters, mPerDegLat, mPerDegLng) {
    if (!polyCoords || !polyCoords[0]) return polyCoords;
    const ring = polyCoords[0];
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < ring.length; i++) { sx += ring[i][0]; sy += ring[i][1]; n++; }
    if (!n) return polyCoords;
    const cx = sx / n, cy = sy / n;
    const out = ring.map(c => {
        const dx = (c[0] - cx) * mPerDegLng, dy = (c[1] - cy) * mPerDegLat;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1e-6) return [c[0], c[1]];
        const k = (d + meters) / d;
        return [cx + (c[0] - cx) * k, cy + (c[1] - cy) * k];
    });
    return [out].concat(polyCoords.slice(1));
}
function expandFootprint(geometry, meters) {
    try {
        if (!geometry || !geometry.coordinates) return geometry;
        const mPerDegLat = 111320;
        const mPerDegLng = 111320 * Math.cos(5.4 * Math.PI / 180); // campus latitude
        if (geometry.type === 'Polygon') {
            return { type: 'Polygon', coordinates: expandPolygon(geometry.coordinates, meters, mPerDegLat, mPerDegLng) };
        }
        if (geometry.type === 'MultiPolygon') {
            return { type: 'MultiPolygon', coordinates: geometry.coordinates.map(p => expandPolygon(p, meters, mPerDegLat, mPerDegLng)) };
        }
        return geometry;
    } catch (e) { return geometry; }
}

// Search/list selections query while the camera is still zoomed out (tiles not
// rendered yet → found:0). Grant each selection one retry after the camera
// settles + tiles load; then give up until the next selection (no loops).
function scheduleBuildingRequery() {
    if (!map || typeof map.once !== 'function') return;
    if (buildingRequeryPending || buildingRequeriedFor === highlightedPinId) return;
    buildingRequeryPending = true;
    buildingRequeriedFor = highlightedPinId;
    const myId = highlightedPinId;
    try {
        map.once('idle', () => {
            buildingRequeryPending = false;
            if (highlightedPinId === buildingRequeriedFor && selBuildingDbg.found === 0) {
                updateSelectedBuildingHighlight();
            }
            stopBuildingPoll();
        });
    } catch (e) { buildingRequeryPending = false; }
    // Interim pop-in: poll briefly while the camera flies so the tint can
    // appear mid-flight as soon as destination tiles arrive, not only after
    // the camera settles. Bounded (8 x 250ms) and hands over cleanly if the
    // selection changes mid-flight.
    stopBuildingPoll();
    buildingPollTries = 0;
    try {
        buildingPollTimer = setInterval(() => {
            buildingPollTries++;
            if (highlightedPinId !== myId) {
                stopBuildingPoll();
                buildingRequeryPending = false;
                buildingRequeriedFor = null;
                scheduleBuildingRequery(); // hand the retry to the new selection
                return;
            }
            if (selBuildingDbg.found === 1 || buildingPollTries >= 8) {
                stopBuildingPoll();
                buildingRequeryPending = false;
                return;
            }
            updateSelectedBuildingHighlight();
        }, 250);
    } catch (e) { stopBuildingPoll(); }
}

function updateSelectedBuildingHighlight() {
    selBuildingDbg.err = null;
    if (!map || !map.isStyleLoaded() || typeof map.queryRenderedFeatures !== 'function') {
        selBuildingDbg.lastBail = !map ? 'nomap' : (!map.isStyleLoaded() ? 'nostyle' : 'noqueryfn');
        scheduleBuildingRequery();
        return;
    }
    if (!ensureSelectedBuildingLayers()) { selBuildingDbg.lastBail = 'nolayers'; scheduleBuildingRequery(); return; }
    const loc = (highlightedPinId !== null && highlightedPinId !== undefined)
        ? mapData.find(l => l.id === highlightedPinId) : null;
    if (!loc || !loc.coords) {
        try { map.getSource('selected-building').setData({ type: 'FeatureCollection', features: [] }); } catch (e) { }
        selBuildingDbg.found = 0;
        selBuildingDbg.layer = null;
        selBuildingDbg.lastBail = 'noloc';
        selectedBuildingCache = null;
        buildingRequeriedFor = null;
        return;
    }
    try {
        const pt = map.project([loc.coords[1], loc.coords[0]]);
        try { selBuildingDbg.zoom = map.getZoom(); selBuildingDbg.pitch = map.getPitch(); } catch (e) { }
        selBuildingDbg.triedBox = true;
        const isBuilding = f => f.sourceLayer === 'building' || (f.layer && /build/i.test(f.layer.id));
        // Stale tint from another pin must go immediately; a miss below then
        // keeps the (now empty) state instead of someone else's building.
        if (selectedBuildingCache && selectedBuildingCache.locId !== loc.id) {
            try { map.getSource('selected-building').setData({ type: 'FeatureCollection', features: [] }); } catch (e) { }
            selectedBuildingCache = null;
        }
        // One box query gathers the picked feature plus its neighbours for
        // name-aware cross-feature linking (hall + unnamed podium link up;
        // a differently-named hall sharing a wall does not).
        let blds = [];
        try {
            const r = 6;
            blds = (map.queryRenderedFeatures([[pt.x - r, pt.y - r], [pt.x + r, pt.y + r]], {}) || []).filter(isBuilding);
        } catch (e) { blds = []; }
        selBuildingDbg.layer = (blds.length && blds[0].layer && blds[0].layer.id) || null;
        const pick = pickLinkedFootprints(blds, loc.coords[1], loc.coords[0]);
        if (!pick) { selBuildingDbg.found = 0; selBuildingDbg.lastBail = 'miss'; scheduleBuildingRequery(); return; } // keep cache: tiles may not be ready
        selectedBuildingCache = { geometry: expandFootprint(pick.geometry, 0.4), height: pick.height + 0.4, base: pick.base, locId: loc.id, linked: pick.linked };
        selBuildingDbg.found = 1;
        selBuildingDbg.height = pick.height;
        selBuildingDbg.gtype = pick.gtype;
        selBuildingDbg.members = pick.members;
        selBuildingDbg.picked = pick.picked;
        selBuildingDbg.linked = pick.linked;
        selBuildingDbg.names = pick.names;
        selBuildingDbg.lastBail = null;
        reapplySelectedBuildingCache();
        dlog('[building] highlight:', loc.number, 'h=' + pick.height + ' linked=' + pick.linked);
    } catch (e) { selBuildingDbg.err = String((e && e.message) || e); console.warn('building highlight failed:', e); }
}

// Recompute pin tiers after filter/zoom changes.
function refreshPinView() {
    refreshPinTiers();
}

function applyPinVisibility() {
    pinMarkers.forEach(r => {
        if (!r.el) return;
        // Single-pin focus always stays visible (explicit user selection).
        r.el.style.display = (markersVisible || r.exempt) ? '' : 'none';
    });
}

// ===== SHARED PIN POPUP (single element, repositioned on move) =====

function ensurePinPopup() {
    if (pinPopupEl) return pinPopupEl;
    pinPopupEl = document.createElement('div');
    pinPopupEl.id = 'pin-popup';
    pinPopupEl.style.display = 'none';
    document.body.appendChild(pinPopupEl);
    return pinPopupEl;
}

function positionPinPopup() {
    if (!pinPopupEl || pinPopupEl.style.display === 'none') return;
    const locId = (pinPopupLocId !== null && pinPopupLocId !== undefined) ? pinPopupLocId : pinPopupHoverId;
    const loc = mapData.find(l => l.id === locId);
    if (!loc || !loc.coords || !map) { hidePinPopup(); return; }
    const p = map.project([loc.coords[1], loc.coords[0]]);
    const r = map.getContainer().getBoundingClientRect();
    // Badge floats above the stem when pitched — lift the popup accordingly.
    // stem height + badge height + gap, all in screen px.
    const stemH = CONFIG.pins.stem.heightPx;
    const badgeH = CONFIG.pins.badgePx;
    const lift = document.body.classList.contains('is-pitched') ? stemH + badgeH + 7 : badgeH + 7;
    pinPopupEl.style.left = `${r.left + p.x}px`;
    pinPopupEl.style.top = `${r.top + p.y - lift}px`;
}

function hidePinPopup() {
    pinPopupLocId = null;
    pinPopupHoverId = null;
    if (pinPopupEl) pinPopupEl.style.display = 'none';
}

function showPinPopup(locationId, mode) {
    const loc = mapData.find(l => l.id === locationId);
    if (!loc) return;
    const el = ensurePinPopup();
    const bgColor = getCategoryColor(loc.locationType);
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${loc.coords[0]},${loc.coords[1]}`;
    if (mode === 'mini') {
        pinPopupHoverId = locationId;
        el.className = 'mini';
        el.innerHTML = `<div class="popup-content-wrapper"><strong class="popup-stop-name">${loc.place}</strong></div>`;
    } else {
        pinPopupLocId = locationId;
        pinPopupHoverId = null;
        el.className = 'full';
        el.innerHTML = `
            <div class="popup-content-wrapper">
                <button class="tooltip-close-btn" style="display:flex;">×</button>
                <strong class="popup-stop-name">${loc.place}</strong>
                <span class="popup-category" style="background:${bgColor}">${loc.locationType}</span>
                <div class="popup-buttons" style="max-height:80px;opacity:1;margin-top:6px;padding-bottom:4px;">
                    <button class="tooltip-info-btn" data-location-id="${loc.id}">i</button>
                    <a href="${googleUrl}" target="_blank" class="popup-link"><span class="material-symbols-outlined">directions</span>Arah</a>
                </div>
            </div>`;
        const infoBtn = el.querySelector('.tooltip-info-btn');
        if (infoBtn) infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showLocationInfoOverlay(parseInt(infoBtn.dataset.locationId));
        });
        const closeBtn = el.querySelector('.tooltip-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hidePinPopup();
            setMarkerHighlight(null);
        });
    }
    el.style.display = 'block';
    positionPinPopup();
}

function initPinInteractions() {
    // Pins handle their own hover/click on their elements; the map only needs
    // to keep the shared popup glued while the camera moves — and to flag
    // pitched state (stems render only when tilted).
    map.on('move', () => {
        try {
            document.body.classList.toggle('is-pitched', map.getPitch() > CONFIG.pins.stem.minPitch);
        } catch (e) { }
        positionPinPopup();
    });
}

// ===== CATEGORY COLOR SYSTEM =====
const CATEGORY_COLORS = {
    'PENTADBIRAN & PTJ': { bg: '#2b8a8f', text: 'white' },
    'BLOK AKADEMIK & KELAS': { bg: '#205c8c', text: 'white' },
    'BLOK FAKULTI & PUSAT PENGAJIAN': { bg: '#d4a000', text: 'black' },
    'KOLEJ KEDIAMAN': { bg: '#ecaa2b', text: 'black' },
    'PUSAT AKTIVITI': { bg: '#e0468a', text: 'black' },
    'SUKAN & REKREASI': { bg: '#8A2BE2', text: 'white' },
    'CAFE & MAKANAN': { bg: '#b0a020', text: 'black' },
    'KESIHATAN': { bg: '#DC143C', text: 'white' },
    'IBADAH': { bg: '#32CD32', text: 'black' },
    'FASILITI & KEMUDAHAN': { bg: '#8f9ce2', text: 'black' },
};

const DESIRED_ORDER = [
    'PENTADBIRAN & PTJ',
    'BLOK AKADEMIK & KELAS',
    'BLOK FAKULTI & PUSAT PENGAJIAN',
    'KOLEJ KEDIAMAN',
    'PUSAT AKTIVITI',
    'SUKAN & REKREASI',
    'CAFE & MAKANAN',
    'KESIHATAN',
    'IBADAH',
    'FASILITI & KEMUDAHAN',
];

const CATEGORY_SLUG = {
    'PENTADBIRAN & PTJ': 'pentadbiran',
    'BLOK AKADEMIK & KELAS': 'akademik',
    'BLOK FAKULTI & PUSAT PENGAJIAN': 'fakulti',
    'KOLEJ KEDIAMAN': 'kolej-kediaman',
    'PUSAT AKTIVITI': 'aktiviti',
    'SUKAN & REKREASI': 'sukan',
    'CAFE & MAKANAN': 'cafe',
    'KESIHATAN': 'kesihatan',
    'IBADAH': 'ibadah',
    'FASILITI & KEMUDAHAN': 'fasiliti',
};

function getCategoryColor(lt) {
    return (CATEGORY_COLORS[lt] || { bg: '#778899' }).bg;
}

function getCategoryTextColor(lt) {
    return (CATEGORY_COLORS[lt] || { text: 'white' }).text;
}

// ===== DATA PROCESSING =====

function parseCoords(googleMapLink) {
    if (!googleMapLink || typeof googleMapLink !== 'string') return null;
    const qIndex = googleMapLink.indexOf('?q=');
    if (qIndex === -1) return null;
    const coordStr = googleMapLink.slice(qIndex + 3);
    const parts = coordStr.split(',');
    if (parts.length < 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    // Sanity check: Malaysia bounding box
    if (lat < 3.0 || lat > 7.5 || lng < 99.0 || lng > 120.0) return null;
    return [lat, lng];
}

function customSort(a, b) {
    const strA = String(a.number).trim();
    const strB = String(b.number).trim();
    const regex = /^([A-Z]*)(\d+)?([A-Z]*)?$/i;
    const matchA = strA.match(regex) || [];
    const matchB = strB.match(regex) || [];
    const lettersA = (matchA[1] || '').toUpperCase();
    const numberA = matchA[2] ? parseInt(matchA[2], 10) : Infinity;
    const lettersB = (matchB[1] || '').toUpperCase();
    const numberB = matchB[2] ? parseInt(matchB[2], 10) : Infinity;
    const aIsPureNumber = /^\d+$/.test(strA);
    const bIsPureNumber = /^\d+$/.test(strB);

    if (aIsPureNumber && !bIsPureNumber) return 1;
    if (!aIsPureNumber && bIsPureNumber) return -1;
    if (aIsPureNumber && bIsPureNumber) return parseInt(strA, 10) - parseInt(strB, 10);

    if (lettersA < lettersB) return -1;
    if (lettersA > lettersB) return 1;

    if (numberA < numberB) return -1;
    if (numberA > numberB) return 1;

    return strA.localeCompare(strB);
}

function processData(rawData) {
    let idx = 0;
    return rawData
        .filter(item => item.number && item.number.trim() && item.place && item.place.trim())
        .map(item => ({
            ...item,
            id: idx++,
            coords: parseCoords(item.googleMapLink),
        }));
}

// (removed: HTML markers replaced by canvas pin engine above)

// ===== RENDERING =====

function renderGroupedList() {
    const container = document.getElementById('company-list');
    container.innerHTML = '';

    // Group locations by category
    const groups = {};
    mapData.forEach(loc => {
        const cat = loc.locationType || 'Lain-lain';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(loc);
    });

    // Sort categories by desired order
    const sortedCategories = Object.keys(groups).sort((a, b) => {
        let ia = DESIRED_ORDER.indexOf(a);
        let ib = DESIRED_ORDER.indexOf(b);
        if (ia === -1) ia = Infinity;
        if (ib === -1) ib = Infinity;
        return ia - ib;
    });

    sortedCategories.forEach(categoryName => {
        const locs = groups[categoryName].sort(customSort);
        const bgColor = getCategoryColor(categoryName);
        const textColor = getCategoryTextColor(categoryName);

        const groupDiv = document.createElement('div');
        groupDiv.className = 'stop-group collapsed';

        const header = document.createElement('button');
        header.className = 'stop-header';
        header.style.borderLeftColor = bgColor;
        header.style.borderLeftWidth = '10px';
        header.innerHTML = `<span class="stop-header-label">${categoryName}</span><span class="category-share-btn" role="button" tabindex="0" title="Salin pautan kategori"><span class="material-symbols-outlined">link</span></span>`;
        header.onclick = () => {
            document.querySelectorAll('.stop-group').forEach(g => g.classList.add('collapsed'));
            filterByCategory(categoryName);
            updateToggleButtonLabel();
        };

        header.querySelector('.category-share-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const url = window.location.origin + window.location.pathname + '?type=' + slugify(categoryName);
            copyToClipboard(url);
        });

        const subList = document.createElement('div');
        subList.className = 'company-sub-list';

        locs.forEach(loc => {
            const btn = document.createElement('button');
            btn.className = 'category-btn' + (loc.coords ? '' : ' no-coords');
            btn.dataset.locationId = loc.id;

            // Colored number badge
            const badge = document.createElement('span');
            badge.className = 'location-number-badge';
            badge.style.background = bgColor;
            badge.style.color = textColor;
            badge.textContent = loc.number;

            const namePart = document.createElement('span');
            namePart.className = 'location-place-name';
            namePart.textContent = loc.place;
            if (loc.shortForm && loc.shortForm.trim()) {
                const sf = document.createElement('span');
                sf.className = 'location-short-form';
                sf.textContent = ' (' + loc.shortForm + ')';
                namePart.appendChild(sf);
            }

            btn.appendChild(badge);
            btn.appendChild(namePart);

            btn.onclick = (e) => {
                e.stopPropagation();
                if (window.innerWidth > 768) {
                    filterByLocation(loc);
                } else {
                    showLocationOnMap(loc);
                }
                showLocationInfoOverlay(loc.id);
            };

            subList.appendChild(btn);
        });

        groupDiv.appendChild(header);
        groupDiv.appendChild(subList);
        container.appendChild(groupDiv);
    });
}

// ===== FILTERING (canvas pins: subsets + layer zoom ranges) =====

// Fit a list of [lat,lng] coords. Accepts Leaflet-style {paddingTopLeft, paddingBottomRight, padding}
// or a MapLibre padding object — normalized internally.
function fitCoordsToMap(coords, { paddingTopLeft, paddingBottomRight, padding, maxZoom = 18, duration = 1200 } = {}) {
    if (!map || !coords.length) return;
    const bounds = new maplibregl.LngLatBounds();
    coords.forEach(c => bounds.extend([c[1], c[0]]));
    // Single point: grow slightly so fitBounds has area
    if (coords.length === 1) {
        const c = coords[0];
        bounds.extend([c[1] + 0.0004, c[0] + 0.0004]);
        bounds.extend([c[1] - 0.0004, c[0] - 0.0004]);
    }
    let pad;
    if (paddingTopLeft || paddingBottomRight) {
        const tl = paddingTopLeft || [0, 0];
        const br = paddingBottomRight || [0, 0];
        pad = { top: tl[1] || 0, left: tl[0] || 0, bottom: br[1] || 0, right: br[0] || 0 };
    } else if (Array.isArray(padding)) {
        pad = padding.length === 4
            ? { top: padding[0], right: padding[1], bottom: padding[2], left: padding[3] }
            : { top: padding[0], right: padding[1], bottom: padding[0], left: padding[1] };
    } else {
        pad = padding || 60;
    }
    map.fitBounds(bounds, { padding: pad, maxZoom, duration });
}

function flyToMarker(coords, duration = 0.8) {
    if (!map) return;
    const zoomThreshold = pinZoomThreshold();
    const zoom = Math.max(map.getZoom(), zoomThreshold);
    // Offset the center downward so the marker sits above the bottom sheet
    const p = map.project([coords[1], coords[0]]);
    const center = map.unproject([p.x, p.y + window.innerHeight * 0.15]);
    map.flyTo({ center, zoom, duration: duration * 1000 });
}

function showAllLocations(animate = true, updateUrl = true) {
    if (updateUrl) updateURL();
    document.querySelector('.stop-category-overlay')?.remove();
    currentOverlaySource = null;
    currentActiveCategory = null;
    currentSelectedLocationId = null;
    document.querySelectorAll('.stop-header').forEach(h => h.classList.remove('category-active'));

    rebuildPinMarkers(mapData.filter(loc => loc.coords));

    const coords = mapData.filter(loc => loc.coords).map(loc => loc.coords);

    if (coords.length > 0) {
        const isMobile = window.innerWidth <= 768;
        const mobileCenter = CONFIG.view.mobileCenter;
        const desktopCenter = CONFIG.view.center;
        const pitch = (show3D && currentBaseView === 'vector') ? CONFIG.view.pitch3D : 0;
        if (animate) {
            map.flyTo({ center: isMobile ? mobileCenter : desktopCenter, zoom: isMobile ? CONFIG.view.zoom.mobile : CONFIG.view.zoom.desktop, pitch, duration: 1200 });
        } else {
            map.jumpTo({ center: isMobile ? mobileCenter : desktopCenter, zoom: isMobile ? CONFIG.view.zoom.mobile : CONFIG.view.zoom.desktop, pitch });
        }
    }

    // Collapse bottom sheet on mobile
    if (window.innerWidth <= 768 && sheetElement) {
        sheetElement.style.height = '';
        setSheetState('peek');
    }
    updatePanRestrictionForState();
}

function filterByCategory(categoryName) {
    // Toggle: clicking same category again resets to show all
    if (currentActiveCategory === categoryName) {
        currentActiveCategory = null;
        document.querySelectorAll('.stop-header').forEach(h => h.classList.remove('category-active'));
        showAllLocations();
        return;
    }

    currentActiveCategory = categoryName;
    currentSelectedLocationId = null;
    updateURL({ type: categoryName });

    // Update header active state
    document.querySelectorAll('.stop-header').forEach(h => {
        const span = h.querySelector('span');
        if (span && span.textContent === categoryName) {
            h.classList.add('category-active');
        } else {
            h.classList.remove('category-active');
        }
    });

    clearMarkers();
    const catLocs = mapData.filter(loc => loc.locationType === categoryName && loc.coords);
    rebuildPinMarkers(catLocs);
    const coords = catLocs.map(loc => loc.coords);

    const isMobile = window.innerWidth <= 768;
    if (coords.length > 0) {
        if (isMobile) {
            const bottomPad = Math.round(window.innerHeight * 0.5) + 20;
            fitCoordsToMap(coords, { paddingTopLeft: [40, 60], paddingBottomRight: [40, bottomPad], maxZoom: 18, duration: 1200 });
        } else {
            fitCoordsToMap(coords, { padding: getMapPadding(), maxZoom: 18, duration: 1200 });
        }
    }

    showCategoryOverlay(categoryName);

    // Expand bottom sheet to half on mobile so the list is visible
    if (window.innerWidth <= 768 && sheetElement) {
        sheetElement.style.height = '';
        setSheetState('half');
    }
}

function filterByLocation(location) {
    if (!location.coords) return;
    if (currentSelectedLocationId === location.id) return;

    currentSelectedLocationId = location.id;
    currentActiveCategory = null;
    document.querySelectorAll('.stop-header').forEach(h => h.classList.remove('category-active'));

    rebuildPinMarkers([location], true);
    setMarkerHighlight(location.id);

    const basePadding = getMapPadding();
    const padding = [100, 100, 100, basePadding[3] || 100];
    fitCoordsToMap([location.coords], { padding, maxZoom: 19, duration: 1200 });
}

function showLocationOnMap(location) {
    if (!location.coords) return;

    currentSelectedLocationId = location.id;
    currentActiveCategory = null;
    document.querySelectorAll('.stop-header').forEach(h => h.classList.remove('category-active'));

    rebuildPinMarkers([location], true);
    setMarkerHighlight(location.id);

    flyToMarker(location.coords);

    if (sheetElement) {
        sheetElement.style.height = '';
        setSheetState('peek');
    }
}

// ===== INFO OVERLAY =====

function showLocationInfoOverlay(locationId) {
    if (currentInfoOverlayLocationId === locationId) return;
    clearRoute();

    const location = mapData.find(l => l.id === locationId);
    if (!location) return;

    currentInfoOverlayLocationId = locationId;
    updateURL({ type: currentActiveCategory || null, location });

    const bgColor = getCategoryColor(location.locationType);
    const textColor = getCategoryTextColor(location.locationType);
    const googleUrl = location.googleMapLink || '#';

    const folder = CATEGORY_SLUG[location.locationType] ?? 'lain';
    const imgBase = `https://raw.githubusercontent.com/unija-info/unija-map/main/kgb/data/kgb-map/images/${folder}/${location.number}`;
    const imageHtml = `
        <div class="info-overlay-image-wrap">
            <img class="info-overlay-image" src="${imgBase}.jpg" alt="${location.place}"
                 onload="this.style.opacity='1';this.nextElementSibling.style.opacity='0';"
                 onerror="
                   if(this.src.endsWith('.jpg')){this.src=this.src.replace(/\\.jpg$/,'.png');}
                   else if(this.src.endsWith('.png')){this.src=this.src.replace(/\\.png$/,'.webp');}
                   else{this.style.opacity='0';}
                 " />
            <div class="info-overlay-image-placeholder">
                <span class="material-symbols-outlined">hide_image</span>
                <span>Tiada Gambar</span>
            </div>
        </div>
    `;

    let detailRowsHtml = '';

    if (location.locationType && location.locationType.trim()) {
        detailRowsHtml += `
            <div class="info-overlay-detail-row">
                <span class="info-overlay-detail-label">Kategori</span>
                <button class="info-overlay-category-badge" style="background:${bgColor}; color:${textColor};">${location.locationType}</button>
            </div>`;
    }

    if (location.shortForm && location.shortForm.trim()) {
        detailRowsHtml += `
            <div class="info-overlay-detail-row">
                <span class="info-overlay-detail-label">Singkatan</span>
                <span class="info-overlay-detail-value">${location.shortForm}</span>
            </div>`;
    }

    if (location.details && location.details.trim()) {
        detailRowsHtml += `
            <div class="info-overlay-detail-row">
                <span class="info-overlay-detail-label">Info</span>
                <span class="info-overlay-detail-value">${location.details}</span>
            </div>`;
    }

    if (!location.coords) {
        detailRowsHtml += `
            <div class="info-overlay-detail-row">
                <span class="info-overlay-detail-label">Lokasi</span>
                <span class="info-overlay-detail-value" style="color:#DC143C;">Koordinat tidak tersedia di peta</span>
            </div>`;
    }

    const directionsHtml = location.googleMapLink
        ? `<a href="${googleUrl}" target="_blank" class="info-overlay-directions"><span class="material-symbols-outlined">directions</span>Buka di Google Maps</a>`
        : '';

    const directionsToHereHtml = location.coords
        ? `<button class="info-overlay-directions info-overlay-directions-to-here"><span class="material-symbols-outlined">route</span>Dapatkan Arah</button>`
        : '';

    const shareHtml = `<button class="info-overlay-share"><span class="material-symbols-outlined">link</span>Salin Pautan</button>`;

    const innerHTMLString = `
        <div class="info-overlay-header">
            <button class="info-overlay-back">
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <span class="info-overlay-number-badge" style="background:${bgColor}; color:${textColor};">${location.number}</span>
            <h3>${location.place}</h3>
            <button class="info-overlay-close">×</button>
        </div>
        <div class="info-overlay-content">
            ${imageHtml}
            ${detailRowsHtml ? `<div class="info-overlay-details">${detailRowsHtml}</div>` : ''}
            ${directionsHtml}
            ${directionsToHereHtml}
            ${shareHtml}
        </div>
    `;

    function wireButtons(overlayEl) {
        // × — fully reset: close overlay + show all locations
        function closeOverlay() {
            overlayEl.classList.add('closing');
            overlayEl.addEventListener('animationend', () => {
                overlayEl.remove();
                currentInfoOverlayLocationId = null;
                clearRoute();
                showAllLocations();
            });
        }
        // ← — dismiss only: close overlay, keep current map state
        function dismissOverlay() {
            overlayEl.classList.add('closing');
            overlayEl.addEventListener('animationend', () => {
                overlayEl.remove();
                currentInfoOverlayLocationId = null;
                clearRoute();
                if (currentOverlaySource === 'category') {
                    // Category overlay is still in DOM — restore category pins
                    currentSelectedLocationId = null;
                    rebuildPinMarkers(mapData.filter(l => l.locationType === currentActiveCategory && l.coords));
                    updateURL({ type: currentActiveCategory });
                    currentOverlaySource = null;
                } else {
                    updateURL({ type: currentActiveCategory || null });
                }
            });
        }
        overlayEl.querySelector('.info-overlay-close').onclick = closeOverlay;
        overlayEl.querySelector('.info-overlay-back').onclick = dismissOverlay;

        const categoryBadge = overlayEl.querySelector('.info-overlay-category-badge');
        if (categoryBadge) {
            categoryBadge.addEventListener('click', () => {
                const catName = location.locationType;
                overlayEl.classList.add('closing');
                overlayEl.addEventListener('animationend', () => {
                    overlayEl.remove();
                    currentInfoOverlayLocationId = null;
                    currentOverlaySource = null;
                    filterByCategory(catName);
                }, { once: true });
            });
        }

        const shareBtn = overlayEl.querySelector('.info-overlay-share');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => copyToClipboard(window.location.href));
        }

        const directionsToHereBtn = overlayEl.querySelector('.info-overlay-directions-to-here');
        if (directionsToHereBtn) {
            directionsToHereBtn.addEventListener('click', () => {
                dismissOverlay();
                openDirectionsPanel({
                    start: { type: 'gps', coords: null, label: 'Lokasi Saya (GPS)' },
                    end: { type: 'location', id: location.id, coords: location.coords, label: location.place },
                });
            });
        }
    }

    const existingOverlay = document.querySelector('.stop-info-overlay');

    if (existingOverlay) {
        // Update in place: cross-fade so sidebar never shows through
        existingOverlay.style.transition = 'opacity 0.12s ease';
        existingOverlay.style.opacity = '0';
        setTimeout(() => {
            existingOverlay.innerHTML = innerHTMLString;
            wireButtons(existingOverlay);
            existingOverlay.style.opacity = '1';
        }, 120);
    } else {
        // First open: use slide-in animation
        const overlay = document.createElement('div');
        overlay.className = 'stop-info-overlay';
        overlay.innerHTML = innerHTMLString;
        wireButtons(overlay);
        document.getElementById('sidebar').appendChild(overlay);

        // On mobile, expand bottom sheet to half height
        if (window.innerWidth <= 768 && sheetElement) {
            sheetElement.style.height = '';
            setSheetState('half');
        }
    }
}

// ===== CATEGORY OVERLAY =====

function showCategoryOverlay(categoryName) {
    const bgColor = getCategoryColor(categoryName);
    const textColor = getCategoryTextColor(categoryName);
    const locs = mapData.filter(l => l.locationType === categoryName).sort(customSort);
    const sidebar = document.getElementById('sidebar');

    let listHtml = '';
    locs.forEach(loc => {
        const isNoCoords = !loc.coords;
        listHtml += `
            <button class="category-btn${isNoCoords ? ' no-coords' : ''}" data-loc-id="${loc.id}">
                <span class="location-number-badge" style="background:${bgColor}; color:${textColor};">${loc.number}</span>
                <span class="location-place-name">${loc.place}${loc.shortForm && loc.shortForm.trim() ? `<span class="location-short-form"> (${loc.shortForm})</span>` : ''}</span>
            </button>`;
    });

    const innerHTMLString = `
        <div class="category-overlay-header" style="border-left: 6px solid ${bgColor};">
            <button class="category-overlay-back">
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <span class="category-overlay-badge" style="background:${bgColor}; color:${textColor};">${categoryName}</span>
            <button class="category-overlay-close">×</button>
        </div>
        <div class="category-overlay-share-row">
            <button class="category-overlay-share">
                <span class="material-symbols-outlined">link</span>
                Salin Pautan Kategori
            </button>
        </div>
        <div class="category-overlay-subtitle">${locs.length} lokasi</div>
        <div class="category-overlay-list">${listHtml}</div>`;

    function wireCategoryOverlayButtons(overlayEl) {
        overlayEl.querySelector('.category-overlay-back').onclick = () => showAllLocations();
        overlayEl.querySelector('.category-overlay-close').onclick = () => showAllLocations();

        overlayEl.querySelector('.category-overlay-share').onclick = () => {
            const url = window.location.origin + window.location.pathname + '?type=' + slugify(categoryName);
            copyToClipboard(url);
        };

        overlayEl.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const locId = parseInt(btn.dataset.locId);
                const loc = mapData.find(l => l.id === locId);
                if (!loc) return;
                // Save category before filterByLocation/showLocationOnMap reset it
                const savedCategory = currentActiveCategory;
                currentOverlaySource = 'category';
                if (loc.coords) {
                    if (window.innerWidth > 768) filterByLocation(loc);
                    else showLocationOnMap(loc);
                }
                // Restore so dismissOverlay() can re-render category pins
                currentActiveCategory = savedCategory;
                showLocationInfoOverlay(loc.id);
            });
        });
    }

    const existingOverlay = sidebar.querySelector('.stop-category-overlay');

    if (existingOverlay) {
        // Cross-fade when switching categories (e.g. via search)
        existingOverlay.style.transition = 'opacity 0.12s ease';
        existingOverlay.style.opacity = '0';
        setTimeout(() => {
            existingOverlay.innerHTML = innerHTMLString;
            wireCategoryOverlayButtons(existingOverlay);
            existingOverlay.style.opacity = '1';
        }, 120);
    } else {
        const overlay = document.createElement('div');
        overlay.className = 'stop-category-overlay';
        overlay.innerHTML = innerHTMLString;
        wireCategoryOverlayButtons(overlay);
        sidebar.appendChild(overlay);
    }
}

// ===== MOBILE BOTTOM SHEET =====
let sheetState = 'peek';
let desktopSidebarCollapsed = false;
let touchStartY = 0;
let touchCurrentY = 0;
let isDragging = false;
let sheetElement = null;
let sheetStartHeight = 0;
let lastTouchY = 0;

let scrollContainer = null;
let scrollStartTop = 0;
let gestureMode = null;
let contentTouchStartY = 0;

function initBottomSheet() {
    if (window.innerWidth > 768) return;

    sheetElement = document.getElementById('sidebar');
    const handleElement = document.querySelector('.sheet-handle');

    if (!sheetElement) return;

    if (!handleElement) {
        const handle = document.createElement('div');
        handle.className = 'sheet-handle';
        handle.innerHTML = '<div class="handle-bar"></div>';
        sheetElement.insertBefore(handle, sheetElement.firstChild);
    }

    sheetElement.classList.add('sheet-peek');

    const actualHandle = sheetElement.querySelector('.sheet-handle');

    actualHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
    actualHandle.addEventListener('touchmove', handleTouchMove, { passive: false });
    actualHandle.addEventListener('touchend', handleTouchEnd);
    actualHandle.addEventListener('click', handleSheetTap);

    const headerElement = sheetElement.querySelector('.sidebar-header');
    scrollContainer = document.getElementById('company-list');

    if (headerElement) {
        headerElement.addEventListener('touchstart', handleHeaderTouchStart, { passive: false });
        headerElement.addEventListener('touchmove', handleHeaderTouchMove, { passive: false });
        headerElement.addEventListener('touchend', handleHeaderTouchEnd);
    }

    if (scrollContainer) {
        scrollContainer.addEventListener('touchstart', handleContentTouchStart, { passive: true });
        scrollContainer.addEventListener('touchmove', handleContentTouchMove, { passive: false });
        scrollContainer.addEventListener('touchend', handleContentTouchEnd);
    }
}

function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    lastTouchY = touchStartY;
    isDragging = true;
    sheetStartHeight = sheetElement.offsetHeight;
    sheetElement.style.transition = 'none';
}

function handleTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    touchCurrentY = e.touches[0].clientY;
    const deltaY = touchStartY - touchCurrentY;
    let newHeight = sheetStartHeight + deltaY;
    const minHeight = window.innerHeight * 0.15;
    const maxHeight = window.innerHeight * 0.90;
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    sheetElement.style.height = newHeight + 'px';
    updateFloatingButtonsPosition();
    lastTouchY = touchCurrentY;
}

function handleTouchEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    sheetElement.style.transition = '';
    const currentHeight = sheetElement.offsetHeight;
    const heightPercent = (currentHeight / window.innerHeight) * 100;
    if (heightPercent < 32) {
        sheetState = 'peek';
    } else if (heightPercent < 70) {
        sheetState = 'half';
    } else {
        sheetState = 'full';
    }
}

function handleSheetTap(e) {
    sheetElement.style.height = '';
    if (sheetState === 'peek') {
        setSheetState('half');
    } else if (sheetState === 'half') {
        setSheetState('full');
    } else {
        setSheetState('peek');
    }
}

function handleContentTouchStart(e) {
    contentTouchStartY = e.touches[0].clientY;
    lastTouchY = contentTouchStartY;
    gestureMode = null;
    if (scrollContainer) scrollStartTop = scrollContainer.scrollTop;
    sheetStartHeight = sheetElement.offsetHeight;
}

function handleContentTouchMove(e) {
    const currentY = e.touches[0].clientY;
    const deltaY = contentTouchStartY - currentY;
    const isMovingUp = deltaY > 0;
    const isMovingDown = deltaY < 0;

    if (gestureMode === null && Math.abs(deltaY) > 5) {
        if (isMovingDown) {
            if (scrollContainer && scrollContainer.scrollTop > 0) {
                gestureMode = 'scroll';
            } else {
                gestureMode = 'sheet';
            }
        } else if (isMovingUp) {
            if (sheetState !== 'full') {
                gestureMode = 'sheet';
            } else {
                gestureMode = 'scroll';
            }
        }
    }

    if (gestureMode === 'sheet') {
        e.preventDefault();
        sheetElement.style.transition = 'none';
        isDragging = true;
        let newHeight = sheetStartHeight + deltaY;
        const minHeight = window.innerHeight * 0.15;
        const maxHeight = window.innerHeight * 0.90;
        newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        sheetElement.style.height = newHeight + 'px';
        updateFloatingButtonsPosition();
    }

    lastTouchY = currentY;
}

function handleContentTouchEnd(e) {
    if (gestureMode === 'sheet' && isDragging) {
        isDragging = false;
        sheetElement.style.transition = '';
        const currentHeight = sheetElement.offsetHeight;
        const heightPercent = (currentHeight / window.innerHeight) * 100;
        if (heightPercent < 32) {
            sheetState = 'peek';
        } else if (heightPercent < 70) {
            sheetState = 'half';
        } else {
            sheetState = 'full';
        }
    }
    gestureMode = null;
}

function handleHeaderTouchStart(e) {
    contentTouchStartY = e.touches[0].clientY;
    lastTouchY = contentTouchStartY;
    sheetStartHeight = sheetElement.offsetHeight;
    isDragging = true;
    sheetElement.style.transition = 'none';
}

function handleHeaderTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const currentY = e.touches[0].clientY;
    const deltaY = contentTouchStartY - currentY;
    let newHeight = sheetStartHeight + deltaY;
    const minHeight = window.innerHeight * 0.15;
    const maxHeight = window.innerHeight * 0.90;
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    sheetElement.style.height = newHeight + 'px';
    updateFloatingButtonsPosition();
    lastTouchY = currentY;
}

function handleHeaderTouchEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    sheetElement.style.transition = '';
    const currentHeight = sheetElement.offsetHeight;
    const heightPercent = (currentHeight / window.innerHeight) * 100;
    if (heightPercent < 32) {
        sheetState = 'peek';
    } else if (heightPercent < 70) {
        sheetState = 'half';
    } else {
        sheetState = 'full';
    }
}

function setSheetState(newState) {
    if (!sheetElement) return;
    sheetElement.classList.remove('sheet-peek', 'sheet-half', 'sheet-full');
    if (newState === 'half') {
        sheetElement.classList.add('sheet-half');
    } else if (newState === 'full') {
        sheetElement.classList.add('sheet-full');
    }
    sheetState = newState;
}

// ===== DESKTOP SIDEBAR =====

function initDesktopSidebar() {
    if (window.innerWidth <= 768) return;

    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    const expandBtn = document.getElementById('sidebar-expand-btn');

    if (!sidebar || !collapseBtn || !expandBtn) return;

    collapseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDesktopSidebar(true);
    });

    expandBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDesktopSidebar(false);
    });
}

function toggleDesktopSidebar(collapse) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || window.innerWidth <= 768) return;

    if (collapse === undefined) collapse = !desktopSidebarCollapsed;

    desktopSidebarCollapsed = collapse;

    if (collapse) {
        sidebar.classList.add('collapsed');
    } else {
        sidebar.classList.remove('collapsed');
    }
}

// ===== MAP PADDING =====

function getMapPadding() {
    if (window.innerWidth <= 768) {
        return [100, 100];
    }
    if (desktopSidebarCollapsed) {
        return [50, 50, 50, 80];
    } else {
        return [50, 50, 50, 420];
    }
}

// ===== SEARCH =====

function matchLocationsByTerm(term) {
    const lowerTerm = term.toLowerCase();
    return mapData.filter(loc =>
        (loc.number || '').toLowerCase().includes(lowerTerm) ||
        (loc.place || '').toLowerCase().includes(lowerTerm) ||
        (loc.shortForm || '').toLowerCase().includes(lowerTerm) ||
        (loc.details || '').toLowerCase().includes(lowerTerm) ||
        (loc.alias || '').toLowerCase().includes(lowerTerm) ||
        (loc.locationType || '').toLowerCase().includes(lowerTerm)
    );
}

// alias holds comma-separated old/variant names ("FKI lama, Blok E lama").
// Returns the single matched nickname (trimmed) or '' when none matches.
function getMatchedAlias(loc, term) {
    if (!loc || !loc.alias || !term) return '';
    const lowerTerm = term.toLowerCase();
    const parts = String(loc.alias).split(',');
    for (const p of parts) {
        const name = p.trim();
        if (name && name.toLowerCase().includes(lowerTerm)) return name;
    }
    return '';
}

function renderSearchResults(term) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    if (!term || term.length === 0) {
        resultsContainer.classList.remove('active');
        resultsContainer.innerHTML = '';
        return;
    }

    const lowerTerm = term.toLowerCase();
    let html = '';

    // Search locations by number, place, shortForm, details, alias, locationType
    const matchingLocations = matchLocationsByTerm(term);

    // Search map text labels (lakes, fields, etc.)
    const matchingLabels = mapLabels.filter(({ text }) =>
        text.replace(/<br>/gi, ' ').toLowerCase().includes(lowerTerm)
    );

    // Render map label results
    matchingLabels.forEach((label) => {
        const displayText = label.text.replace(/<br>/gi, ' ');
        html += `
            <div class="search-result-item maplabel" data-type="maplabel" data-index="${mapLabels.indexOf(label)}">
                <div class="result-content">
                    <div class="result-title">${displayText}</div>
                    <div class="result-subtitle">Kawasan / Tapak</div>
                </div>
            </div>
        `;
    });

    // Search categories
    const allCategories = [...new Set(mapData.map(loc => loc.locationType).filter(Boolean))];
    const matchingCategories = allCategories.filter(cat =>
        cat.toLowerCase().includes(lowerTerm)
    );

    // Render location results
    matchingLocations.slice(0, 12).forEach(loc => {
        const matchedAlias = getMatchedAlias(loc, term);
        html += `
            <div class="search-result-item location" data-type="location" data-id="${loc.id}">
                <div class="result-content">
                    <div class="result-title">${loc.number}: ${loc.place}${loc.shortForm ? ' (' + loc.shortForm + ')' : ''}</div>
                    <div class="result-subtitle">${loc.locationType || ''}</div>
                    ${loc.details ? `<div class="result-detail">${loc.details}</div>` : ''}
                    ${matchedAlias ? `<div class="result-alias">Juga dikenali sebagai '${matchedAlias}'</div>` : ''}
                </div>
            </div>
        `;
    });

    // Render category results (only if not already covered by location matches)
    matchingCategories.forEach(cat => {
        const count = mapData.filter(l => l.locationType === cat).length;
        html += `
            <div class="search-result-item category" data-type="category" data-name="${cat}">
                <div class="result-content">
                    <div class="result-title">${cat}</div>
                    <div class="result-subtitle">${count} lokasi</div>
                </div>
            </div>
        `;
    });

    if (!html) {
        html = '<div class="no-results"><div>Tiada hasil ditemui</div><button type="button" class="suggest-location-btn" data-placeholder="cadang-lokasi">📍 Cadang Lokasi</button></div>';
    }

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('active');
}

function initSearchDropdown() {
    const searchBar = document.getElementById('search-bar');
    const resultsContainer = document.getElementById('search-results');

    if (!searchBar || !resultsContainer) return;

    searchBar.addEventListener('input', function (e) {
        renderSearchResults(e.target.value.trim());
        // Expand bottom sheet on mobile when typing
        if (window.innerWidth <= 768 && sheetElement && sheetState === 'peek') {
            sheetElement.style.height = '';
            setSheetState('half');
        }
    });

    resultsContainer.addEventListener('click', function (e) {
        const item = e.target.closest('.search-result-item');
        if (!item) return;

        const type = item.dataset.type;

        if (type === 'location') {
            const locationId = parseInt(item.dataset.id);
            const loc = mapData.find(l => l.id === locationId);
            if (loc) {
                if (window.innerWidth > 768) {
                    filterByLocation(loc);
                } else {
                    showLocationOnMap(loc);
                }
                showLocationInfoOverlay(loc.id);
            }
        } else if (type === 'category') {
            const catName = item.dataset.name;
            filterByCategory(catName);
        } else if (type === 'maplabel') {
            const label = mapLabels[parseInt(item.dataset.index)];
            if (label) {
                const basePadding = getMapPadding();
                const padding = window.innerWidth <= 768 ? [150, 150] : [100, 100, 100, basePadding[3] || 100];
                fitCoordsToMap([label.coords], { padding, maxZoom: 19, duration: 1200 });
                if (window.innerWidth <= 768 && sheetElement) {
                    sheetElement.style.height = '';
                    setSheetState('peek');
                }
            }
        }

        searchBar.value = '';
        renderSearchResults('');

        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) clearBtn.style.display = 'none';
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.search-container')) {
            renderSearchResults('');
        }
    });

    searchBar.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            searchBar.value = '';
            renderSearchResults('');
            searchBar.blur();
            const clearBtn = document.getElementById('clear-search');
            if (clearBtn) clearBtn.style.display = 'none';
        }
    });
}

// ===== TOGGLE ALL GROUPS =====

function toggleAllGroups() {
    const allGroups = document.querySelectorAll('.stop-group');
    const hasCollapsed = Array.from(allGroups).some(g => g.classList.contains('collapsed'));

    if (hasCollapsed) {
        allGroups.forEach(g => g.classList.remove('collapsed'));
        if (window.innerWidth <= 768 && sheetElement) {
            sheetElement.style.height = '';
            setSheetState('full');
        }
    } else {
        allGroups.forEach(g => g.classList.add('collapsed'));
    }
    updateToggleButtonLabel();
}

function updateToggleButtonLabel() {
    const allGroups = document.querySelectorAll('.stop-group');
    const toggleBtn = document.getElementById('toggle-all-groups');
    if (!toggleBtn) return;
    const hasCollapsed = Array.from(allGroups).some(g => g.classList.contains('collapsed'));
    toggleBtn.textContent = hasCollapsed ? '📋 Papar Semua Kategori' : '📋 Tutup Semua Senarai';
}

// ===== UTILITIES =====

function slugify(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function updateURL({ type = null, location = null } = {}) {
    const url = new URL(window.location.href);
    if (type) {
        url.searchParams.set('type', slugify(type));
    } else {
        url.searchParams.delete('type');
    }
    if (location) {
        url.hash = slugify(location.place);
    } else {
        url.hash = '';
    }
    history.replaceState(null, '', url.toString().replace(/#$/, ''));
}

function showToast(message) {
    const existing = document.getElementById('map-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'map-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => showToast('Pautan disalin!'));
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('Pautan disalin!');
    }
}

function handleDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const typeSlug = params.get('type');
    const locSlug = window.location.hash.slice(1);

    if (locSlug) {
        const loc = mapData.find(l => slugify(l.place) === locSlug);
        if (!loc) return;
        if (loc.coords) {
            if (window.innerWidth > 768) filterByLocation(loc);
            else showLocationOnMap(loc);
        }
        showLocationInfoOverlay(loc.id);
        // Restore category context for correct ← dismiss URL
        if (typeSlug) {
            const cat = DESIRED_ORDER.find(c => slugify(c) === typeSlug);
            if (cat) currentActiveCategory = cat;
        }
    } else if (typeSlug) {
        const cat = DESIRED_ORDER.find(c => slugify(c) === typeSlug);
        if (cat) filterByCategory(cat);
    }
}

function clearMarkers() {
    // Legacy name kept for callers: drop all pin markers.
    removePinMarkers();
    hidePinPopup();
}

// ?testroute=1 — debug helper: draws a demo foot route on load so the
// walker-dot animation can be tested without tapping through Directions.
// Survives in-map navigation like ?debug=1 (updateURL only touches ?type=/#hash).
function maybeTestRoute() {
    try {
        if (!new URLSearchParams(window.location.search).has('testroute')) return;
        const withCoords = mapData.filter(l => l.coords);
        if (withCoords.length < 2) { dlog('[route] test route: not enough coords'); return; }
        const a = withCoords[0], b = withCoords[withCoords.length - 1];
        dlog('[route] test route queued:', a.place, '→', b.place);
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            try {
                if (map && map.isStyleLoaded()) {
                    clearInterval(t);
                    drawOSRMRoute(a.coords, b.coords);
                } else if (tries > 20) {
                    clearInterval(t);
                    dlog('[route] test route: style never ready');
                }
            } catch (e) { clearInterval(t); }
        }, 500);
    } catch (e) { }
}

function createClearSearchButton() {
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) return;
    if (document.getElementById('clear-search')) return;

    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-search';
    clearBtn.className = 'clear-search-btn';
    clearBtn.style.display = 'none';
    clearBtn.setAttribute('aria-label', 'Clear search');
    clearBtn.textContent = '×';
    searchContainer.appendChild(clearBtn);
}

function initClearSearchButton() {
    const searchBar = document.getElementById('search-bar');
    const clearBtn = document.getElementById('clear-search');

    if (searchBar && clearBtn) {
        searchBar.addEventListener('input', function () {
            clearBtn.style.display = this.value.length > 0 ? 'block' : 'none';
        });

        clearBtn.addEventListener('click', function () {
            searchBar.value = '';
            renderSearchResults('');
            this.style.display = 'none';
            searchBar.focus();
        });
    }
}

// ===== DEBUG TOOLS (?debug chip, ?debugpage overlay) =====
// ?debug shows a live camera chip (replaces the old always-on zoom div).
// ?debugpage opens a full debug overlay. Both flags survive in-map navigation
// because updateURL() only touches ?type= and #hash.
const DEBUG = (() => { try { return new URLSearchParams(window.location.search).has('debug'); } catch (e) { return false; } })();
const DEBUG_PAGE = (() => { try { return new URLSearchParams(window.location.search).has('debugpage'); } catch (e) { return false; } })();
const APP_VERSION = 'html55'; // must match ?v= in index.html — shown in ?debugpage to prove fresh code

function dlog(...args) {
    if (DEBUG || DEBUG_PAGE) console.log(...args);
}

let debugChipEl = null;
let debugPageEl = null;
let debugPageTimer = null;
let debugPagePaused = false;

function debugSnapshot() {
    const snap = { version: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?'), boot: (typeof window !== 'undefined' && window.__kgbBootCount) || 1, camera: null, data: null, pins: null, state: null, prefs: null };
    try {
        if (map) {
            const c = map.getCenter();
            snap.camera = {
                zoom: +map.getZoom().toFixed(2),
                pitch: +map.getPitch().toFixed(1),
                bearing: +map.getBearing().toFixed(1),
                center: [+c.lat.toFixed(5), +c.lng.toFixed(5)],
                baseView: currentBaseView,
                show3D,
            };
        }
        const withCoords = mapData.filter(l => l.coords);
        snap.data = {
            total: mapData.length,
            withCoords: withCoords.length,
            noCoords: mapData.filter(l => !l.coords).map(l => `${l.number || '?'} ${l.place || '(blank)'}`),
        };
        let dots = 0, badges = 0, hidden = 0;
        pinMarkers.forEach(r => {
            if (r.el && r.el.style.display === 'none') { hidden++; return; }
            const slot = r.el && r.el.querySelector('.ml-badge-slot');
            if (slot && slot.querySelector('.ml-dot')) dots++;
            else badges++;
        });
        snap.pins = {
            mounted: pinMarkers.length,
            visible: pinMarkers.length - hidden,
            hidden, dots, badges,
            highlighted: highlightedPinId,
            selected: currentSelectedLocationId,
            building: selBuildingDbg,
        };
        snap.state = {
            category: currentActiveCategory,
            overlay: currentInfoOverlayLocationId,
            overlaySource: currentOverlaySource,
            sheet: (typeof sheetState !== 'undefined') ? sheetState : null,
            directions: directionsModeActive ? {
                start: directionsStart && directionsStart.label,
                end: directionsEnd && directionsEnd.label,
                mode: directionsTravelMode,
            } : false,
            gps: showUserLocation ? currentUserLocation : false,
            route: {
                active: !!routeGeoJSON,
                anim: !!routeAnimFrame,
                dashLayer: !!(map && map.getLayer && map.getLayer('osrm-route-ants')),
                dashArray: (() => { try { return map.getPaintProperty('osrm-route-ants', 'line-dasharray'); } catch (e) { return '(error)'; } })(),
                missFrames: routeDashMissFrames,
                heals: routeHealCount,
                lastHeal: routeLastHeal,
                addErr: routeLastAddError,
                verify: routeDashVerify,
                dot: routeDotMarkers.length,
                loopS: CONFIG.route.loopSeconds,
                spacingM: CONFIG.route.dotSpacingM,
                speedMps: +routeDotSpeed.toFixed(1),
                tailsM: routeTailLens,
                givenUp: routeDashGivenUp,
            },
            labels: showLabels,
            markersVisible,
        };
        snap.prefs = {};
        ['kgbMapBaseLayer', 'kgbMapShowMarkers', 'kgbMapShowLabels', 'kgbMapPitch3D'].forEach(k => {
            try { snap.prefs[k] = localStorage.getItem(k); } catch (e) { snap.prefs[k] = '(unavailable)'; }
        });
        try {
            const ring = campusBoundaryData && campusBoundaryData.geometry && campusBoundaryData.geometry.coordinates[0];
            snap.boundary = {
                points: ring ? ring.length : 0,
                source: !!(map && map.isStyleLoaded() && map.getSource('campus-boundary')),
                fillLayer: !!(map && map.getLayer && map.getLayer('campus-boundary-fill')),
                lineLayer: !!(map && map.getLayer && map.getLayer('campus-boundary-line')),
                maskDim: CONFIG.mask.dimOutside,
                maskDimLayer: !!(map && map.getLayer && map.getLayer('mask-dim')),
                maskDimSource: !!(map && map.isStyleLoaded() && map.getSource('mask-dim')),
                maskLastRun,
                maskLastError,
                maskPoll: { tries: maskPollTries, lastError: maskPollError },
                maskRestricted: CONFIG.mask.restrictPanning,
            };
        } catch (e) { snap.boundary = '(error)'; }
    } catch (e) { }
    return snap;
}

function updateDebugChip() {
    if (!debugChipEl || !map) return;
    const s = debugSnapshot();
    const c = s.camera || {};
    const ctr = c.center ? `${c.center[0]}, ${c.center[1]}` : '—';
    debugChipEl.textContent =
        `z ${c.zoom ?? '—'} · pitch ${c.pitch ?? '—'}° · brg ${c.bearing ?? '—'}° · ${ctr}` +
        ` · pins ${s.pins ? `${s.pins.visible}/${s.pins.mounted}` : '—'}`;
}

function renderDebugPage() {
    if (!debugPageEl) return;
    if (debugPagePaused) return;
    // Don't rewrite mid-selection — the 750ms refresh would destroy the
    // user's text selection before they can copy it.
    try {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && debugPageEl.contains(sel.anchorNode)) return;
    } catch (e) { }
    const s = debugSnapshot();
    const pre = debugPageEl.querySelector('#debug-page-body');
    if (pre) pre.textContent = JSON.stringify(s, null, 1);
}

function initDebugTools() {
    if (!DEBUG && !DEBUG_PAGE) return;
    if (DEBUG) {
        debugChipEl = document.createElement('div');
        debugChipEl.id = 'debug-chip';
        document.body.appendChild(debugChipEl);
        map.on('move', updateDebugChip);
        map.on('zoomend', updateDebugChip);
        updateDebugChip();
    }
    if (DEBUG_PAGE) {
        debugPageEl = document.createElement('div');
        debugPageEl.id = 'debug-page';
        debugPageEl.innerHTML = `
            <div class="debug-page-head">
                <strong>Debug (?debugpage)</strong>
                <span class="debug-page-actions">
                    <button id="debug-copy">Copy JSON</button>
                    <button id="debug-pause">⏸ Pause</button>
                    <button id="debug-prefs">Clear prefs + reload</button>
                    <button id="debug-reload">Reload data</button>
                    <button id="debug-hide">« Hide</button>
                    <button id="debug-close">× Close</button>
                </span>
            </div>
            <pre id="debug-page-body">{loading…}</pre>`;
        document.body.appendChild(debugPageEl);
        const expandBtn = document.createElement('button');
        expandBtn.id = 'debug-expand-btn';
        expandBtn.textContent = 'Debug »';
        document.body.appendChild(expandBtn);
        const collapse = () => {
            debugPageEl.classList.add('collapsed');
            expandBtn.classList.add('visible');
        };
        const expand = () => {
            debugPageEl.classList.remove('collapsed');
            expandBtn.classList.remove('visible');
            renderDebugPage();
        };
        expandBtn.addEventListener('click', expand);
        const close = () => {
            if (debugPageTimer) clearInterval(debugPageTimer);
            debugPageTimer = null;
            expandBtn.remove();
            debugPageEl.remove();
            debugPageEl = null;
        };
        debugPageEl.querySelector('#debug-hide').addEventListener('click', collapse);
        const pauseBtn = debugPageEl.querySelector('#debug-pause');
        pauseBtn.addEventListener('click', () => {
            debugPagePaused = !debugPagePaused;
            pauseBtn.textContent = debugPagePaused ? '▶ Resume' : '⏸ Pause';
            if (!debugPagePaused) renderDebugPage();
        });
        debugPageEl.querySelector('#debug-close').addEventListener('click', close);
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape' && debugPageEl && !debugPageEl.classList.contains('collapsed')) {
                collapse();
            }
        });
        debugPageEl.querySelector('#debug-copy').addEventListener('click', () => {
            copyToClipboard(JSON.stringify(debugSnapshot()));
        });
        debugPageEl.querySelector('#debug-prefs').addEventListener('click', () => {
            try {
                ['kgbMapBaseLayer', 'kgbMapShowMarkers', 'kgbMapShowLabels', 'kgbMapPitch3D']
                    .forEach(k => localStorage.removeItem(k));
            } catch (e) { }
            window.location.reload();
        });
        debugPageEl.querySelector('#debug-reload').addEventListener('click', () => window.location.reload());
        renderDebugPage();
        debugPageTimer = setInterval(renderDebugPage, 750);
    }
}

// ===== MAP INIT =====

// ===== BASE VIEW: 3D vector (default) <-> satellite =====

function setBaseView(view, persist) {
    // Migrate legacy values: 'osm' (old regular) and 'satellite' stay meaningful.
    if (view === 'osm') view = 'vector';
    if (view !== 'vector' && view !== 'satellite') view = 'vector';
    currentBaseView = view;

    if (view === 'satellite') {
        pitchBeforeSatellite = map ? map.getPitch() : pitchBeforeSatellite;
    }

    if (map) {
        const style = view === 'satellite' ? SATELLITE_STYLE : VECTOR_STYLE_URL;
        map.setStyle(style);
        // Custom sources/layers (boundary, route, 3D buildings) are re-added
        // in ensureCustomStyleLayers() on the style 'load' event.
    }

    applyLabelVisibility();
    if (persist) {
        try { localStorage.setItem('kgbMapBaseLayer', view); } catch (e) { }
    }

    const satelliteToggleCheckbox = document.getElementById('toggle-satellite-checkbox');
    if (satelliteToggleCheckbox) satelliteToggleCheckbox.checked = view === 'satellite';
}

// Re-adds everything our code owns on top of the base style. Called on every
// style 'load' (initial + each setStyle switch), since setStyle wipes sources.
function ensureCustomStyleLayers() {
    if (!map || !map.isStyleLoaded()) return;

    if (currentBaseView === 'vector') {
        addDetailLayers();
        add3DBuildingsLayer();
        map.easeTo({ pitch: show3D ? CONFIG.view.pitch3D : 0, duration: 300 });
    } else {
        map.easeTo({ pitch: 0, duration: 300 });
    }

    ensureBoundaryLayers();
    ensureRouteLayers(true);
    ensurePinLayers();
    ensureSelectedBuildingLayers();
    reapplySelectedBuildingCache();
    dlog('[style] custom layers: boundary/route/pins done → mask');
    ensureMaskLayers();
    applyPanRestriction();
    applyLabelVisibility();
}

// Detail overlays: footpaths, sports grounds, parking aisles. The bright
// base style draws paths faint (#cba) and has no pitch/parking layers, so
// campus footpaths and courts vanish. These re-assert them from the same
// openmaptiles planet source (no extra requests). Called before buildings
// so extrusions stay on top, and before the mask so outside dim covers them.
function detailSource() {
    try {
        if (map.getSource('openmaptiles')) return 'openmaptiles';
        if (map.getSource('openfreemap')) return 'openfreemap';
    } catch (e) { }
    return null;
}

function addDetailLayers() {
    try {
        const src = detailSource();
        if (!src) return;
        // One-time cleanup: drop the removed pink parking overlay from live sessions.
        try { if (map.getLayer('detail-parking')) map.removeLayer('detail-parking'); } catch (e) { }
        const style = map.getStyle();
        const layers = (style && style.layers) || [];
        let beforeId = null;
        for (let i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) { beforeId = layers[i].id; break; }
        }
        const before = (map.getLayer('3d-buildings') && '3d-buildings') || beforeId || undefined;
        if (CONFIG.detail.sports) {
            if (!map.getLayer('detail-sport-fill')) {
                map.addLayer({
                    id: 'detail-sport-fill',
                    type: 'fill',
                    source: src,
                    'source-layer': 'landuse',
                    minzoom: 14,
                    filter: ['match', ['get', 'class'], ['pitch', 'stadium', 'playground'], true, false],
                    paint: { 'fill-color': CONFIG.detail.sportColor, 'fill-opacity': CONFIG.detail.sportOpacity },
                }, before);
            }
            if (!map.getLayer('detail-sport-line')) {
                map.addLayer({
                    id: 'detail-sport-line',
                    type: 'line',
                    source: src,
                    'source-layer': 'landuse',
                    minzoom: 14,
                    filter: ['match', ['get', 'class'], ['pitch', 'stadium', 'playground'], true, false],
                    paint: { 'line-color': CONFIG.detail.sportLine, 'line-width': 1.5, 'line-opacity': CONFIG.detail.sportLineOpacity },
                }, before);
            }
            if (!map.getLayer('detail-track-fill')) {
                map.addLayer({
                    id: 'detail-track-fill',
                    type: 'fill',
                    source: src,
                    'source-layer': 'landuse',
                    minzoom: 14,
                    filter: ['==', ['get', 'class'], 'track'],
                    paint: { 'fill-color': CONFIG.detail.trackColor, 'fill-opacity': CONFIG.detail.trackOpacity },
                }, before);
            }
        }
        if (CONFIG.detail.footpaths) {
            if (!map.getLayer('detail-path')) {
                map.addLayer({
                    id: 'detail-path',
                    type: 'line',
                    source: src,
                    'source-layer': 'transportation',
                    minzoom: 14,
                    filter: ['all',
                        ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
                        ['==', ['get', 'class'], 'path']],
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                    paint: {
                        'line-color': CONFIG.detail.pathColor,
                        'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 15, 1.5, 20, 5],
                        'line-dasharray': [2, 1.5],
                        'line-opacity': CONFIG.detail.pathOpacity,
                    },
                }, before);
            }
        }
    } catch (err) {
        console.warn('detail layers failed:', err);
    }
}

function add3DBuildingsLayer() {
    try {
        if (map.getLayer('3d-buildings')) return;
        const style = map.getStyle();
        const layers = (style && style.layers) || [];
        let labelLayerId = null;
        for (let i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout && layers[i].layout['text-field']) {
                labelLayerId = layers[i].id;
                break;
            }
        }
        if (!map.getSource('openfreemap')) {
            map.addSource('openfreemap', { url: 'https://tiles.openfreemap.org/planet', type: 'vector' });
        }
        map.addLayer(
            {
                id: '3d-buildings',
                source: 'openfreemap',
                'source-layer': 'building',
                type: 'fill-extrusion',
                minzoom: 15,
                filter: buildingFilter(),
                paint: {
                    'fill-extrusion-color': [
                        'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8],
                        0, '#d9d9d9', 200, '#b0b8c8', 400, '#9fb2d8',
                    ],
                    'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, ['coalesce', ['get', 'render_height'], 8]],
                    'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, ['coalesce', ['get', 'render_min_height'], 0]],
                    'fill-extrusion-opacity': 0.9,
                },
            },
            labelLayerId || undefined
        );
    } catch (err) {
        console.warn('3D buildings layer failed:', err);
    }
}

function applyLabelVisibility() {
    if (!map || !map.isStyleLoaded()) return;
    try {
        if (currentBaseView === 'vector') {
            // Toggle vector place/road labels (symbol layers), not our HTML markers.
            const style = map.getStyle();
            (style.layers || []).forEach(l => {
                if (l.type === 'symbol') {
                    map.setLayoutProperty(l.id, 'visibility', showLabels ? 'visible' : 'none');
                }
            });
        } else {
            // Satellite: toggle the Carto label raster overlay.
            if (map.getLayer('sat-labels')) {
                map.setLayoutProperty('sat-labels', 'visibility', showLabels ? 'visible' : 'none');
            }
        }
    } catch (err) {
        console.warn('applyLabelVisibility failed:', err);
    }
}

function setPitch3D(on, persist) {
    show3D = !!on;
    if (persist) {
        try { localStorage.setItem('kgbMapPitch3D', show3D ? '1' : '0'); } catch (e) { }
    }
    const box = document.getElementById('toggle-3d-checkbox');
    if (box) box.checked = show3D;
    if (map && currentBaseView === 'vector') {
        map.easeTo({ pitch: show3D ? CONFIG.view.pitch3D : 0, duration: 500 });
    }
}

function setMarkersVisible(visible, persist) {
    markersVisible = !!visible;
    applyPinVisibility();
    if (persist) {
        try { localStorage.setItem('kgbMapShowMarkers', markersVisible); } catch (e) { }
    }
}

// ===== GPS POSITIONING (EXPERIMENT) =====
function setUserLocationVisible(visible) {
    showUserLocation = visible;
    if (visible) {
        if (!navigator.geolocation) return;
        userLocationWatchId = navigator.geolocation.watchPosition(
            (pos) => updateUserLocationMarker(pos.coords),
            (err) => {
                console.warn('Geolocation error:', err);
                showUserLocation = false;
                document.getElementById('my-location-btn')?.classList.remove('active');
            },
            { enableHighAccuracy: true }
        );
    } else {
        if (userLocationWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(userLocationWatchId);
        userLocationWatchId = null;
        if (userLocationMarker) { try { userLocationMarker.remove(); } catch (e) { } userLocationMarker = null; }
        removeAccuracyCircle();
        currentUserLocation = null;
        // Directions endpoints are coordinate snapshots, not live references —
        // an active two-point route stays valid regardless of watch state.
        if (!directionsModeActive) clearRoute();
        updatePanRestrictionForState();
    }
}

// Accuracy circle is a GeoJSON fill polygon (meters-accurate at any zoom).
function accuracyCircleGeoJSON(lat, lng, radiusMeters) {
    const points = 64;
    const coords = [];
    const latR = radiusMeters / 111320;
    const lngR = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
    for (let i = 0; i <= points; i++) {
        const a = (i / points) * Math.PI * 2;
        coords.push([lng + lngR * Math.cos(a), lat + latR * Math.sin(a)]);
    }
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
}

function ensureAccuracyCircleLayers() {
    if (!map || !map.isStyleLoaded()) return false;
    try {
        if (!map.getSource('user-accuracy')) {
            map.addSource('user-accuracy', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addLayer({ id: 'user-accuracy-fill', type: 'fill', source: 'user-accuracy', paint: { 'fill-color': '#1967d2', 'fill-opacity': 0.15 } });
            map.addLayer({ id: 'user-accuracy-line', type: 'line', source: 'user-accuracy', paint: { 'line-color': '#1967d2', 'line-width': 1, 'line-opacity': 0.5 } });
        }
        return true;
    } catch (e) { return false; }
}

function removeAccuracyCircle() {
    try {
        if (map && map.getSource('user-accuracy')) {
            map.getSource('user-accuracy').setData({ type: 'FeatureCollection', features: [] });
        }
    } catch (e) { }
    userLocationAccuracyCircle = null;
}

function updateUserLocationMarker(coords) {
    if (!map) return;
    currentUserLocation = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
    const lngLat = [coords.longitude, coords.latitude];
    const isFirstFix = !userLocationMarker;
    if (!userLocationMarker) {
        const el = document.createElement('div');
        el.className = 'user-location-dot';
        userLocationMarker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map);
    } else {
        userLocationMarker.setLngLat(lngLat);
    }
    if (ensureAccuracyCircleLayers()) {
        try {
            map.getSource('user-accuracy').setData({
                type: 'FeatureCollection',
                features: [accuracyCircleGeoJSON(coords.latitude, coords.longitude, coords.accuracy || 20)],
            });
        } catch (e) { }
    }
    // Focus the map on the very first fix after enabling GPS (mirrors clicking a
    // location in the list) — not on every subsequent watchPosition update, since
    // that would yank the camera around as the user moves.
    updatePanRestrictionForState();
    if (isFirstFix) focusMapOnUserLocation([coords.latitude, coords.longitude]);
}

// Same camera-focus behavior used when selecting a location from the list/search,
// just applied to the user's GPS position instead of a campus location.
function focusMapOnUserLocation(coords) {
    if (window.innerWidth <= 768) {
        flyToMarker(coords);
        if (sheetElement) {
            sheetElement.style.height = '';
            setSheetState('peek');
        }
    } else {
        const basePadding = getMapPadding();
        const padding = [100, 100, 100, basePadding[3] || 100];
        fitCoordsToMap([coords], { padding, maxZoom: 19, duration: 1200 });
    }
}

// My-location button sits above MapLibre's nav control via CSS alone
// (fixed bottom offset) — no JS measuring needed.
function positionMyLocationButtonDesktop() {
    return;
}

function initMyLocationButton() {
    const btn = document.getElementById('my-location-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const next = !showUserLocation;
        setUserLocationVisible(next);
        btn.classList.toggle('active', next);
    });
}

// Mobile: float both buttons above the bottom sheet, tracking its live height, capped at 50vh.
// Driven two ways: (1) called directly, synchronously, from the sheet's own drag handlers
// (handleTouchMove/handleContentTouchMove/handleHeaderTouchMove) so the buttons move in the
// exact same frame as the sheet during a fast drag — a ResizeObserver alone fires ~1 frame
// later, which reads as elastic/rubber-band lag and lets the buttons briefly overlap the
// sheet's top edge; (2) a ResizeObserver as a fallback for the CSS-transitioned height
// changes (setSheetState snaps, programmatic opens) that don't go through those handlers.
let floatingButtonsMobileInitialized = false;
function updateFloatingButtonsPosition() {
    if (!sheetElement) return;
    const myLocationBtn = document.getElementById('my-location-btn');
    const directionsBtn = document.getElementById('directions-fab-btn');
    if (!myLocationBtn && !directionsBtn) return;

    const cap = window.innerHeight * 0.5;
    const rawHeight = sheetElement.getBoundingClientRect().height;
    const sheetHeight = Math.min(rawHeight, cap);
    const baseBottom = sheetHeight + 12;
    // Once the sheet grows past the 50vh cap, the buttons' frozen position
    // falls inside the sheet's vertical range — drop them behind the sheet
    // (instead of floating on top of its content) so it visually covers them.
    const pastCap = rawHeight > cap;
    [myLocationBtn, directionsBtn].forEach(btn => {
        if (!btn) return;
        btn.classList.toggle('floating-btn-behind-sheet', pastCap);
    });
    if (myLocationBtn) myLocationBtn.style.bottom = `${baseBottom}px`;
    if (directionsBtn) directionsBtn.style.bottom = `${baseBottom + 44 + 10}px`;
}

function initFloatingButtonsMobile() {
    if (window.innerWidth > 768 || !sheetElement || floatingButtonsMobileInitialized) return;
    floatingButtonsMobileInitialized = true;
    new ResizeObserver(updateFloatingButtonsPosition).observe(sheetElement);
    updateFloatingButtonsPosition();
}

// ===== FOOT ROUTING (jalan kaki) =====
// FOSSGIS public OSRM with foot profile — no key, works from static hosting.
// Campus footpaths come from OSM; where OSM has no footway the route snaps to roads.
function ensureRouteLayers(restoreData) {
    if (!map || !map.isStyleLoaded()) return false;
    try {
        // One-time cleanup: legacy dash id from before the rebuild. If it
        // ever exists it is removed in favor of ROUTE_DASH_ID.
        try { if (map.getLayer('osrm-route-dash')) map.removeLayer('osrm-route-dash'); } catch (e) { }
        // Per-layer idempotency (same lesson as mask-dim): the source existing
        // must never imply the layers exist — a stranded source without all
        // three layers once left the route blue with no marching dots and no
        // self-heal. Guard each component on itself.
        if (!map.getSource('osrm-route')) {
            map.addSource('osrm-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        }
        if (!map.getLayer('osrm-route-glow')) {
            map.addLayer({ id: 'osrm-route-glow', type: 'line', source: 'osrm-route', paint: { 'line-color': '#1967d2', 'line-width': 10, 'line-opacity': 0.35 } });
        }
        if (!map.getLayer('osrm-route-base')) {
            map.addLayer({ id: 'osrm-route-base', type: 'line', source: 'osrm-route', paint: { 'line-color': '#1967d2', 'line-width': 5, 'line-opacity': 0.9 } });
        }
        if (!map.getLayer('osrm-route-ants')) {
            try {
                map.addLayer({ id: 'osrm-route-ants', type: 'line', source: 'osrm-route', paint: { 'line-color': '#ffffff', 'line-width': 2.5, 'line-opacity': 0.9, 'line-dasharray': [2, 2], 'line-cap': 'round' } });
            } catch (e) {
                routeLastAddError = String((e && e.message) || e);
                throw e;
            }
            routeDashVerify = !!map.getLayer('osrm-route-ants');
            routeLastAddError = routeDashVerify ? null : (routeLastAddError || '(silent no-op: addLayer did not throw but layer is absent on immediate re-read)');
            dlog('[route] healed missing layer(s), verify:', routeDashVerify, routeLastAddError);
        }
        if (restoreData && routeGeoJSON) {
            map.getSource('osrm-route').setData(routeGeoJSON);
        }
        return true;
    } catch (e) { return false; }
}

// Full teardown + rebuild for the route layers. Per-layer patching proved
// insufficient: on-device, addLayer for the dash id silently no-ops (no
// throw, absent on immediate re-read). A clean registry + fresh layer id
// sidesteps whatever wedged state causes that.
function rebuildRouteLayers() {
    if (!map || !map.isStyleLoaded()) return false;
    try {
        [ROUTE_DASH_ID, 'osrm-route-dash', 'osrm-route-glow', 'osrm-route-base'].forEach(id => {
            try { if (map.getLayer(id)) map.removeLayer(id); } catch (e) { }
        });
        try { if (map.getSource('osrm-route')) map.removeSource('osrm-route'); } catch (e) { }
    } catch (e) { }
    dlog('[route] registry rebuilt, recreating layers…');
    return ensureRouteLayers(true);
}

// Lead-in/out legs, Google-style: the router snaps to the road network, so
// when the requested point is off-road the tail is drawn as a curved dotted
// path from the snap point to the exact pin. Curve = sampled quadratic
// bezier (control at midpoint + perpendicular bow, capped at 80m). Dots =
// the existing walker markers flowing over the tail path — no canvas dash
// layer involved, since those will not instantiate on-device. The solid blue
// line itself ends at the snap points; gaps under 5m are snapping noise.
let routeTailLens = [0, 0]; // [leadInM, leadOutM] for debug

function routePointDistM(a, b) {
    const lat0 = ((a[1] + b[1]) / 2) * Math.PI / 180;
    const dx = (a[0] - b[0]) * 111320 * Math.cos(lat0);
    const dy = (a[1] - b[1]) * 111320;
    return Math.hypot(dx, dy);
}

function curvedLeg(a, b) {
    // a → b as [lng,lat] pairs; returns sampled curve incl. endpoints.
    const lat0 = ((a[1] + b[1]) / 2) * Math.PI / 180;
    const kx = 111320 * Math.cos(lat0), ky = 111320;
    const dx = (b[0] - a[0]) * kx, dy = (b[1] - a[1]) * ky;
    const len = Math.hypot(dx, dy);
    if (len < 5) return [a, b];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const bow = Math.min(len * 0.25, 80);
    const cx = mx + (-dy / len) * bow / kx;
    const cy = my + (dx / len) * bow / ky;
    const N = 16, pts = [];
    for (let i = 0; i <= N; i++) {
        const t = i / N, u = 1 - t;
        pts.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]);
    }
    return pts;
}

function buildRoutePath(geom, fromLL, toLL) {
    // Returns { main, path }: main = router geometry for the blue line;
    // path = lead-in curve + main + lead-out curve for bounds + walker dots.
    const fallback = { main: geom, path: geom && geom.type === 'LineString' ? geom.coordinates : (geom && geom.type === 'MultiLineString' ? geom.coordinates.flat() : []) };
    try {
        if (!geom || geom.type !== 'LineString' || !geom.coordinates || geom.coordinates.length < 2) return fallback;
        if (!fromLL || !toLL) return fallback;
        const from = [fromLL[1], fromLL[0]], to = [toLL[1], toLL[0]]; // [lat,lng] → [lng,lat]
        const line = geom.coordinates;
        let path = line.slice();
        let headLen = 0, tailLen = 0;
        if (routePointDistM(line[0], from) > 5) {
            const head = curvedLeg(from, line[0]);
            headLen = curveLenM(head);
            path = head.concat(path.slice(1));
        }
        if (routePointDistM(line[line.length - 1], to) > 5) {
            const tail = curvedLeg(line[line.length - 1], to);
            tailLen = curveLenM(tail);
            path = path.concat(tail.slice(1));
        }
        routeTailLens = [Math.round(headLen), Math.round(tailLen)];
        if (headLen || tailLen) dlog('[route] tails:', routeTailLens[0] + 'm +', routeTailLens[1] + 'm');
        return { main: geom, path };
    } catch (e) { return fallback; }
}

function curveLenM(pts) {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) acc += routePointDistM(pts[i - 1], pts[i]);
    return acc;
}

async function drawOSRMRoute(fromCoords, toCoords) {
    if (!fromCoords || !toCoords) return null;
    clearRoute();
    const isDrive = directionsTravelMode === 'drive';
    const profile = isDrive ? 'routed-car/route/v1/driving' : 'routed-foot/route/v1/foot';
    const url = `https://routing.openstreetmap.de/${profile}/${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}?overview=full&geometries=geojson`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.routes || !data.routes.length) return null;
        const route = data.routes[0];
        const built = buildRoutePath(route.geometry, fromCoords, toCoords);
        routeGeoJSON = built.main;

        if (ensureRouteLayers(false)) {
            map.getSource('osrm-route').setData(routeGeoJSON);
            const bounds = new maplibregl.LngLatBounds();
            built.path.forEach(c => bounds.extend(c));
            map.fitBounds(bounds, { padding: 60, duration: 1000 });
            startRouteAnimation();
            buildRouteDot(built.path);
        }

        return { distance: route.distance, duration: route.duration, mode: isDrive ? 'drive' : 'walk' };
    } catch (err) {
        console.warn('Route fetch failed:', err);
        return null;
    }
}

// Marching-ants crawl on the white dash overlay. MapLibre has no dash-offset,
// so the phase is faked by rewriting line-dasharray each frame: shifting the
// pattern by s over one full period (dash+gap) reads as forward motion and
// wraps seamlessly. rAF pauses in background tabs; loop dies with the route.
let routeAnimFrame = null;
let routeAnimPhase = 0;
let routeAnimLast = 0;
let routeDashMissFrames = 0; // consecutive ticks without the dash layer (debug)
let routeHealCount = 0;      // self-heal recreations this session (debug)
let routeLastHeal = null;    // ISO time of last heal (debug)
let routeLastAddError = null; // error (or silent-no-op note) from last dash addLayer (debug)
let routeDashVerify = null;   // immediate re-read after last dash addLayer (debug)
const ROUTE_DASH = 2, ROUTE_GAP = 2, ROUTE_PERIOD = ROUTE_DASH + ROUTE_GAP, ROUTE_SPEED = 5;
const ROUTE_DASH_ID = 'osrm-route-ants'; // fresh id after the old dash id silently refused creation on-device

// Moving-dot fallback: HTML markers provably render on-device, so the route
// animation rides markers when the dash layer will not exist.
let routeDotMarkers = []; // [{marker, off}]
let routeDotPts = null;   // [[lng,lat,cumMeters],...]
let routeDotTotal = 0;
let routeDotPhase = 0;
let routeDotSpeed = 0; // m/s actually used (loop speed capped — debug)
let routeDashGivenUp = false; // heal cap reached; dots carry the animation
// Speed/spacing/max come from CONFIG.route (config.json) — validated numbers.

function routeLineCoords() {
    if (!routeGeoJSON) return null;
    const g = routeGeoJSON;
    if (g.type === 'LineString') return g.coordinates;
    if (g.type === 'MultiLineString') return g.coordinates.flat();
    return null;
}

function buildRouteDot(pathCoords) {
    clearRouteDot();
    try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e) { }
    const coords = (pathCoords && pathCoords.length >= 2) ? pathCoords : routeLineCoords();
    if (!coords || coords.length < 2 || !map || typeof maplibregl === 'undefined') return;
    // Equirectangular meters — fine at campus scale.
    const lat0 = coords[0][1] * Math.PI / 180;
    const kx = 111320 * Math.cos(lat0), ky = 111320;
    let acc = 0;
    routeDotPts = [[coords[0][0], coords[0][1], 0]];
    for (let i = 1; i < coords.length; i++) {
        const dx = (coords[i][0] - coords[i - 1][0]) * kx;
        const dy = (coords[i][1] - coords[i - 1][1]) * ky;
        acc += Math.hypot(dx, dy);
        routeDotPts.push([coords[i][0], coords[i][1], acc]);
    }
    if (acc <= 0) { routeDotPts = null; return; }
    routeDotTotal = acc;
    routeDotPhase = 0;
    // Fixed loop time means speed scales with distance (far GPS = teleport).
    // Cap the speed so long routes drift at a constant max instead.
    routeDotSpeed = Math.min(acc / CONFIG.route.loopSeconds, CONFIG.route.dotMaxSpeedMps);
    const everyM = CONFIG.route.dotSpacingM, maxN = CONFIG.route.dotMax;
    const n = Math.max(3, Math.min(maxN, Math.max(1, Math.round(acc / everyM))));
    for (let i = 0; i < n; i++) {
        const el = document.createElement('div');
        el.className = 'route-walker-dot';
        let m = null;
        try { m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([coords[0][0], coords[0][1]]).addTo(map); } catch (e) { }
        if (m) routeDotMarkers.push({ marker: m, off: (i / n) * acc });
    }
    dlog('[route] walker dots built:', routeDotMarkers.length, 'length m:', Math.round(acc));
}

function clearRouteDot() {
    routeDotMarkers.forEach(d => { try { d.marker.remove(); } catch (e) { } });
    routeDotMarkers = [];
    routeDotPts = null; routeDotTotal = 0; routeDotPhase = 0;
}

function stepRouteDot(dt) {
    if (!routeDotMarkers.length || !routeDotPts || routeDotTotal <= 0 || routeDotSpeed <= 0) return;
    routeDotPhase = (routeDotPhase + dt * routeDotSpeed) % routeDotTotal;
    const pts = routeDotPts;
    for (const d of routeDotMarkers) {
        const dist = (routeDotPhase + d.off) % routeDotTotal;
        let lo = 0, hi = pts.length - 1;
        while (lo < hi - 1) { const m = (lo + hi) >> 1; if (pts[m][2] <= dist) lo = m; else hi = m; }
        const a = pts[lo], b = pts[hi], span = (b[2] - a[2]) || 1;
        const t = (dist - a[2]) / span;
        try { d.marker.setLngLat([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } catch (e) { }
    }
}

function routeDashArray(s) {
    s = ((s % ROUTE_PERIOD) + ROUTE_PERIOD) % ROUTE_PERIOD;
    if (s <= ROUTE_DASH) return [ROUTE_DASH - s, ROUTE_GAP, Math.max(s, 0.001)];
    const off = s - ROUTE_DASH;
    return [0.001, off, ROUTE_DASH, Math.max(ROUTE_GAP - off, 0.001)];
}

function startRouteAnimation() {
    stopRouteAnimation();
    if (typeof requestAnimationFrame !== 'function') return;
    try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e) { }
    routeAnimLast = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    dlog('[route] animation started');
    const tick = (now) => {
        if (!routeGeoJSON) { routeAnimFrame = null; return; }
        const t = now || routeAnimLast;
        const dt = Math.min(0.1, Math.max(0, (t - routeAnimLast) / 1000));
        routeAnimLast = t;
        routeAnimPhase = (routeAnimPhase + dt * ROUTE_SPEED) % ROUTE_PERIOD;
        try {
            if (map && map.getLayer && map.getLayer('osrm-route-ants')) {
                if (routeDashMissFrames > 0) dlog('[route] dash layer back after', routeDashMissFrames, 'frames');
                routeDashMissFrames = 0;
                map.setPaintProperty('osrm-route-ants', 'line-dasharray', routeDashArray(routeAnimPhase));
            } else if (map) {
                // Self-heal: the dash layer can go missing after creation
                // (observed live: blue route present, dash gone, loop
                // running, addLayer silently no-ops). Rebuild a few times,
                // then give up — the walker dot carries the animation.
                routeDashMissFrames++;
                if (routeDashMissFrames === 1 || routeDashMissFrames % 120 === 0) {
                    if (routeHealCount < 5) {
                        dlog('[route] dash layer missing, rebuilding…');
                        if (rebuildRouteLayers()) {
                            routeHealCount++;
                            routeLastHeal = new Date().toISOString();
                        }
                    } else if (!routeDashGivenUp) {
                        routeDashGivenUp = true;
                        dlog('[route] dash heal cap reached, walker dot carries the animation');
                    }
                }
            }
        } catch (e) { }
        stepRouteDot(dt);
        routeAnimFrame = requestAnimationFrame(tick);
    };
    routeAnimFrame = requestAnimationFrame(tick);
}

function stopRouteAnimation() {
    if (routeAnimFrame && typeof cancelAnimationFrame === 'function') {
        try { cancelAnimationFrame(routeAnimFrame); } catch (e) { }
    }
    routeAnimFrame = null;
    routeAnimPhase = 0;
    dlog('[route] animation stopped');
}

function clearRoute() {
    stopRouteAnimation();
    clearRouteDot();
    routeGeoJSON = null;
    try {
        if (map && map.getSource('osrm-route')) {
            map.getSource('osrm-route').setData({ type: 'FeatureCollection', features: [] });
        }
    } catch (e) { }
    currentRouteLine = null;
}

// ===== DIRECTIONS PANEL (TWO-POINT ROUTING) =====

function setTravelMode(mode) {
    if (mode !== 'walk' && mode !== 'drive') return;
    directionsTravelMode = mode;
    try { localStorage.setItem('kgbMapTravelMode', mode); } catch (e) { }
    updateTravelModeButtons();
    dlog('[route] travel mode:', mode);
    maybeComputeRoute();
}

function updateTravelModeButtons() {
    document.querySelectorAll('.directions-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === directionsTravelMode);
    });
}

function renderDirectionsPin(field, point) {
    if (!map || !point.coords) return;
    const isStart = field === 'start';
    const existing = isStart ? directionsStartMarker : directionsEndMarker;
    if (existing) { try { existing.remove(); } catch (e) { } }

    const el = document.createElement('div');
    el.className = 'ml-directions-pin-wrap';
    el.innerHTML = `<span class="material-symbols-outlined directions-pin directions-pin-${field}">location_on</span>`;

    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([point.coords[1], point.coords[0]])
        .addTo(map);

    if (isStart) directionsStartMarker = marker;
    else directionsEndMarker = marker;
}

function clearDirectionsPins() {
    if (directionsStartMarker) { try { directionsStartMarker.remove(); } catch (e) { } directionsStartMarker = null; }
    if (directionsEndMarker) { try { directionsEndMarker.remove(); } catch (e) { } directionsEndMarker = null; }
}

function updateDirectionsRouteInfo(result) {
    const infoEl = document.getElementById('directions-route-info');
    if (!infoEl) return;
    if (result === 'loading') {
        infoEl.textContent = 'Mengira jarak...';
    } else if (result === null) {
        infoEl.textContent = '';
    } else {
        infoEl.textContent = `${(result.distance / 1000).toFixed(1)} km · ${Math.round(result.duration / 60)} minit (${result.mode === 'drive' ? 'memandu' : 'jalan kaki'})`;
    }
}

async function maybeComputeRoute() {
    if (!directionsStart || !directionsEnd || !directionsStart.coords || !directionsEnd.coords) {
        clearRoute();
        updateDirectionsRouteInfo(null);
        return;
    }
    updateDirectionsRouteInfo('loading');
    const result = await drawOSRMRoute(directionsStart.coords, directionsEnd.coords);
    if (!result) {
        const infoEl = document.getElementById('directions-route-info');
        if (infoEl) infoEl.textContent = 'Gagal mengira laluan.';
        return;
    }
    updateDirectionsRouteInfo(result);
}

function setDirectionsField(field, value) {
    if (field === 'start') directionsStart = value;
    else directionsEnd = value;

    const input = document.getElementById(field === 'start' ? 'directions-start-input' : 'directions-end-input');
    if (input) input.value = value ? value.label : '';

    if (value && value.coords) {
        renderDirectionsPin(field, value);
    } else {
        const existing = field === 'start' ? directionsStartMarker : directionsEndMarker;
        if (existing) { try { existing.remove(); } catch (e) { } }
        if (field === 'start') directionsStartMarker = null;
        else directionsEndMarker = null;
    }

    updatePanRestrictionForState();
    maybeComputeRoute();
}

function swapDirectionsFields() {
    const newStart = directionsEnd;
    const newEnd = directionsStart;
    setDirectionsField('start', newStart);
    setDirectionsField('end', newEnd);
}

async function resolveGpsPoint(field) {
    const input = document.getElementById(field === 'start' ? 'directions-start-input' : 'directions-end-input');

    if (currentUserLocation) {
        setDirectionsField(field, {
            type: 'gps',
            coords: [currentUserLocation.lat, currentUserLocation.lng],
            label: 'Lokasi Saya (GPS)',
        });
        return;
    }

    if (!navigator.geolocation) return;
    if (input) input.value = 'Mencari lokasi...';

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            setDirectionsField(field, {
                type: 'gps',
                coords: [pos.coords.latitude, pos.coords.longitude],
                label: 'Lokasi Saya (GPS)',
            });
        },
        (err) => {
            console.warn('Geolocation error:', err);
            if (input) input.value = '';
            setDirectionsField(field, null);
            showToast('Gagal mengesan lokasi anda.');
        },
        { enableHighAccuracy: true }
    );
}

function renderDirectionsResults(term, field) {
    const dropdown = document.getElementById('directions-dropdown');
    if (!dropdown) return;

    // An endpoint already used by the other field can't be picked again — hide
    // it from this field's dropdown (covers GPS, a specific location, or a map label).
    const otherField = field === 'start' ? directionsEnd : directionsStart;

    let html = (otherField && otherField.type === 'gps') ? '' : `
        <div class="search-result-item gps" data-type="gps">
            <div class="result-content">
                <div class="result-title">Lokasi Saya (GPS)</div>
            </div>
        </div>
    `;

    if (term && term.length > 0) {
        const matchingLocations = matchLocationsByTerm(term).filter(loc => loc.coords);
        matchingLocations.slice(0, 12).forEach(loc => {
            if (otherField && otherField.type === 'location' && otherField.id === loc.id) return;
            const matchedAlias = getMatchedAlias(loc, term);
            html += `
                <div class="search-result-item location" data-type="location" data-id="${loc.id}">
                    <div class="result-content">
                        <div class="result-title">${loc.number}: ${loc.place}${loc.shortForm ? ' (' + loc.shortForm + ')' : ''}</div>
                        <div class="result-subtitle">${loc.locationType || ''}</div>
                        ${matchedAlias ? `<div class="result-alias">Juga dikenali sebagai '${matchedAlias}'</div>` : ''}
                    </div>
                </div>
            `;
        });

        const lowerTerm = term.toLowerCase();
        const matchingLabels = mapLabels.filter(({ text }) =>
            text.replace(/<br>/gi, ' ').toLowerCase().includes(lowerTerm)
        );
        matchingLabels.forEach((label) => {
            const labelIndex = mapLabels.indexOf(label);
            if (otherField && otherField.type === 'maplabel' && otherField.coords === label.coords) return;
            const displayText = label.text.replace(/<br>/gi, ' ');
            html += `
                <div class="search-result-item maplabel" data-type="maplabel" data-index="${labelIndex}">
                    <div class="result-content">
                        <div class="result-title">${displayText}</div>
                        <div class="result-subtitle">Kawasan / Tapak</div>
                    </div>
                </div>
            `;
        });
    }

    dropdown.innerHTML = html;
    dropdown.classList.add('active');
}

function openDirectionsPanel({ start, end } = {}) {
    directionsModeActive = true;
    document.getElementById('directions-container')?.classList.add('active');
    document.querySelector('.search-container')?.classList.add('directions-hidden');
    document.getElementById('directions-toggle-btn')?.classList.add('active');
    renderSearchResults('');

    setDirectionsField('start', null);
    setDirectionsField('end', null);
    updateTravelModeButtons();

    if (start) {
        if (start.type === 'gps' && !start.coords) {
            resolveGpsPoint('start');
        } else {
            setDirectionsField('start', start);
        }
    }
    if (end) setDirectionsField('end', end);
}

function closeDirectionsPanel() {
    directionsModeActive = false;
    document.getElementById('directions-container')?.classList.remove('active');
    document.querySelector('.search-container')?.classList.remove('directions-hidden');
    document.getElementById('directions-toggle-btn')?.classList.remove('active');

    clearRoute();
    clearDirectionsPins();
    directionsStart = null;
    directionsEnd = null;
    directionsActiveField = null;
    updateDirectionsRouteInfo(null);

    const startInput = document.getElementById('directions-start-input');
    const endInput = document.getElementById('directions-end-input');
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';

    const dropdown = document.getElementById('directions-dropdown');
    if (dropdown) { dropdown.classList.remove('active'); dropdown.innerHTML = ''; }
    updatePanRestrictionForState();
}

function toggleDirectionsPanel() {
    if (directionsModeActive) closeDirectionsPanel();
    else openDirectionsPanel();
}

function initDirectionsPanel() {
    const toggleBtn = document.getElementById('directions-toggle-btn');
    const fabBtn = document.getElementById('directions-fab-btn');
    const closeBtn = document.getElementById('directions-close-btn');
    const swapBtn = document.getElementById('directions-swap-btn');
    const startInput = document.getElementById('directions-start-input');
    const endInput = document.getElementById('directions-end-input');
    const dropdown = document.getElementById('directions-dropdown');

    if (!toggleBtn || !startInput || !endInput || !dropdown) return;

    toggleBtn.addEventListener('click', toggleDirectionsPanel);
    fabBtn?.addEventListener('click', toggleDirectionsPanel);

    closeBtn.addEventListener('click', closeDirectionsPanel);

    swapBtn.addEventListener('click', swapDirectionsFields);

    document.querySelectorAll('.directions-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setTravelMode(btn.dataset.mode));
    });
    updateTravelModeButtons();

    [['start', startInput], ['end', endInput]].forEach(([field, input]) => {
        input.addEventListener('focus', () => {
            directionsActiveField = field;
            renderDirectionsResults(input.value.trim(), field);
        });
        input.addEventListener('input', () => {
            renderDirectionsResults(input.value.trim(), field);
        });
    });

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (!item) return;
        const field = directionsActiveField;
        const type = item.dataset.type;

        if (type === 'gps') {
            resolveGpsPoint(field);
        } else if (type === 'location') {
            const loc = mapData.find(l => l.id === parseInt(item.dataset.id));
            if (loc) setDirectionsField(field, { type: 'location', id: loc.id, coords: loc.coords, label: loc.place });
        } else if (type === 'maplabel') {
            const label = mapLabels[parseInt(item.dataset.index)];
            if (label) setDirectionsField(field, { type: 'maplabel', coords: label.coords, label: label.text.replace(/<br>/gi, ' ') });
        }

        dropdown.classList.remove('active');
        dropdown.innerHTML = '';
    });

    document.querySelectorAll('.directions-field-clear').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.field;
            setDirectionsField(field, null);
            document.getElementById(field === 'start' ? 'directions-start-input' : 'directions-end-input')?.focus();
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.directions-container')) {
            dropdown.classList.remove('active');
        }
    });
}

function initMap() {
    const isMobileInit = window.innerWidth <= 768;
    const savedView = (() => {
        try { return localStorage.getItem('kgbMapBaseLayer'); } catch (e) { return null; }
    })();
    // Default = config base (usually 3D vector). Saved localStorage wins;
    // legacy 'osm' maps to vector.
    currentBaseView = savedView === 'satellite' ? 'satellite'
        : savedView === 'vector' ? 'vector'
            : (CONFIG.base.default === 'satellite' ? 'satellite' : 'vector');
    try {
        showLabels = localStorage.getItem('kgbMapShowLabels') !== 'false';
        show3D = localStorage.getItem('kgbMapPitch3D') !== '0';
    } catch (e) { }

    map = new maplibregl.Map({
        container: 'map',
        style: currentBaseView === 'satellite' ? SATELLITE_STYLE : VECTOR_STYLE_URL,
        center: isMobileInit ? CONFIG.view.mobileCenter : CONFIG.view.center,
        zoom: isMobileInit ? CONFIG.view.zoom.mobile : CONFIG.view.zoom.desktop,
        pitch: currentBaseView === 'vector' && show3D ? CONFIG.view.pitch3D : 0,
        bearing: CONFIG.view.bearing,
        maxPitch: CONFIG.view.maxPitch,
        minZoom: CONFIG.view.minZoom,
        maxZoom: CONFIG.view.maxZoom,
        attributionControl: { compact: true },
        canvasContextAttributes: { antialias: true },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'bottom-right');

    // Custom layers must be (re-)added after every style switch (setStyle wipes them).
    // NOTE: 'style.load' only — NOT 'styledata' (that fires on every source update
    // and would yank the camera pitch while the user interacts).
    map.on('style.load', ensureCustomStyleLayers);
    map.on('load', ensureCustomStyleLayers);
    try { map.once('idle', () => { bootMapReady = true; maybeHideBootLoader(); }); } catch (e) { }

    // Debug UI (?debug= chip, ?debugpage overlay) replaces the old zoom div.
    initDebugTools();

    // Mask poller: event-order-proof creation. Every second (12 tries), if the
    // style is loaded, boundary data is present, and mask-dim is missing, build
    // it and record the outcome for ?debugpage. Goes quiet after success.
    let maskPollCount = 0;
    const maskPollTimer = setInterval(() => {
        maskPollCount++;
        maskPollTries = maskPollCount;
        try {
            if (!map || !map.isStyleLoaded() || !campusRingLngLat()) return;
            if (map.getLayer('mask-dim')) {
                clearInterval(maskPollTimer);
                return;
            }
            ensureMaskLayers();
            if (map.getLayer('mask-dim')) {
                dlog('[mask] poller created mask-dim on try', maskPollCount);
                clearInterval(maskPollTimer);
            }
        } catch (e) {
            maskPollError = String((e && e.message) || e);
        }
        if (maskPollCount >= 12) clearInterval(maskPollTimer);
    }, 1000);

    // Toggles are wired here; setBaseView applies the actual style.
    const satelliteToggleCheckbox = document.getElementById('toggle-satellite-checkbox');
    if (satelliteToggleCheckbox) {
        satelliteToggleCheckbox.checked = currentBaseView === 'satellite';
        satelliteToggleCheckbox.addEventListener('change', (e) => {
            setBaseView(e.target.checked ? 'satellite' : 'vector', true);
        });
    }

    const pitchToggle = document.getElementById('toggle-3d-checkbox');
    if (pitchToggle) {
        pitchToggle.checked = show3D;
        pitchToggle.addEventListener('change', (e) => setPitch3D(e.target.checked, true));
    }

    const showMarkersInit = localStorage.getItem('kgbMapShowMarkers') !== 'false';
    setMarkersVisible(showMarkersInit, false);
    const toggleMarkersCheckbox = document.getElementById('toggle-markers-checkbox');
    if (toggleMarkersCheckbox) {
        toggleMarkersCheckbox.checked = showMarkersInit;
        toggleMarkersCheckbox.addEventListener('change', (e) => {
            setMarkersVisible(e.target.checked, true);
        });
    }

    const toggleLabelsCheckbox = document.getElementById('toggle-labels-checkbox');
    if (toggleLabelsCheckbox) {
        toggleLabelsCheckbox.checked = showLabels;
        toggleLabelsCheckbox.addEventListener('change', (e) => {
            showLabels = e.target.checked;
            localStorage.setItem('kgbMapShowLabels', showLabels);
            applyLabelVisibility();
        });
    }

    // ===== MAP TEXT LABELS (HTML markers, MapLibre) =====
    mapLabels.forEach(({ coords, text, fontSize, minZoom }) => {
        const el = document.createElement('div');
        el.className = 'map-text-label';
        el.innerHTML = text;
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([coords[1], coords[0]])
            .addTo(map);
        mapLabelRefs.push({ marker, el, fontSize: fontSize || 13, minZoom: minZoom || 16 });
    });

    function updateMapTextLabels() {
        if (!map) return;
        const zoom = map.getZoom();
        mapLabelRefs.forEach(({ el, fontSize, minZoom }) => {
            if (!el) return;
            if (zoom < minZoom) {
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
            } else {
                // Scale font from 60% at minZoom up to 100% at minZoom+3
                const t = (zoom - minZoom) / 3;
                const scale = 0.6 + 0.4 * Math.min(t, 1);
                el.style.fontSize = (fontSize * scale).toFixed(1) + 'px';
                el.style.opacity = '1';
            }
        });
    }

    map.on('zoomend', function () {
        updateMapTextLabels();
        refreshPinTiers();
    });
    updateMapTextLabels();
    // ===== END MAP TEXT LABELS =====

    initPinInteractions();

    // Pins handle their own clicks (stopPropagation) — this is empty-map taps only.
    map.on('click', function () {
        hidePinPopup();
        setMarkerHighlight(null);
        if (window.innerWidth <= 768 && sheetElement && sheetState !== 'peek') {
            sheetElement.style.height = '';
            setSheetState('peek');
        }
    });

    // MapLibre has native mobile gestures (pinch, double-tap zoom, two-finger
    // pitch) — no custom touch handlers needed.

    // ===== END MAP INIT EVENTS =====

    fetch(`https://raw.githubusercontent.com/unija-info/unija-map/refs/heads/main/kgb/data/kgb-map/kgb-map.json?v=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
            mapData = processData(data);
            dlog('[pins-html] locations loaded:', mapData.length);
            const countEl = document.getElementById('location-count');
            if (countEl) countEl.textContent = mapData.length;
            const menuCountEl = document.getElementById('menu-location-count');
            if (menuCountEl) menuCountEl.textContent = mapData.length;
            renderGroupedList();
            showAllLocations(true, false);
            handleDeepLink();
            maybeTestRoute();
            bootDataReady = true;
            maybeHideBootLoader();
            updateDebugChip();
            renderDebugPage();
            // Settle log: prove how many markers are actually on the map.
            setTimeout(() => {
                try {
                    const withCoords = mapData.filter(l => l.coords).length;
                    dlog(`[pins-html] settle — markers mounted: ${pinMarkers.length}, locations with coords: ${withCoords}`);
                } catch (e) { }
            }, 4000);
        })
        .catch(err => {
            console.error('Failed to load map data:', err);
            document.getElementById('company-list').innerHTML =
                '<p style="padding:20px;color:#DC143C;">Gagal memuatkan data peta. Sila muat semula halaman.</p>';
            hideBootLoader();
        });

    loadCampusBoundary();
}

// ===== CAMPUS MASK (hide/fade outside world, restrict panning) =====
// All driven by CONFIG.mask; boundary data comes from campus-boundary.json.

function campusRingLngLat() {
    try {
        const ring = campusBoundaryData && campusBoundaryData.geometry && campusBoundaryData.geometry.coordinates[0];
        return Array.isArray(ring) && ring.length > 2 ? ring : null;
    } catch (e) { return null; }
}

function signedRingArea(ring) {
    let a = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        a += (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
    }
    return a / 2;
}

// Filter for the 3D-buildings layer.
// NOTE: MapLibre `within` only evaluates Point/LineString features — building
// POLYGONS always return false (verified in maplibre-gl-style-spec source,
// Within.evaluate: Point → pointsWithinPolygons, LineString →
// linesWithinPolygons, else false). So outside-buildings cannot be filtered
// out this way; the dim overlay + pan restriction carry the focus effect.
function buildingFilter() {
    return ['!=', ['get', 'hide_3d'], true];
}

function applyBuildingMask() {
    if (!map || !map.isStyleLoaded() || !map.getLayer('3d-buildings')) return;
    try { map.setFilter('3d-buildings', buildingFilter()); } catch (e) { }
}

function ensureMaskLayers() {
    if (!map || !map.isStyleLoaded()) return;
    const dim = CONFIG.mask.dimOutside;
    const ring = campusRingLngLat();
    dlog('[mask] ensure: dim =', dim, '| ring points =', ring ? ring.length : null);
    maskLastRun = new Date().toISOString();
    maskLastError = null;
    try {
        if (!dim || dim <= 0 || !ring) {
            if (map.getLayer('mask-dim')) map.removeLayer('mask-dim');
            if (map.getSource('mask-dim')) map.removeSource('mask-dim');
            return;
        }
        // World shell (CCW) with campus hole (CW) — enforce winding per spec.
        let outer = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];
        let hole = ring.slice();
        if (signedRingArea(outer) < 0) outer.reverse();
        if (signedRingArea(hole) > 0) hole.reverse();
        const data = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [outer, hole] }, properties: {} };
        // Per-component idempotency (same lesson as pins): source existing must
        // never imply the layer exists — ensure each independently.
        if (!map.getSource('mask-dim')) {
            map.addSource('mask-dim', { type: 'geojson', data });
        } else {
            map.getSource('mask-dim').setData(data);
        }
        if (!map.getLayer('mask-dim')) {
            const style = map.getStyle();
            const layers = (style && style.layers) || [];
            let beforeId = null;
            for (let i = 0; i < layers.length; i++) {
                if (layers[i].type === 'symbol') { beforeId = layers[i].id; break; }
            }
            map.addLayer({ id: 'mask-dim', type: 'fill', source: 'mask-dim', paint: { 'fill-color': CONFIG.mask.dimColor, 'fill-opacity': dim } }, beforeId || undefined);
            dlog('[mask] created mask-dim layer, before:', beforeId);
        } else {
            map.setPaintProperty('mask-dim', 'fill-opacity', dim);
            map.setPaintProperty('mask-dim', 'fill-color', CONFIG.mask.dimColor);
        }
    } catch (e) {
        maskLastError = String((e && e.message) || e);
        console.warn('[mask] dim overlay failed:', e);
    }
}

function applyPanRestriction() {
    if (!map) return;
    try {
        const ring = campusRingLngLat();
        if (!CONFIG.mask.restrictPanning || !ring) {
            if (CONFIG.mask.restrictPanning === false) map.setMaxBounds(null);
            return;
        }
        const buf = CONFIG.mask.panBuffer || 0;
        let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
        ring.forEach(c => {
            if (c[0] < minLng) minLng = c[0];
            if (c[1] < minLat) minLat = c[1];
            if (c[0] > maxLng) maxLng = c[0];
            if (c[1] > maxLat) maxLat = c[1];
        });
        map.setMaxBounds([[minLng - buf, minLat - buf], [maxLng + buf, maxLat + buf]]);
    } catch (e) { }
}

function campusMaxBounds() {
    const ring = campusRingLngLat();
    if (!ring) return null;
    const buf = CONFIG.mask.panBuffer || 0;
    let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    ring.forEach(c => {
        if (c[0] < minLng) minLng = c[0];
        if (c[1] < minLat) minLat = c[1];
        if (c[0] > maxLng) maxLng = c[0];
        if (c[1] > maxLat) maxLat = c[1];
    });
    return [[minLng - buf, minLat - buf], [maxLng + buf, maxLat + buf]];
}

// Campus coords are [lat, lng]. True when the point falls outside the lock box.
function coordsOutsideCampus(lat, lng) {
    const b = campusMaxBounds();
    if (!b) return false;
    return lng < b[0][0] || lng > b[1][0] || lat < b[0][1] || lat > b[1][1];
}

// Lift-on-demand: keep the campus lock for browsing, but drop MaxBounds when
// live state (GPS dot or a directions endpoint) sits outside it — otherwise
// MapLibre clamps flyTo/fitBounds and an off-campus user can never be framed.
// Restores the lock as soon as everything is back inside.
function updatePanRestrictionForState() {
    if (!map || !CONFIG.mask.restrictPanning) return;
    try {
        const pts = [];
        if (currentUserLocation) pts.push([currentUserLocation.lat, currentUserLocation.lng]);
        if (directionsStart && directionsStart.coords) pts.push(directionsStart.coords);
        if (directionsEnd && directionsEnd.coords) pts.push(directionsEnd.coords);
        const outside = pts.some(c => coordsOutsideCampus(c[0], c[1]));
        if (outside) {
            map.setMaxBounds(null);
            dlog('[mask] lock lifted for outside point');
        } else {
            applyPanRestriction();
        }
    } catch (e) { }
}

// ===== CAMPUS BOUNDARY (GeoJSON source, survives style switches) =====

function ensureBoundaryLayers() {
    if (!map || !map.isStyleLoaded() || !campusBoundaryData) return false;
    try {
        if (!map.getSource('campus-boundary')) {
            map.addSource('campus-boundary', { type: 'geojson', data: campusBoundaryData });
            map.addLayer({ id: 'campus-boundary-fill', type: 'fill', source: 'campus-boundary', paint: { 'fill-color': CONFIG.mask.boundaryFillColor, 'fill-opacity': CONFIG.mask.boundaryFillOpacity } });
            map.addLayer({ id: 'campus-boundary-line', type: 'line', source: 'campus-boundary', paint: { 'line-color': '#1967d2', 'line-width': 2.5, 'line-opacity': 0.8 } });
        } else {
            map.getSource('campus-boundary').setData(campusBoundaryData);
        }
        return true;
    } catch (e) { return false; }
}

function loadCampusBoundary() {
    // Coordinates sourced from OSM Way 1120569731 (UniSZA KGB campus) and stored locally
    // to avoid dependency on the unreliable Overpass API. Cache-busted so
    // boundary updates reach phones (same pattern as the live map data).
    fetch('/kgb/data/campus-boundary.json?v=' + Date.now())
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(coords => {
            // Stored as [[lat,lng],...] — convert to GeoJSON [lng,lat] ring.
            const ring = coords.map(c => [c[1], c[0]]);
            campusBoundaryData = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} };
            dlog('[boundary] loaded points:', coords.length);
            ensureBoundaryLayers();
            applyBuildingMask();
            ensureMaskLayers();
            applyPanRestriction();
            // Retry once after settle — covers style-not-ready races silently.
            setTimeout(() => {
                try {
                    if (map && map.isStyleLoaded() && campusBoundaryData &&
                        (!map.getLayer('campus-boundary-line') || !map.getLayer('campus-boundary-fill'))) {
                        console.warn('[boundary] layers missing after settle — re-ensuring');
                        ensureBoundaryLayers();
                    }
                } catch (e) { }
            }, 4000);
        })
        .catch(err => {
            console.warn('[boundary] fetch failed (check server root serves /kgb/data/):', err);
        });
}

// ===== VERSION & UPDATE INFO =====

async function fetchMapDataInfo() {
    const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

    function formatTarikhMalay(date) {
        const day = HARI[date.getDay()];
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${day} ${dd}/${mm}/${yyyy}`;
    }

    function timeAgoMalay(date) {
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays >= 1) return `${diffDays} hari lalu`;
        if (diffHrs >= 1) {
            const remMins = diffMins % 60;
            return remMins > 0
                ? `${diffHrs} jam ${remMins} minit lalu`
                : `${diffHrs} jam lalu`;
        }
        return `${diffMins} minit lalu`;
    }

    const [versionResult, commitResult] = await Promise.allSettled([
        fetch(`https://raw.githubusercontent.com/unija-info/unija-map/main/kgb/map/CHANGELOG.md?v=${Date.now()}`)
            .then(r => r.text())
            .then(text => {
                const m = text.match(/^## \[([^\]]+)\]/m);
                return m ? m[1] : null;
            }),
        fetch(`https://api.github.com/repos/unija-info/unija-map/commits?path=kgb/data/kgb-map/kgb-map.json&per_page=1`)
            .then(r => r.json())
            .then(commits => commits.length > 0 ? new Date(commits[0].commit.committer.date) : null)
    ]);

    const kemaskiniEl = document.getElementById('map-kemaskini');

    if (versionResult.status === 'fulfilled' && versionResult.value) {
        paintVersionLines(versionResult.value);
    }

    if (commitResult.status === 'fulfilled' && commitResult.value) {
        const date = commitResult.value;
        const kemaskiniText = `Kemaskini: ${formatTarikhMalay(date)} (${timeAgoMalay(date)})`;
        if (kemaskiniEl) kemaskiniEl.textContent = kemaskiniText;
        const menuKemaskiniEl = document.getElementById('menu-kemaskini');
        if (menuKemaskiniEl) menuKemaskiniEl.textContent = kemaskiniText;
    }
}

// ===== INFO MENU PANEL =====

function openInfoMenu() {
    const panel = document.getElementById('info-menu-panel');
    // On desktop, align popup with the search bar's current left position
    if (window.innerWidth > 768) {
        const sidebar = document.getElementById('sidebar');
        const isCollapsed = sidebar && sidebar.classList.contains('collapsed');
        panel.style.left = isCollapsed ? '70px' : '420px';
    } else {
        panel.style.left = '';
    }
    panel.classList.add('open');
    document.getElementById('info-menu-backdrop').classList.add('open');
    if (window.innerWidth <= 768) {
        document.body.style.overflow = 'hidden';
    }
}

function closeInfoMenu() {
    document.getElementById('info-menu-panel').classList.remove('open');
    document.getElementById('info-menu-backdrop').classList.remove('open');
    document.body.style.overflow = '';
}

// ===== EVENT WIRING =====

// ===== INIT =====

window.onload = function () {
    document.getElementById('show-all').onclick = showAllLocations;
    document.getElementById('toggle-all-groups').onclick = toggleAllGroups;
    document.getElementById('info-menu-btn').addEventListener('click', openInfoMenu);
    document.getElementById('info-menu-close').addEventListener('click', closeInfoMenu);
    document.getElementById('info-menu-backdrop').addEventListener('click', closeInfoMenu);
    // Config first (fast same-origin file, 2.5s cap so a hang never blocks the map),
    // then the map reads it for the initial camera.
    Promise.race([
        loadAppConfig(),
        new Promise(resolve => setTimeout(resolve, 2500)),
    ]).finally(bootApp);
};

function bootApp() {
    window.__kgbBootCount = (window.__kgbBootCount || 0) + 1;
    setTimeout(hideBootLoader, 10000); // safety: loader never sticks
    paintVersionLines(null); // code version immediately; release appended later
    initMap();
    initBottomSheet();
    initDesktopSidebar();
    initSearchDropdown();
    initDirectionsPanel();
    initMyLocationButton();
    initFloatingButtonsMobile();
    createClearSearchButton();
    initClearSearchButton();
    fetchMapDataInfo();
}

window.addEventListener('resize', function () {
    const sidebar = document.getElementById('sidebar');

    // Pin dot/badge zoom tier follows the mobile/desktop breakpoint.
    refreshPinTiers();
    positionPinPopup();

    if (window.innerWidth <= 768) {
        initBottomSheet();
        initFloatingButtonsMobile();
        if (sidebar) sidebar.classList.remove('collapsed');
    } else {
        if (sidebar && desktopSidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }
        positionMyLocationButtonDesktop();
    }
});
