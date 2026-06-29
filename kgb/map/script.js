// ===== STATE =====
let map;
let markers = [];
let mapData = [];
let currentActiveCategory = null;
let currentSelectedLocationId = null;
let currentInfoOverlayLocationId = null;
let currentHighlightedMarker = null;
let currentOverlaySource = null; // null | 'category'
let satelliteLayer = null;
let regularLayer = null;
let satelliteLabelsLayer = null;
let regularLabelsLayer = null;
let currentBaseView = 'satellite'; // 'satellite' | 'osm'
let showLabels = true;
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
let directionsStartMarker = null;      // L.marker pin for the chosen start point
let directionsEndMarker = null;        // L.marker pin for the chosen end point

// ===== ZOOM-BASED MARKER TIERS =====
const ZOOM_FULL_DESKTOP   = 17.5;
const ZOOM_FULL_MOBILE    = 17;
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

function setMarkerHighlight(marker) {
    const prev = currentHighlightedMarker;
    currentHighlightedMarker = marker || null;

    // Revert previous marker — update currentHighlightedMarker first so
    // shouldShowFullMarker evaluates the old marker without highlight bias
    if (prev) {
        const el = prev.getElement();
        if (el) el.classList.remove('marker-highlighted');
        const loc = prev._location;
        if (loc) {
            const mode = shouldShowFullMarker(loc) ? 'full' : 'dot';
            prev.setIcon(createMarkerIcon(loc, mode));
        }
    }

    if (marker) {
        const el = marker.getElement();
        if (el) el.classList.add('marker-highlighted');
    }
}

