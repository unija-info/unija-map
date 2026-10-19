// Headless harness: executes the REAL kgb/map/script.js boot flow against a
// fake MapLibre map + DOM stubs. Run: node kgb/map/harness.debug.js
// Verifies: config load, style-load layer creation, boundary fetch ordering,
// mask-dim creation, pin mounting. Kept as the repo's regression tool —
// extend it before guessing at ordering bugs (see AGENTS.md).
'use strict';
const fs = require('fs');
const path = require('path');

const failures = [];
function check(name, cond, extra) {
    console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra !== undefined ? ' | ' + extra : ''));
    if (!cond) failures.push(name);
}

// ---------- stubs ----------
function makeEl() {
    const el = {
        style: {},
        dataset: {},
        classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
        addEventListener() {}, removeEventListener() {},
        appendChild() {}, insertBefore() {}, remove() {},
        setAttribute() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
        className: '', innerHTML: '', textContent: '', value: '',
    };
    el.querySelector = () => makeEl();
    el.querySelectorAll = () => [];
    return el;
}
global.window = { location: { search: '?debugpage', hash: '', href: 'http://x/kgb/map/?debugpage' }, innerWidth: 1280, innerHeight: 800, addEventListener() {} };
global.document = {
    createElement: () => makeEl(),
    getElementById: () => makeEl(),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {},
    body: makeEl(),
    documentElement: { style: { setProperty() {} } },
};
try { global.navigator = {}; } catch (e) { /* node>=22: navigator is getter-only */ }
global.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); }, removeItem(k) { delete this._m[k]; } };

// ---------- fake map ----------
class FakeMap {
    constructor() {
        this._handlers = {};
        this._sources = {};
        this._layers = {};
        this._loaded = false;
        this._zoom = 14; this._pitch = 0; this._bearing = 0;
        this._center = { lat: 5.4, lng: 103.08 };
    }
    on(type, a, b) { (this._handlers[type] = this._handlers[type] || []).push(b || a); return this; }
    fire(type, arg) { (this._handlers[type] || []).forEach(fn => { try { fn(arg || {}); } catch (e) { console.log('HANDLER THROW [' + type + ']:', e.message); failures.push('handler:' + type); } }); }
    isStyleLoaded() { return this._loaded; }
    getStyle() { return { layers: this._styleLayers || [] }; }
    getSource(id) { return this._sources[id]; }
    addSource(id, spec) { if (this._sources[id]) throw new Error('source exists: ' + id); this._sources[id] = { _data: spec.data, setData(d) { this._data = d; } }; }
    removeSource(id) { delete this._sources[id]; }
    getLayer(id) { return this._layers[id]; }
    addLayer(spec, before) {
        if (this._layers[spec.id]) throw new Error('layer exists: ' + spec.id);
        if (!this._sources[spec.source]) throw new Error('missing source for layer: ' + spec.id);
        this._layers[spec.id] = { spec, before: before || null };
    }
    removeLayer(id) { delete this._layers[id]; }
    setFilter() {} setPaintProperty() {} setLayoutProperty() {} setLayerZoomRange() {} setFeatureState() {}
    setMaxBounds() {}
    getZoom() { return this._zoom; } getPitch() { return this._pitch; } getBearing() { return this._bearing; }
    getCenter() { return this._center; }
    getContainer() { return makeEl(); } getCanvas() { return { style: {} }; }
    project(lngLat) { return { x: 400, y: 300 }; }
    unproject() { return { lat: 5.4, lng: 103.08 }; }
    flyTo() {} jumpTo() {} fitBounds() {} easeTo() {}
    addControl() {}
    querySourceFeatures() { return []; } queryRenderedFeatures() { return []; }
}
let fakeMap = null;
class FakeMarker {
    constructor() { this._el = null; }
    setLngLat() { return this; } addTo() { return this; } remove() {} getElement() { return this._el; }
}
global.maplibregl = {
    Map: function (opts) { fakeMap = new FakeMap(); fakeMap._opts = opts; return fakeMap; },
    Marker: function (o) { const m = new FakeMarker(); m._el = o && o.element; return m; },
    NavigationControl: function () {},
    LngLatBounds: function () { this.extend = () => {}; },
};

// ---------- fetch stub ----------
const repoRoot = path.resolve(__dirname, '..', '..');
global.fetch = (url) => {
    const file = url.includes('config.json') ? 'kgb/map/config.json'
        : url.includes('campus-boundary.json') ? 'kgb/data/campus-boundary.json'
        : url.includes('kgb-map.json') ? null // data: minimal inline below
        : null;
    if (url.includes('kgb-map.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
            { number: 'P1', place: 'Canselori', googleMapLink: 'https://maps.google.com/?q=5.40121,103.08017', locationType: 'PENTADBIRAN & PTJ', shortForm: '', details: '' },
            { number: 'A1', place: 'Blok Abu Bakar', googleMapLink: 'https://maps.google.com/?q=5.39996,103.07900', locationType: 'BLOK AKADEMIK & KELAS', shortForm: '', details: '' },
        ]) });
    }
    if (!file) return Promise.reject(new Error('unexpected fetch: ' + url));
    const text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(text)), text: () => Promise.resolve(text) });
};

// ---------- load the real script ----------
const src = fs.readFileSync(path.join(repoRoot, 'kgb/map/script.js'), 'utf8');
const windowAssign = src + '\n;globalThis.__app = { bootApp, initMap, ensureMaskLayers, loadCampusBoundary, debugSnapshot, getMap: () => map, getState: () => ({ pinMarkers, campusBoundaryData, maskLastRun, maskLastError, markersVisible }) };';
eval(windowAssign);

(async () => {
    const app = globalThis.__app;
    // Scenario A: style loads first, then boundary fetch resolves (normal).
    app.bootApp();
    fakeMap._loaded = true;
    fakeMap._styleLayers = [{ id: 'road_oneway', type: 'symbol' }];
    fakeMap.fire('load');
    await new Promise(r => setTimeout(r, 50)); // let fetches resolve
    fakeMap.fire('load'); // second event (style.load+load double-fire)
    await new Promise(r => setTimeout(r, 50));

    const st = app.getState();
    check('boundary source created', !!fakeMap.getSource('campus-boundary'));
    check('boundary line layer created', !!fakeMap.getLayer('campus-boundary-line'));
    check('mask-dim layer created', !!fakeMap.getLayer('mask-dim'));
    check('maskLastRun set', !!st.maskLastRun, st.maskLastRun);
    check('maskLastError empty', !st.maskLastError, st.maskLastError);
    check('pins mounted', st.pinMarkers.length === 2, 'count=' + st.pinMarkers.length);
    const src = fakeMap.getSource('campus-boundary');
    check('boundary ringconverted', src && src._data.geometry.coordinates[0][0].length === 2);

    console.log(failures.length ? `\n${failures.length} FAILURES` : '\nALL GREEN');
    process.exit(failures.length ? 1 : 0);
})();
