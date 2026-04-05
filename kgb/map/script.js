// ===== STATE =====
let map;
let markers = [];
let mapData = [];
let currentActiveCategory = null;
let currentSelectedLocationId = null;
let currentInfoOverlayLocationId = null;

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

function createMarkerIcon(location) {
    const bgColor = getCategoryColor(location.locationType);
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
        tooltipAnchor: [w / 2 + 2, -h / 2],
    });
}

function createMarker(location) {
    if (!location.coords) return null;

    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.coords[0]},${location.coords[1]}`;

    const icon = createMarkerIcon(location);
    const marker = L.marker(location.coords, { icon: icon });
    marker.addTo(map);

    const tooltipContent = `
        <div class="popup-content-wrapper">
            <button class="tooltip-close-btn">×</button>
            <strong class="popup-stop-name">${location.place}</strong>
            <div class="popup-buttons">
                <button class="tooltip-info-btn" data-location-id="${location.id}">i</button>
                <a href="${googleUrl}" target="_blank" class="popup-link" onclick="event.stopPropagation();">Arah</a>
            </div>
        </div>
    `;

    marker.bindTooltip(tooltipContent, {
        permanent: true,
        direction: 'right',
        className: 'custom-tooltip-popup',
        offset: [location.number.length >= 4 ? 24 : 18, 0],
    });

    // Wait for tooltip element to be in DOM
    setTimeout(() => {
        const tooltipEl = marker.getTooltip() && marker.getTooltip().getElement();
        if (!tooltipEl) return;

        // --- Hover: show/hide via class (marker hover) ---
        marker.on('mouseover', () => tooltipEl.classList.add('tooltip-visible'));
        marker.on('mouseout', () => {
            if (!marker._tooltipSticky) tooltipEl.classList.remove('tooltip-visible');
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
        }

        function closeSticky() {
            marker._tooltipSticky = false;
            tooltipEl.classList.remove('tooltip-visible', 'expanded');
        }

        marker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            if (marker._tooltipSticky) {
                closeSticky();
            } else {
                openSticky();
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

function showAllLocations(animate = true) {
    clearMarkers();
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
        if (animate) {
            map.flyTo([5.402700026344124, 103.08008886748964], 16);
        } else {
            map.setView([5.402700026344124, 103.08008886748964], 17.5);
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

    map.flyToBounds([location.coords], { padding: [150, 150], maxZoom: 19, duration: 1.2 });

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

    const existingOverlay = document.querySelector('.stop-info-overlay');
    if (existingOverlay) existingOverlay.remove();

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
        ? `<a href="${googleUrl}" target="_blank" class="info-overlay-directions">🗺️ Buka di Google Maps</a>`
        : '';

    const overlay = document.createElement('div');
    overlay.className = 'stop-info-overlay';
    overlay.innerHTML = `
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

    function closeOverlay() {
        overlay.classList.add('closing');
        overlay.addEventListener('animationend', () => {
            overlay.remove();
            currentInfoOverlayLocationId = null;
            showAllLocations();
        });
    }

    overlay.querySelector('.info-overlay-close').onclick = closeOverlay;
    overlay.querySelector('.info-overlay-back').onclick = closeOverlay;

    document.getElementById('sidebar').appendChild(overlay);

    // On mobile, expand bottom sheet to full height
    if (window.innerWidth <= 768 && sheetElement) {
        sheetElement.style.height = '';
        setSheetState('full');
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
    const toggleBtn = document.getElementById('toggle-all-groups');
    const hasCollapsed = Array.from(allGroups).some(g => g.classList.contains('collapsed'));

    if (hasCollapsed) {
        allGroups.forEach(g => g.classList.remove('collapsed'));
        toggleBtn.textContent = '📋 Tutup Semua Senarai';
        if (window.innerWidth <= 768 && sheetElement) {
            sheetElement.style.height = '';
            setSheetState('full');
        }
    } else {
        allGroups.forEach(g => g.classList.add('collapsed'));
        toggleBtn.textContent = '📋 Papar Semua Kategori';
    }
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
    map = L.map('map', { maxZoom: 22, zoomControl: false, zoomSnap: 0.5 }).setView([5.400403569715876, 103.07990647727662], 14);

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

    map.on('click', function() {
        markers.forEach(m => { m._tooltipSticky = false; });
        document.querySelectorAll('.custom-tooltip-popup').forEach(tp => tp.classList.remove('expanded', 'tooltip-visible'));
    });

    fetch(`https://raw.githubusercontent.com/unija-info/unija-map/refs/heads/main/kgb/data/map.json?v=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
            mapData = processData(data);
            renderGroupedList();
            showAllLocations();
        })
        .catch(err => {
            console.error('Failed to load map data:', err);
            document.getElementById('company-list').innerHTML =
                '<p style="padding:20px;color:#DC143C;">Gagal memuatkan data peta. Sila muat semula halaman.</p>';
        });
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