// ===== CATEGORY COLOR SYSTEM =====
const CATEGORY_COLORS = {
    'PENTADBIRAN & PTJ':              { bg: '#2b8a8f', text: 'white' },
    'BLOK AKADEMIK & KELAS':          { bg: '#205c8c', text: 'white' },
    'BLOK FAKULTI & PUSAT PENGAJIAN': { bg: '#d4a000', text: 'black' },
    'KOLEJ KEDIAMAN':                 { bg: '#ecaa2b', text: 'black' },
    'PUSAT AKTIVITI':                 { bg: '#e0468a', text: 'black' },
    'SUKAN & REKREASI':               { bg: '#8A2BE2', text: 'white' },
    'CAFE & MAKANAN':                 { bg: '#b0a020', text: 'black' },
    'KESIHATAN':                      { bg: '#DC143C', text: 'white' },
    'IBADAH':                         { bg: '#32CD32', text: 'black' },
    'FASILITI & KEMUDAHAN':           { bg: '#8f9ce2', text: 'black' },
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
    'PENTADBIRAN & PTJ':              'pentadbiran',
    'BLOK AKADEMIK & KELAS':          'akademik',
    'BLOK FAKULTI & PUSAT PENGAJIAN': 'fakulti',
    'KOLEJ KEDIAMAN':                 'kolej-kediaman',
    'PUSAT AKTIVITI':                 'aktiviti',
    'SUKAN & REKREASI':               'sukan',
    'CAFE & MAKANAN':                 'cafe',
    'KESIHATAN':                      'kesihatan',
    'IBADAH':                         'ibadah',
    'FASILITI & KEMUDAHAN':           'fasiliti',
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

// ===== MARKER CREATION =====

function createMarkerIcon(location, mode = 'full') {
    const bgColor = getCategoryColor(location.locationType);

    if (mode === 'dot') {
        const w = 12, h = 12;
        const html = `<div style="
            background: ${bgColor};
            width: ${w}px;
            height: ${h}px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            cursor: pointer;
        "></div>`;
        return L.divIcon({
            html: html,
            className: '',
            iconSize: [w, h],
            iconAnchor: [w / 2, h / 2],
            tooltipAnchor: window.innerWidth <= 768 ? [0, -8] : [8, 0],
        });
    }

    const textColor = getCategoryTextColor(location.locationType);
    const num = location.number || '?';
    const isLong = num.length >= 4;
    const isKolej = location.locationType === 'KOLEJ KEDIAMAN';

    let w, h, borderRadius, fontSize;
    if (isKolej) {
        w = 20; h = 20; borderRadius = '6px'; fontSize = 9;
    } else if (isLong) {
        w = 25; h = 25; borderRadius = '11px'; fontSize = 9;
    } else {
        w = 25; h = 25; borderRadius = '50%'; fontSize = 11;
    }

    const html = `<div style="
        background: ${bgColor};
        color: ${textColor};
        width: ${w}px;
        height: ${h}px;
        border-radius: ${borderRadius};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${fontSize}px;
        font-weight: 700;
        font-family: 'Google Sans', sans-serif;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.35);
        white-space: nowrap;
        cursor: pointer;
        user-select: none;
    ">${num}</div>`;

    return L.divIcon({
        html: html,
        className: '',
        iconSize: [w, h],
        iconAnchor: [w / 2, h / 2],
        tooltipAnchor: window.innerWidth <= 768 ? [0, -h / 2 - 2] : [w / 2 + 2, -h / 2],
    });
}

function createMarker(location, exempt = false) {
    if (!location.coords) return null;

    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.coords[0]},${location.coords[1]}`;

    const mode = shouldShowFullMarker(location) ? 'full' : 'dot';
    const icon = createMarkerIcon(location, mode);
    const markerOptions = { icon: icon };
    if (!exempt) markerOptions.pane = 'campusMarkerPane';
    const marker = L.marker(location.coords, markerOptions);
    marker._location = location;
    marker.addTo(map);

    const tooltipContent = `
        <div class="popup-content-wrapper">
            <button class="tooltip-close-btn">×</button>
            <strong class="popup-stop-name">${location.place}</strong>
            <span class="popup-category" style="background:${getCategoryColor(location.locationType)}">${location.locationType}</span>
            <div class="popup-buttons">
                <button class="tooltip-info-btn" data-location-id="${location.id}">i</button>
                <a href="${googleUrl}" target="_blank" class="popup-link" onclick="event.stopPropagation();"><span class="material-symbols-outlined">directions</span>Arah</a>
            </div>
        </div>
    `;

    const isMobile = window.innerWidth <= 768;
    const tooltipOptions = {
        permanent: true,
        direction: isMobile ? 'top' : 'right',
        className: 'custom-tooltip-popup',
        offset: isMobile ? [0, -5] : [location.number.length >= 4 ? 24 : 18, 0],
    };
    if (!exempt) tooltipOptions.pane = 'campusTooltipPane';
    marker.bindTooltip(tooltipContent, tooltipOptions);

    // Wait for tooltip element to be in DOM
    setTimeout(() => {
        const tooltipEl = marker.getTooltip() && marker.getTooltip().getElement();
        if (!tooltipEl) return;

        // --- Hover: show/hide tooltip; temporarily upgrade dot → full ---
        marker.on('mouseover', () => {
            tooltipEl.classList.add('tooltip-visible');
            if (!shouldShowFullMarker(location)) {
                marker.setIcon(createMarkerIcon(location, 'full'));
            }
        });
        marker.on('mouseout', () => {
            if (!marker._tooltipSticky) {
                tooltipEl.classList.remove('tooltip-visible');
                if (!shouldShowFullMarker(location)) {
                    marker.setIcon(createMarkerIcon(location, 'dot'));
                }
            }
        });

        // --- Hover: keep visible when mouse moves onto tooltip itself ---
        tooltipEl.addEventListener('mouseenter', () => tooltipEl.classList.add('tooltip-visible'));
        tooltipEl.addEventListener('mouseleave', () => {
            if (!marker._tooltipSticky) tooltipEl.classList.remove('tooltip-visible');
        });

        // --- Click: toggle sticky expanded state ---
        function openSticky() {
            // Close any other sticky marker first
            markers.forEach(m => {
                if (m !== marker && m._tooltipSticky) {
                    m._tooltipSticky = false;
                    const el = m.getTooltip() && m.getTooltip().getElement();
                    if (el) el.classList.remove('tooltip-visible', 'expanded');
                }
            });
            marker._tooltipSticky = true;
            tooltipEl.classList.add('tooltip-visible', 'expanded');
            setMarkerHighlight(marker);
        }

        function closeSticky() {
            marker._tooltipSticky = false;
            tooltipEl.classList.remove('tooltip-visible', 'expanded');
            setMarkerHighlight(null);
        }

        marker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            if (window.innerWidth <= 768) {
                flyToMarker(location.coords, 0.6);
                setMarkerHighlight(marker);
                showLocationInfoOverlay(location.id);
            } else {
                if (marker._tooltipSticky) {
                    closeSticky();
                } else {
                    openSticky();
                }
            }
        });

        // --- Tooltip inner button handlers ---
        tooltipEl.addEventListener('click', function(e) {
            const infoBtn = e.target.closest('.tooltip-info-btn');
            if (infoBtn) {
                e.stopPropagation();
                showLocationInfoOverlay(parseInt(infoBtn.dataset.locationId));
                return;
            }
            const closeBtn = e.target.closest('.tooltip-close-btn');
            if (closeBtn) {
                e.stopPropagation();
                closeSticky();
                return;
            }
            if (e.target.closest('.popup-link')) return;
            e.stopPropagation();
        });
    }, 50);

    return marker;
}

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

// ===== FILTERING =====

function shouldShowFullMarker(location) {
    if (PRIORITY_CATEGORIES.includes(location.locationType)) return true;
    const threshold = window.innerWidth <= 768 ? ZOOM_FULL_MOBILE : ZOOM_FULL_DESKTOP;
    if (map.getZoom() >= threshold) return true;
    if (currentSelectedLocationId !== null && location.id === currentSelectedLocationId) return true;
    if (currentActiveCategory !== null && location.locationType === currentActiveCategory) return true;
    if (currentHighlightedMarker && currentHighlightedMarker._location &&
        currentHighlightedMarker._location.id === location.id) return true;
    return false;
}

function updateMarkerModes() {
    markers.forEach(marker => {
        const loc = marker._location;
        if (!loc) return;
        const mode = shouldShowFullMarker(loc) ? 'full' : 'dot';
        marker.setIcon(createMarkerIcon(loc, mode));
        // setIcon() replaces the DOM element — re-apply highlight class if needed
        if (marker === currentHighlightedMarker) {
            const el = marker.getElement();
            if (el) el.classList.add('marker-highlighted');
        }
    });
}

function flyToMarker(coords, duration = 0.8) {
    const zoomThreshold = window.innerWidth <= 768 ? ZOOM_FULL_MOBILE : ZOOM_FULL_DESKTOP;
    const zoom = Math.max(map.getZoom(), zoomThreshold);
    const targetPx = map.project(coords, zoom);
    const offsetCenter = map.unproject(targetPx.subtract([0, -window.innerHeight * 0.15]), zoom);
    map.flyTo(offsetCenter, zoom, { duration });
}

function showAllLocations(animate = true, updateUrl = true) {
    if (updateUrl) updateURL();
    document.querySelector('.stop-category-overlay')?.remove();
    currentOverlaySource = null;
    clearMarkers();
    setMarkerHighlight(null);
    currentActiveCategory = null;
    currentSelectedLocationId = null;
    document.querySelectorAll('.stop-header').forEach(h => h.classList.remove('category-active'));

    const coords = [];
    mapData.forEach(loc => {
        if (loc.coords) {
            const m = createMarker(loc);
            if (m) {
                markers.push(m);
                coords.push(loc.coords);
            }
        }
    });

    if (coords.length > 0) {
        const isMobile = window.innerWidth <= 768;
        const mobileCenter = [5.40105971093413, 103.07981725897017];
        const desktopCenter = [5.402700026344124, 103.08008886748964];
        if (animate) {
            map.flyTo(isMobile ? mobileCenter : desktopCenter, isMobile ? 15.5 : 16.3);
        } else {
            map.setView(isMobile ? mobileCenter : desktopCenter, isMobile ? 15 : 17.5);
        }
    }

    // Collapse bottom sheet on mobile
    if (window.innerWidth <= 768 && sheetElement) {
        sheetElement.style.height = '';
        setSheetState('peek');
    }
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
    const coords = [];
    mapData.forEach(loc => {
        if (loc.locationType === categoryName && loc.coords) {
            const m = createMarker(loc);
            if (m) {
                markers.push(m);
                coords.push(loc.coords);
            }
        }
    });

    const isMobile = window.innerWidth <= 768;
    if (coords.length > 0) {
        if (isMobile) {
            const bottomPad = Math.round(window.innerHeight * 0.5) + 20;
            map.flyToBounds(coords, { paddingTopLeft: [40, 60], paddingBottomRight: [40, bottomPad], maxZoom: 18, duration: 1.2 });
        } else {
            map.flyToBounds(coords, { padding: getMapPadding(), maxZoom: 18, duration: 1.2 });
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

    clearMarkers();
    const m = createMarker(location, true);
    if (m) {
        markers.push(m);
        setMarkerHighlight(m);
    }

    const basePadding = getMapPadding();
    const padding = [100, 100, 100, basePadding[3] || 100];
    map.flyToBounds([location.coords], { padding: padding, maxZoom: 19, duration: 1.2 });
}

function showLocationOnMap(location) {
    if (!location.coords) return;

    currentSelectedLocationId = location.id;
    currentActiveCategory = null;
    document.querySelectorAll('.stop-header').forEach(h => h.classList.remove('category-active'));

    clearMarkers();
    const m = createMarker(location, true);
    if (m) {
        markers.push(m);
        setMarkerHighlight(m);
    }

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
                    // Category overlay is still in DOM — restore category markers
                    currentSelectedLocationId = null;
                    clearMarkers();
                    mapData
                        .filter(l => l.locationType === currentActiveCategory)
                        .forEach(l => {
                            const m = createMarker(l);
                            if (m) markers.push(m);
                        });
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
                // Restore so dismissOverlay() can re-render category markers
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

    collapseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDesktopSidebar(true);
    });

    expandBtn.addEventListener('click', function(e) {
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
        (loc.locationType || '').toLowerCase().includes(lowerTerm)
    );
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

    // Search locations by number, place, shortForm, details, locationType
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
        html += `
            <div class="search-result-item location" data-type="location" data-id="${loc.id}">
                <div class="result-content">
                    <div class="result-title">${loc.number}: ${loc.place}${loc.shortForm ? ' (' + loc.shortForm + ')' : ''}</div>
                    <div class="result-subtitle">${loc.locationType || ''}</div>
                    ${loc.details ? `<div class="result-detail">${loc.details}</div>` : ''}
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
        html = '<div class="no-results">Tiada hasil ditemui</div>';
    }

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('active');
}

