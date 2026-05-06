# Deep-Link & Share System — Reference Guide

This document describes the shareable URL and clipboard system implemented in `kgb/map/` as of **v2.8–v2.9**. Use it as a blueprint when adding the same feature to `kgb/bus-stop/` or other sub-projects.

---

## URL Format

```
/kgb/map/                                   → default (all locations, no filter)
/kgb/map/?type=kolej-kediaman               → category/group filter only
/kgb/map/#canselori                         → single location overlay (all markers)
/kgb/map/?type=kolej-kediaman#canselori     → single location + category context
```

| Part | Source | Meaning |
|---|---|---|
| `?type=<slug>` | `slugify(categoryName)` | Active category/group filter |
| `#<slug>` | `slugify(location.place)` | Active location info overlay |

All URL changes use `history.replaceState` — no browser history entries are added. The back button exits the page, not a previous map state.

---

## Core Utilities

### `slugify(text)`

Converts any display string to a URL-safe slug. Single source of truth — always use this, never hand-write slugs.

```js
function slugify(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip diacritics
        .replace(/[^a-z0-9]+/g, '-')                        // non-alphanumeric → hyphen
        .replace(/^-+|-+$/g, '');                            // trim leading/trailing hyphens
}
```

Examples:
- `"Kolej Kediaman"` → `"kolej-kediaman"`
- `"Canselori"` → `"canselori"`
- `"Café & Makanan"` → `"cafe-makanan"`

**Constraint**: if two items produce the same slug, `find()` returns the first match. Ensure all names/categories in your dataset are unique enough in practice.

---

### `updateURL({ type, location })`

Single function for all URL mutations. Call this instead of touching `window.location` directly.

```js
function updateURL({ type = null, location = null } = {}) {
    const url = new URL(window.location.href);
    if (type) {
        url.searchParams.set('type', slugify(type));
    } else {
        url.searchParams.delete('type');
    }
    if (location) {
        url.hash = slugify(location.place);   // adapt field name for your data model
    } else {
        url.hash = '';
    }
    history.replaceState(null, '', url.toString().replace(/#$/, ''));
}
```

**Usage patterns:**

| Situation | Call |
|---|---|
| Category selected | `updateURL({ type: categoryName })` |
| Location overlay opened (no category) | `updateURL({ location })` |
| Location overlay opened (category active) | `updateURL({ type: currentActiveCategory, location })` |
| Category overlay closed / all shown | `updateURL()` |
| Location overlay closed (back, from category) | `updateURL({ type: currentActiveCategory })` |
| Location overlay closed (× close all) | `updateURL()` |

---

### `copyToClipboard(text)`

Copies a string. Uses the async Clipboard API on HTTPS; falls back to `execCommand` on HTTP (local dev).

```js
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
```

Always pair with `showToast()` — user needs visual confirmation.

---

### `showToast(message)`

Fixed bottom-center toast. Auto-removes after 2 seconds.

```js
function showToast(message) {
    document.getElementById('map-toast')?.remove();
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
```

Required CSS:

```css
#map-toast {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%) translateY(8px);
    background: #202124;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 13px;
    opacity: 0;
    transition: opacity 0.2s, transform 0.2s;
    z-index: 9999;
    pointer-events: none;
    white-space: nowrap;
}
#map-toast.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}
```

---

## Deep-Link Resolution on Page Load

`handleDeepLink()` runs **once** after data is loaded. Call it after your initial render, passing `updateUrl: false` to your show-all function so params survive long enough to be read.

```js
function handleDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const typeSlug = params.get('type');
    const locSlug = window.location.hash.slice(1);

    if (locSlug) {
        // #hash takes priority — find by slugified name
        const item = data.find(d => slugify(d.name) === locSlug);
        if (!item) return;
        // Show marker + open info overlay
        showItemOnMap(item);
        showInfoOverlay(item.id);
        // If ?type= also present, restore category context silently
        // so the ← dismiss button restores the correct ?type= URL
        if (typeSlug) {
            const cat = CATEGORIES.find(c => slugify(c) === typeSlug);
            if (cat) currentActiveCategory = cat;
        }
    } else if (typeSlug) {
        // ?type= only — filter by category
        const cat = CATEGORIES.find(c => slugify(c) === typeSlug);
        if (cat) filterByCategory(cat);
    }
}
```

**Resolution order:**
1. `#hash` present → single item + overlay (category stored silently if `?type=` also present)
2. `?type=` only → group filter
3. Neither → normal load

---

## Share Buttons

### Item info overlay share button

Copies the current URL (which already includes `#item-slug` via `updateURL`).

```js
shareBtn.addEventListener('click', () => copyToClipboard(window.location.href));
```

Add this button inside the info overlay HTML:
```html
<button class="info-overlay-share">
    <span class="material-symbols-outlined">link</span>
    Salin Pautan
</button>
```

### Group/category share button

Generates the `?type=` URL explicitly. Must use `stopPropagation` if nested inside a clickable group header.

```js
// As a <span role="button"> if inside a <button> parent (nested buttons = invalid HTML)
shareSpan.addEventListener('click', (e) => {
    e.stopPropagation();
    const url = window.location.origin + window.location.pathname + '?type=' + slugify(groupName);
    copyToClipboard(url);
});
```

**Important**: if your group header is already a `<button>`, the share trigger must be a `<span role="button">` — nesting `<button>` inside `<button>` is invalid HTML and browsers hoist the inner button out of the DOM.

---

## URL State Machine

| User action | `?type=` | `#hash` |
|---|---|---|
| Page load, no filter | — | — |
| Select group/category | `slugify(group)` | — |
| Deselect group (toggle) | — | — |
| Show all | — | — |
| Open item overlay (no group) | — | `slugify(name)` |
| Open item overlay (group active) | `slugify(group)` | `slugify(name)` |
| `←` dismiss from group overlay | `slugify(group)` | — |
| `←` dismiss standalone | — | — |
| `×` close (reset all) | — | — |
| Tap group badge inside item overlay | `slugify(group)` | — |

---

## Applying to `kgb/bus-stop/`

The bus-stop map has stops and companies (operators). The equivalent mapping would be:

| kgb/map/ concept | kgb/bus-stop/ equivalent |
|---|---|
| `?type=<category-slug>` | `?stop=<stop-slug>` (filter by stop) |
| `#<place-slug>` | `#<company-slug>` (open company info) |
| `filterByCategory(name)` | `filterByStop(stop)` |
| `DESIRED_ORDER` array | stops array |
| `slugify(location.place)` | `slugify(stop.name)` |

Minimum implementation:
1. Add `slugify()` and `copyToClipboard()` + `showToast()` utility functions
2. Add `updateURL()` and call it in `filterByStop()`, overlay open/close handlers
3. Add `handleDeepLink()` and call it after data loads
4. Add share button to each stop group header (copying `?stop=<slug>`)
5. Add toast HTML + CSS

---

## Files to Reference

| File | What to read |
|---|---|
| `kgb/map/script.js` | `slugify`, `updateURL`, `copyToClipboard`, `showToast`, `handleDeepLink` |
| `kgb/map/style.css` | `#map-toast`, `.info-overlay-share`, `.category-share-btn` |
| `kgb/map/CLAUDE.md` | Full deep-link system documentation (§ URL / Deep-Link System) |
| `kgb/map/CHANGELOG.md` | v2.8 implementation notes |
