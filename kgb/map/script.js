// ===== STATE =====
let map;
let markers = [];
let mapData = [];
let currentActiveCategory = null;
let currentSelectedLocationId = null;
let currentInfoOverlayLocationId = null;
let currentHighlightedMarker = null;

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
];

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

function createMarker(location) {
    if (!location.coords) return null;

    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.coords[0]},${location.coords[1]}`;

    const mode = shouldShowFullMarker(location) ? 'full' : 'dot';
    const icon = createMarkerIcon(location, mode);
    const marker = L.marker(location.coords, { icon: icon });
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
    marker.bindTooltip(tooltipContent, {
        permanent: true,
        direction: isMobile ? 'top' : 'right',
        className: 'custom-tooltip-popup',
        offset: isMobile ? [0, -5] : [location.number.length >= 4 ? 24 : 18, 0],
    });

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
        header.innerHTML = `<span>${categoryName}</span>`;
        header.onclick = () => {
            const isCollapsed = groupDiv.classList.contains('collapsed');
            // Collapse all other groups first
            document.querySelectorAll('.stop-group').forEach(g => g.classList.add('collapsed'));
            // Toggle this group
            if (isCollapsed) groupDiv.classList.remove('collapsed');
            if (window.innerWidth > 768) {
                filterByCategory(categoryName);
            }
            updateToggleButtonLabel();
        };

        // Mobile "See on map" button row
        const buttonRow = document.createElement('div');
        buttonRow.className = 'stop-map-btn-row';
        const seeMapBtn = document.createElement('button');
        seeMapBtn.className = 'see-on-map-btn';
        seeMapBtn.innerHTML = '📍 Lihat di peta';
        seeMapBtn.onclick = () => {
            filterByCategory(categoryName);
            if (sheetElement) {
                sheetElement.style.height = '';
                setSheetState('peek');
            }
        };
        buttonRow.appendChild(seeMapBtn);

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
        groupDiv.appendChild(buttonRow);
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

function showAllLocations(animate = true) {
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
    const basePadding = getMapPadding();
    const padding = isMobile ? [100, 100] : basePadding;
    if (coords.length > 0) map.flyToBounds(coords, { padding: padding, maxZoom: 18, duration: 1.2 });

    // Collapse bottom sheet on mobile
    if (window.innerWidth <= 768 && sheetElement) {
        sheetElement.style.height = '';
        setSheetState('peek');
    }
}

function filterByLocation(location) {
    if (!location.coords) return;
    if (currentSelectedLocationId === location.id) return;

    currentSelectedLocationId = location.id;
    currentActiveCategory = null;
    document.querySelectorAll('.stop-header').forEach(h => h.classList.remove('category-active'));

    clearMarkers();
    const m = createMarker(location);
    if (m) markers.push(m);

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
    const m = createMarker(location);
    if (m) markers.push(m);

    flyToMarker(location.coords);

    if (sheetElement) {
        sheetElement.style.height = '';
        setSheetState('peek');
    }
}

// ===== INFO OVERLAY =====

function showLocationInfoOverlay(locationId) {
    if (currentInfoOverlayLocationId === locationId) return;

    const location = mapData.find(l => l.id === locationId);
    if (!location) return;

    currentInfoOverlayLocationId = locationId;

    const bgColor = getCategoryColor(location.locationType);
    const textColor = getCategoryTextColor(location.locationType);
    const googleUrl = location.googleMapLink || '#';

    let detailRowsHtml = '';

    if (location.locationType && location.locationType.trim()) {
        detailRowsHtml += `
            <div class="info-overlay-detail-row">
                <span class="info-overlay-detail-label">Kategori</span>
                <span class="info-overlay-detail-value">${location.locationType}</span>
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
            ${detailRowsHtml ? `<div class="info-overlay-details">${detailRowsHtml}</div>` : ''}
            ${directionsHtml}
        </div>
    `;

    function wireButtons(overlayEl) {
        // × — fully reset: close overlay + show all locations
        function closeOverlay() {
            overlayEl.classList.add('closing');
            overlayEl.addEventListener('animationend', () => {
                overlayEl.remove();
                currentInfoOverlayLocationId = null;
                showAllLocations();
            });
        }
        // ← — dismiss only: close overlay, keep current map state
        function dismissOverlay() {
            overlayEl.classList.add('closing');
            overlayEl.addEventListener('animationend', () => {
                overlayEl.remove();
                currentInfoOverlayLocationId = null;
            });
        }
        overlayEl.querySelector('.info-overlay-close').onclick = closeOverlay;
        overlayEl.querySelector('.info-overlay-back').onclick = dismissOverlay;
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
    const matchingLocations = mapData.filter(loc =>
        (loc.number || '').toLowerCase().includes(lowerTerm) ||
        (loc.place || '').toLowerCase().includes(lowerTerm) ||
        (loc.shortForm || '').toLowerCase().includes(lowerTerm) ||
        (loc.details || '').toLowerCase().includes(lowerTerm) ||
        (loc.locationType || '').toLowerCase().includes(lowerTerm)
    );

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

function clearMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
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

function initMap() {
    const isMobileInit = window.innerWidth <= 768;
    map = L.map('map', { minZoom: 15, maxZoom: 22, zoomControl: false, zoomSnap: 0.5 }).setView(
        isMobileInit ? [5.4030603222603855, 103.07978857810325] : [5.400403569715876, 103.07990647727662],
        isMobileInit ? 16 : 14
    );

    // DEBUG: zoom level indicator
    const zoomDebug = document.createElement('div');
    zoomDebug.style.cssText = 'position:fixed;bottom:10px;right:10px;background:rgba(0,0,0,0.7);color:white;padding:4px 8px;border-radius:4px;font-size:13px;z-index:9999;pointer-events:none;';
    zoomDebug.textContent = 'Zoom: ' + map.getZoom();
    document.body.appendChild(zoomDebug);
    map.on('zoomend', () => { zoomDebug.textContent = 'Zoom: ' + map.getZoom(); });
    // END DEBUG

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxNativeZoom: 19,
        maxZoom: 22,
    }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'shadowPane',
        maxNativeZoom: 20,
        maxZoom: 22,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

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

    fetch(`https://raw.githubusercontent.com/unija-info/unija-map/refs/heads/main/kgb/data/kgb-map.json?v=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
            mapData = processData(data);
            const countEl = document.getElementById('location-count');
            if (countEl) countEl.textContent = mapData.length;
            renderGroupedList();
            showAllLocations();
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
        fillOpacity: 0.06,
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
        fetch(`https://api.github.com/repos/unija-info/unija-map/commits?path=kgb/data/kgb-map.json&per_page=1`)
            .then(r => r.json())
            .then(commits => commits.length > 0 ? new Date(commits[0].commit.committer.date) : null)
    ]);

    const versionEl   = document.getElementById('map-version');
    const kemaskiniEl = document.getElementById('map-kemaskini');

    if (versionEl && versionResult.status === 'fulfilled' && versionResult.value) {
        versionEl.textContent = `Versi: ${versionResult.value}`;
    }

    if (kemaskiniEl && commitResult.status === 'fulfilled' && commitResult.value) {
        const date = commitResult.value;
        kemaskiniEl.textContent = `Kemaskini: ${formatTarikhMalay(date)} (${timeAgoMalay(date)})`;
    }
}

// ===== EVENT WIRING =====

// ===== INIT =====

window.onload = function() {
    document.getElementById('show-all').onclick = showAllLocations;
    document.getElementById('toggle-all-groups').onclick = toggleAllGroups;
    initMap();
    initBottomSheet();
    initDesktopSidebar();
    initSearchDropdown();
    createClearSearchButton();
    initClearSearchButton();
    fetchMapDataInfo();
};

window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');

    if (window.innerWidth <= 768) {
        initBottomSheet();
        if (sidebar) sidebar.classList.remove('collapsed');
    } else {
        if (sidebar && desktopSidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }
    }
});