function initSearchDropdown() {
    const searchBar = document.getElementById('search-bar');
    const resultsContainer = document.getElementById('search-results');

    if (!searchBar || !resultsContainer) return;

    searchBar.addEventListener('input', function(e) {
        renderSearchResults(e.target.value.trim());
        // Expand bottom sheet on mobile when typing
        if (window.innerWidth <= 768 && sheetElement && sheetState === 'peek') {
            sheetElement.style.height = '';
            setSheetState('half');
        }
    });

    resultsContainer.addEventListener('click', function(e) {
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
                map.flyToBounds([label.coords], { padding, maxZoom: 19, duration: 1.2 });
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

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            renderSearchResults('');
        }
    });

    searchBar.addEventListener('keydown', function(e) {
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
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    currentHighlightedMarker = null;
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
        searchBar.addEventListener('input', function() {
            clearBtn.style.display = this.value.length > 0 ? 'block' : 'none';
        });

        clearBtn.addEventListener('click', function() {
            searchBar.value = '';
            renderSearchResults('');
            this.style.display = 'none';
            searchBar.focus();
        });
    }
}

// ===== MAP INIT =====

function setBaseView(view, persist) {
    const nextLayer = view === 'osm' ? regularLayer : satelliteLayer;
    const prevLayer = view === 'osm' ? satelliteLayer : regularLayer;

    if (map.hasLayer(prevLayer)) map.removeLayer(prevLayer);
    if (!map.hasLayer(nextLayer)) nextLayer.addTo(map);

    currentBaseView = view;
    applyLabelVisibility();
    if (persist) localStorage.setItem('kgbMapBaseLayer', view);

    const satelliteToggleCheckbox = document.getElementById('toggle-satellite-checkbox');
    if (satelliteToggleCheckbox) satelliteToggleCheckbox.checked = view === 'satellite';
}

function applyLabelVisibility() {
    const activeLabels = currentBaseView === 'satellite' ? satelliteLabelsLayer : regularLabelsLayer;
    const inactiveLabels = currentBaseView === 'satellite' ? regularLabelsLayer : satelliteLabelsLayer;

    if (map.hasLayer(inactiveLabels)) map.removeLayer(inactiveLabels);

    if (showLabels) {
        if (!map.hasLayer(activeLabels)) activeLabels.addTo(map);
    } else if (map.hasLayer(activeLabels)) {
        map.removeLayer(activeLabels);
    }
}

function setMarkersVisible(visible, persist) {
    map.getPane('campusMarkerPane').style.display = visible ? '' : 'none';
    map.getPane('campusTooltipPane').style.display = visible ? '' : 'none';
    if (persist) localStorage.setItem('kgbMapShowMarkers', visible);
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
        if (userLocationWatchId !== null) navigator.geolocation.clearWatch(userLocationWatchId);
        userLocationWatchId = null;
        if (userLocationMarker) { map.removeLayer(userLocationMarker); userLocationMarker = null; }
        if (userLocationAccuracyCircle) { map.removeLayer(userLocationAccuracyCircle); userLocationAccuracyCircle = null; }
        currentUserLocation = null;
        // Directions endpoints are coordinate snapshots, not live references —
        // an active two-point route stays valid regardless of watch state.
        if (!directionsModeActive) clearRoute();
    }
}

function updateUserLocationMarker(coords) {
    currentUserLocation = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy };
    const latlng = [coords.latitude, coords.longitude];
    const isFirstFix = !userLocationMarker;
    if (!userLocationMarker) {
        userLocationMarker = L.marker(latlng, {
            icon: L.divIcon({ className: 'user-location-dot', iconSize: [16, 16] }),
            pane: 'userLocationPane',
        }).addTo(map);
        userLocationAccuracyCircle = L.circle(latlng, {
            radius: coords.accuracy,
            className: 'user-location-accuracy',
            pane: 'userLocationPane',
        }).addTo(map);
    } else {
        userLocationMarker.setLatLng(latlng);
        userLocationAccuracyCircle.setLatLng(latlng);
        userLocationAccuracyCircle.setRadius(coords.accuracy);
    }
    // Focus the map on the very first fix after enabling GPS (mirrors clicking a
    // location in the list) — not on every subsequent watchPosition update, since
    // that would yank the camera around as the user moves.
    if (isFirstFix) focusMapOnUserLocation(latlng);
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
        map.flyToBounds([coords], { padding: padding, maxZoom: 19, duration: 1.2 });
    }
}

// ===== MY LOCATION BUTTON (desktop + mobile FAB) =====

// Desktop: stack the button directly above Leaflet's live-rendered zoom control,
// so it reads as part of the same control group regardless of the control's actual size.
function positionMyLocationButtonDesktop() {
    const btn = document.getElementById('my-location-btn');
    const zoomEl = document.querySelector('.leaflet-control-zoom');
    if (!btn || !zoomEl || window.innerWidth <= 768) return;
    const rect = zoomEl.getBoundingClientRect();
    btn.style.bottom = `${window.innerHeight - rect.top + 10}px`;
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

// ===== OSRM DIRECTIONS (EXPERIMENT) =====
// Public OSRM demo server — driving profile only (no foot/walking profile available).
async function drawOSRMRoute(fromCoords, toCoords) {
    if (!fromCoords || !toCoords) return null;
    clearRoute();
    const url = `https://router.project-osrm.org/route/v1/driving/${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}?overview=full&geometries=geojson`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (!data.routes || !data.routes.length) return null;
        const route = data.routes[0];
        const geometry = route.geometry;

        const glowLine = L.geoJSON(geometry, {
            pane: 'routeLinePane',
            style: { color: '#1967d2', weight: 10, opacity: 0.45, className: 'osrm-route-glow' },
        });
        const baseLine = L.geoJSON(geometry, {
            pane: 'routeLinePane',
            style: { color: '#1967d2', weight: 5, opacity: 0.9 },
        });
        const dashLine = L.geoJSON(geometry, {
            pane: 'routeLinePane',
            style: { color: '#ffffff', weight: 3, opacity: 0.95, dashArray: '1, 14', lineCap: 'round', className: 'osrm-route-dash' },
        });

        currentRouteLine = L.layerGroup([glowLine, baseLine, dashLine]).addTo(map);
        map.fitBounds(baseLine.getBounds(), { padding: [60, 60] });

        return { distance: route.distance, duration: route.duration };
    } catch (err) {
        console.warn('OSRM route fetch failed:', err);
        return null;
    }
}

function clearRoute() {
    if (currentRouteLine) { map.removeLayer(currentRouteLine); currentRouteLine = null; }
}

// ===== DIRECTIONS PANEL (TWO-POINT ROUTING) =====

function renderDirectionsPin(field, point) {
    const isStart = field === 'start';
    const existing = isStart ? directionsStartMarker : directionsEndMarker;
    if (existing) { map.removeLayer(existing); }

    const marker = L.marker(point.coords, {
        icon: L.divIcon({
            html: `<span class="material-symbols-outlined directions-pin directions-pin-${field}">location_on</span>`,
            className: '',
            iconSize: [28, 36],
            iconAnchor: [14, 36],
        }),
        pane: 'directionsPinPane',
    }).addTo(map);

    if (isStart) directionsStartMarker = marker;
    else directionsEndMarker = marker;
}

function clearDirectionsPins() {
    if (directionsStartMarker) { map.removeLayer(directionsStartMarker); directionsStartMarker = null; }
    if (directionsEndMarker) { map.removeLayer(directionsEndMarker); directionsEndMarker = null; }
}

function updateDirectionsRouteInfo(result) {
    const infoEl = document.getElementById('directions-route-info');
    if (!infoEl) return;
    if (result === 'loading') {
        infoEl.textContent = 'Mengira jarak...';
    } else if (result === null) {
        infoEl.textContent = '';
    } else {
        infoEl.textContent = `${(result.distance / 1000).toFixed(1)} km · ${Math.round(result.duration / 60)} minit (memandu)`;
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
        if (existing) { map.removeLayer(existing); }
        if (field === 'start') directionsStartMarker = null;
        else directionsEndMarker = null;
    }

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
            html += `
                <div class="search-result-item location" data-type="location" data-id="${loc.id}">
                    <div class="result-content">
                        <div class="result-title">${loc.number}: ${loc.place}${loc.shortForm ? ' (' + loc.shortForm + ')' : ''}</div>
                        <div class="result-subtitle">${loc.locationType || ''}</div>
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
    map = L.map('map', { minZoom: 15, maxZoom: 22, zoomControl: false, zoomSnap: 0.5 }).setView(
        isMobileInit ? [5.4030603222603855, 103.07978857810325] : [5.400403569715876, 103.07990647727662],
        isMobileInit ? 16 : 14
    );

    // Dedicated panes for campus markers/tooltips so they can be hidden as a group
    // without affecting explicitly-selected (exempt) markers, which use the default panes
    map.createPane('campusMarkerPane');
    map.getPane('campusMarkerPane').style.zIndex = 600;
    map.createPane('campusTooltipPane');
    map.getPane('campusTooltipPane').style.zIndex = 650;

    // GPS dot/accuracy circle and OSRM route line panes (experiment)
    map.createPane('userLocationPane');
    map.getPane('userLocationPane').style.zIndex = 650;
    map.createPane('routeLinePane');
    map.getPane('routeLinePane').style.zIndex = 450; // below campusMarkerPane(600) so route sits under pins

    // Directions start/end pin markers (above campusMarkerPane(600) and userLocationPane(650))
    map.createPane('directionsPinPane');
    map.getPane('directionsPinPane').style.zIndex = 700;

    // DEBUG: zoom level indicator
    const zoomDebug = document.createElement('div');
    zoomDebug.style.cssText = 'position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.7);color:white;padding:4px 8px;border-radius:4px;font-size:13px;z-index:9999;pointer-events:none;';
    zoomDebug.textContent = 'Zoom: ' + map.getZoom();
    document.body.appendChild(zoomDebug);
    map.on('zoomend', () => { zoomDebug.textContent = 'Zoom: ' + map.getZoom(); });
    // END DEBUG

    satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxNativeZoom: 19,
        maxZoom: 22,
    });

    regularLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxNativeZoom: 20,
        maxZoom: 22,
    });

    satelliteLabelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'shadowPane',
        maxNativeZoom: 20,
        maxZoom: 22,
    });

    regularLabelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'shadowPane',
        maxNativeZoom: 20,
        maxZoom: 22,
    });

    currentBaseView = localStorage.getItem('kgbMapBaseLayer') === 'osm' ? 'osm' : 'satellite';
    showLabels = localStorage.getItem('kgbMapShowLabels') !== 'false';
    setBaseView(currentBaseView, false);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    positionMyLocationButtonDesktop();

    const toggleSatelliteCheckbox = document.getElementById('toggle-satellite-checkbox');
    if (toggleSatelliteCheckbox) {
        toggleSatelliteCheckbox.checked = currentBaseView === 'satellite';
        toggleSatelliteCheckbox.addEventListener('change', (e) => {
            setBaseView(e.target.checked ? 'satellite' : 'osm', true);
        });
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

    // ===== MAP TEXT LABELS =====
    mapLabels.forEach(({ coords, text, fontSize, minZoom }) => {
        const marker = L.marker(coords, {
            icon: L.divIcon({
                className: '',
                html: `<div class="map-text-label">${text}</div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
            }),
            interactive: false,
            zIndexOffset: -1000,
        }).addTo(map);
        mapLabelRefs.push({ marker, fontSize: fontSize || 13, minZoom: minZoom || 16 });
    });

    function updateMapTextLabels() {
        const zoom = map.getZoom();
        mapLabelRefs.forEach(({ marker, fontSize, minZoom }) => {
            const el = marker.getElement();
            if (!el) return;
            const label = el.querySelector('.map-text-label');
            if (!label) return;
            if (zoom < minZoom) {
                label.style.opacity = '0';
                label.style.pointerEvents = 'none';
            } else {
                // Scale font from 60% at minZoom up to 100% at minZoom+3
                const t = (zoom - minZoom) / 3;
                const scale = 0.6 + 0.4 * Math.min(t, 1);
                label.style.fontSize = (fontSize * scale).toFixed(1) + 'px';
                label.style.opacity = '1';
            }
        });
    }

    map.on('zoomend', function() {
        updateMapTextLabels();
        updateMarkerModes();
    });
    updateMapTextLabels();
    // ===== END MAP TEXT LABELS =====

    map.on('click', function() {
        markers.forEach(m => { m._tooltipSticky = false; });
        document.querySelectorAll('.custom-tooltip-popup').forEach(tp => tp.classList.remove('expanded', 'tooltip-visible'));
        setMarkerHighlight(null);
        if (window.innerWidth <= 768 && sheetElement && sheetState !== 'peek') {
            sheetElement.style.height = '';
            setSheetState('peek');
        }
    });

    // ===== MOBILE ZOOM GESTURES (replaces Leaflet double-tap on mobile) =====
    // - Double tap (one finger, quick)          → zoom in at tap position
    // - Hold one finger + tap with second finger → zoom out
    if (window.innerWidth <= 768) {
        map.doubleClickZoom.disable();

        let lastTapTime = 0;
        let lastTapX = 0, lastTapY = 0;
        let doubleTapTimer = null;
        let secondTapLatLng = null;
        let firstFingerDownTime = 0;
        let secondFingerDownTime = 0;

        const mapEl = document.getElementById('map');

        mapEl.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const now = Date.now();
                const dx = touch.clientX - lastTapX;
                const dy = touch.clientY - lastTapY;
                firstFingerDownTime = now;
                secondFingerDownTime = 0;

                if (now - lastTapTime < 300 && Math.hypot(dx, dy) < 40) {
                    secondTapLatLng = map.containerPointToLatLng(
                        L.point(touch.clientX, touch.clientY)
                    );
                    doubleTapTimer = setTimeout(() => {
                        doubleTapTimer = null;
                        secondTapLatLng = null;
                    }, 300);
                    lastTapTime = 0;
                } else {
                    lastTapTime = now;
                    lastTapX = touch.clientX;
                    lastTapY = touch.clientY;
                }
            } else if (e.touches.length === 2) {
                secondFingerDownTime = Date.now();
                if (doubleTapTimer) {
                    clearTimeout(doubleTapTimer);
                    doubleTapTimer = null;
                    secondTapLatLng = null;
                }
            }
        }, { passive: true });

        mapEl.addEventListener('touchend', (e) => {
            const now = Date.now();

            // Quick double-tap → zoom in
            if (doubleTapTimer !== null) {
                clearTimeout(doubleTapTimer);
                doubleTapTimer = null;
                if (secondTapLatLng) {
                    map.setZoomAround(secondTapLatLng, map.getZoom() + 1);
                    secondTapLatLng = null;
                }
                return;
            }

            // Hold one finger + tap second finger → zoom out
            // Detects: 2→1 transition where second finger was tapped quickly (<300ms)
            // and first finger was held before second joined (>150ms gap)
            if (e.touches.length === 1 && secondFingerDownTime > 0) {
                const secondFingerDuration = now - secondFingerDownTime;
                const firstFingerHeldBefore = secondFingerDownTime - firstFingerDownTime;
                if (secondFingerDuration < 300 && firstFingerHeldBefore > 150) {
                    map.zoomOut(1);
                }
                secondFingerDownTime = 0;
            }
        });
    }
    // ===== END MOBILE ZOOM GESTURES =====

    fetch(`https://raw.githubusercontent.com/unija-info/unija-map/refs/heads/main/kgb/data/kgb-map/kgb-map.json?v=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
            mapData = processData(data);
            const countEl = document.getElementById('location-count');
            if (countEl) countEl.textContent = mapData.length;
            const menuCountEl = document.getElementById('menu-location-count');
            if (menuCountEl) menuCountEl.textContent = mapData.length;
            renderGroupedList();
            showAllLocations(true, false);
            handleDeepLink();
        })
        .catch(err => {
            console.error('Failed to load map data:', err);
            document.getElementById('company-list').innerHTML =
                '<p style="padding:20px;color:#DC143C;">Gagal memuatkan data peta. Sila muat semula halaman.</p>';
        });

    loadCampusBoundary();
}

// ===== CAMPUS BOUNDARY =====

function loadCampusBoundary() {
    // Coordinates sourced from OSM Way 1120569731 (UniSZA KGB campus) and stored locally
    // to avoid dependency on the unreliable Overpass API.
    const style = {
        color: '#1967d2',
        weight: 2.5,
        opacity: 100,
        fillColor: '#1967d2',
        fillOpacity: 0,
        interactive: false,
    };

    fetch('/kgb/data/campus-boundary.json')
        .then(res => res.json())
        .then(coords => {
            L.polygon(coords, style).addTo(map);
        })
        .catch(err => {
            console.warn('Campus boundary fetch failed:', err);
        });
}

// ===== VERSION & UPDATE INFO =====

async function fetchMapDataInfo() {
    const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

    function formatTarikhMalay(date) {
        const day  = HARI[date.getDay()];
        const dd   = String(date.getDate()).padStart(2, '0');
        const mm   = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${day} ${dd}/${mm}/${yyyy}`;
    }

    function timeAgoMalay(date) {
        const diffMs   = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs  = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays >= 1) return `${diffDays} hari lalu`;
        if (diffHrs  >= 1) {
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

    const versionEl   = document.getElementById('map-version');
    const kemaskiniEl = document.getElementById('map-kemaskini');

    if (versionResult.status === 'fulfilled' && versionResult.value) {
        const versiText = `Versi: ${versionResult.value}`;
        if (versionEl) versionEl.textContent = versiText;
        const menuVersionEl = document.getElementById('menu-version');
        if (menuVersionEl) menuVersionEl.textContent = versiText;
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

window.onload = function() {
    document.getElementById('show-all').onclick = showAllLocations;
    document.getElementById('toggle-all-groups').onclick = toggleAllGroups;
    document.getElementById('info-menu-btn').addEventListener('click', openInfoMenu);
    document.getElementById('info-menu-close').addEventListener('click', closeInfoMenu);
    document.getElementById('info-menu-backdrop').addEventListener('click', closeInfoMenu);
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
};

window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');

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
