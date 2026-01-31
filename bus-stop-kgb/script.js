let map;
let markers = [];
let busData = [];
let isMapView = false;
let currentActiveCompany = null;
let currentSelectedStopId = null; // Track selected stop to prevent repeat animations
let currentInfoOverlayStopId = null; // Track info overlay to prevent repeat opens

// Image mapping: stop names to image filenames
function getStopImageFilename(stopName) {
    const mapping = {
        'Bus Stop HoSZA': 'hosza.png',
        'Bus Stop @ Jasa Pelangi': 'jasa-pelangi.png',
        'Sani Expres Terminal': 'sani.png',
        'Terminal Bus Telolet Darul lman': 'perdana.png',
        'Bus Stop/Wakaf Pintu Depan UniSZA': 'wakaf.png'
    };
    return mapping[stopName] || null;
}

// Open fullscreen image overlay
function openFullscreenImage(stopName, filename) {
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    overlay.innerHTML = `
        <button class="fullscreen-close" aria-label="Close">×</button>
        <img src="image/bus-stop/${filename}" alt="${stopName}">
        <p class="fullscreen-caption">${stopName}</p>
    `;
    overlay.onclick = (e) => {
        if (e.target === overlay || e.target.classList.contains('fullscreen-close')) {
            overlay.remove();
        }
    };
    document.body.appendChild(overlay);
}

// Show stop info overlay on sidebar
function showStopInfoOverlay(stopId) {
    // Skip if same overlay is already open
    if (currentInfoOverlayStopId === stopId) return;

    const stop = busData.find(s => s.id === stopId);
    if (!stop) return;

    // Remove existing overlay if any
    const existingOverlay = document.querySelector('.stop-info-overlay');
    if (existingOverlay) existingOverlay.remove();

    currentInfoOverlayStopId = stopId;

    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.coords[0]},${stop.coords[1]}`;
    const imageFilename = getStopImageFilename(stop.name);

    const overlay = document.createElement('div');
    overlay.className = 'stop-info-overlay';
    overlay.innerHTML = `
        <div class="info-overlay-header">
            <h3>${stop.name}</h3>
            <button class="info-overlay-close">×</button>
        </div>
        <div class="info-overlay-content">
            ${imageFilename
                ? `<div class="info-overlay-image" onclick="openFullscreenImage('${stop.name}', '${imageFilename}')">
                     <img src="image/bus-stop/${imageFilename}" alt="${stop.name}">
                   </div>`
                : `<div class="info-overlay-image no-image"></div>`
            }
            <a href="${googleUrl}" target="_blank" class="info-overlay-directions">
                Get Directions
            </a>
            <div class="info-overlay-companies">
                <h4>Operator Bas</h4>
                <ul>
                    ${stop.companies.map(c => `<li>${c}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    // Close button handler with animation
    overlay.querySelector('.info-overlay-close').onclick = () => {
        overlay.classList.add('closing');
        overlay.addEventListener('animationend', () => {
            overlay.remove();
            currentInfoOverlayStopId = null; // Reset so same stop can be opened again
        });
    };

    // Append to sidebar
    document.getElementById('sidebar').appendChild(overlay);

    // On mobile, expand bottom sheet to full height
    if (window.innerWidth <= 768 && sheetElement) {
        sheetElement.style.height = '';
        setSheetState('full');
    }
}

// Bottom sheet state management (mobile only)
let sheetState = 'peek'; // 'peek' (15%), 'half' (50%), 'full' (90%)

// Desktop sidebar state management
let desktopSidebarCollapsed = false;
let touchStartY = 0;
let touchCurrentY = 0;
let isDragging = false;
let sheetElement = null;
let sheetStartHeight = 0;  // Sheet height when drag started
let lastTouchY = 0;        // For velocity calculation

// Content area drag state (scroll-aware)
let scrollContainer = null;      // Reference to .company-list element
let scrollStartTop = 0;          // Scroll position when drag started
let gestureMode = null;          // 'scroll' | 'sheet' - determined on first move
let contentTouchStartY = 0;      // Touch start Y for content area

function initBottomSheet() {
    if (window.innerWidth > 768) return; // Desktop only

    sheetElement = document.getElementById('sidebar');
    const handleElement = document.querySelector('.sheet-handle');

    if (!sheetElement) return;

    // Create handle if it doesn't exist
    if (!handleElement) {
        const handle = document.createElement('div');
        handle.className = 'sheet-handle';
        handle.innerHTML = '<div class="handle-bar"></div>';
        sheetElement.insertBefore(handle, sheetElement.firstChild);
    }

    // Set initial state
    sheetElement.classList.add('sheet-peek');

    // Attach event listeners to handle
    const actualHandle = sheetElement.querySelector('.sheet-handle');

    // Touch events for swipe on handle
    actualHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
    actualHandle.addEventListener('touchmove', handleTouchMove, { passive: false });
    actualHandle.addEventListener('touchend', handleTouchEnd);

    // Click event for tap toggle (handle only)
    actualHandle.addEventListener('click', handleSheetTap);

    // Get references to header and content areas
    const headerElement = sheetElement.querySelector('.sidebar-header');
    scrollContainer = document.getElementById('company-list');

    // Attach touch events to header (always moves sheet, no scroll content)
    if (headerElement) {
        headerElement.addEventListener('touchstart', handleHeaderTouchStart, { passive: false });
        headerElement.addEventListener('touchmove', handleHeaderTouchMove, { passive: false });
        headerElement.addEventListener('touchend', handleHeaderTouchEnd);
    }

    // Attach touch events to company list (scroll-aware)
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

    // Store current sheet height
    sheetStartHeight = sheetElement.offsetHeight;

    // Disable CSS transition during drag for instant response
    sheetElement.style.transition = 'none';
}

function handleTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    touchCurrentY = e.touches[0].clientY;
    const deltaY = touchStartY - touchCurrentY;  // Positive = dragging up

    // Calculate new height
    let newHeight = sheetStartHeight + deltaY;

    // Clamp between min (15vh) and max (90vh)
    const minHeight = window.innerHeight * 0.15;
    const maxHeight = window.innerHeight * 0.90;
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    // Apply height directly for real-time feedback
    sheetElement.style.height = newHeight + 'px';

    // Track for velocity calculation
    lastTouchY = touchCurrentY;
}

function handleTouchEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    // Re-enable CSS transition for future animations (tap cycling)
    sheetElement.style.transition = '';

    // Keep the sheet at current position (no snapping)
    // The inline height style remains set from handleTouchMove

    // Update sheetState based on current position (for tap cycling to work)
    const currentHeight = sheetElement.offsetHeight;
    const vh = window.innerHeight;
    const heightPercent = (currentHeight / vh) * 100;

    // Determine closest state for tap cycling reference
    if (heightPercent < 32) {
        sheetState = 'peek';
    } else if (heightPercent < 70) {
        sheetState = 'half';
    } else {
        sheetState = 'full';
    }
}

function handleSheetTap(e) {
    // Clear any inline height from dragging
    sheetElement.style.height = '';

    // Tap cycles through states: peek -> half -> full -> peek
    if (sheetState === 'peek') {
        setSheetState('half');
    } else if (sheetState === 'half') {
        setSheetState('full');
    } else {
        setSheetState('peek');
    }
}

// Content area touch handlers (scroll-aware)
function handleContentTouchStart(e) {
    contentTouchStartY = e.touches[0].clientY;
    lastTouchY = contentTouchStartY;
    gestureMode = null;  // Reset - will be determined on first move

    // Store current scroll position
    if (scrollContainer) {
        scrollStartTop = scrollContainer.scrollTop;
    }

    // Store current sheet height
    sheetStartHeight = sheetElement.offsetHeight;
}

function handleContentTouchMove(e) {
    const currentY = e.touches[0].clientY;
    const deltaY = contentTouchStartY - currentY;  // Positive = dragging up, Negative = dragging down
    const isMovingUp = deltaY > 0;
    const isMovingDown = deltaY < 0;

    // Determine gesture mode on first significant move (if not yet set)
    if (gestureMode === null && Math.abs(deltaY) > 5) {
        if (isMovingDown) {
            // Dragging down: check if we can scroll up first
            if (scrollContainer && scrollContainer.scrollTop > 0) {
                gestureMode = 'scroll';  // Let native scroll handle it
            } else {
                gestureMode = 'sheet';   // Collapse the sheet
            }
        } else if (isMovingUp) {
            // Dragging up: expand sheet first if not at full
            if (sheetState !== 'full') {
                gestureMode = 'sheet';   // Expand the sheet
            } else {
                gestureMode = 'scroll';  // Sheet is full, allow scroll
            }
        }
    }

    // Execute based on gesture mode
    if (gestureMode === 'sheet') {
        e.preventDefault();  // Prevent scroll

        // Disable CSS transition during drag for instant response
        sheetElement.style.transition = 'none';
        isDragging = true;

        // Calculate new height
        let newHeight = sheetStartHeight + deltaY;

        // Clamp between min (15vh) and max (90vh)
        const minHeight = window.innerHeight * 0.15;
        const maxHeight = window.innerHeight * 0.90;
        newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

        // Apply height directly for real-time feedback
        sheetElement.style.height = newHeight + 'px';
    }
    // If gestureMode === 'scroll', do nothing - let native scroll happen

    lastTouchY = currentY;
}

function handleContentTouchEnd(e) {
    if (gestureMode === 'sheet' && isDragging) {
        isDragging = false;

        // Re-enable CSS transition
        sheetElement.style.transition = '';

        // Determine closest state based on current height
        const currentHeight = sheetElement.offsetHeight;
        const vh = window.innerHeight;
        const heightPercent = (currentHeight / vh) * 100;

        if (heightPercent < 32) {
            sheetState = 'peek';
        } else if (heightPercent < 70) {
            sheetState = 'half';
        } else {
            sheetState = 'full';
        }
    }

    // Reset gesture mode for next touch
    gestureMode = null;
}

// Header area touch handlers (always moves sheet, no scroll content)
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
    const vh = window.innerHeight;
    const heightPercent = (currentHeight / vh) * 100;

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

    // Remove all state classes
    sheetElement.classList.remove('sheet-peek', 'sheet-half', 'sheet-full');

    // Add new state class (CSS handles height via classes)
    // Note: No class for 'peek' - that's the default mobile .sidebar style
    if (newState === 'half') {
        sheetElement.classList.add('sheet-half');
    } else if (newState === 'full') {
        sheetElement.classList.add('sheet-full');
    }

    sheetState = newState;
}

// Desktop sidebar collapse/expand functionality
function initDesktopSidebar() {
    if (window.innerWidth <= 768) return; // Mobile uses bottom sheet

    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    const expandBtn = document.getElementById('sidebar-expand-btn');

    if (!sidebar || !collapseBtn || !expandBtn) return;

    // Collapse button click
    collapseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDesktopSidebar(true); // Collapse
    });

    // Expand button click
    expandBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleDesktopSidebar(false); // Expand
    });
}

function toggleDesktopSidebar(collapse) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || window.innerWidth <= 768) return;

    if (collapse === undefined) {
        collapse = !desktopSidebarCollapsed;
    }

    desktopSidebarCollapsed = collapse;

    if (collapse) {
        sidebar.classList.add('collapsed');
    } else {
        sidebar.classList.remove('collapsed');
    }
}

// Dynamic map padding based on sidebar state
function getMapPadding() {
    if (window.innerWidth <= 768) {
        return [100, 100]; // Mobile padding (higher = more zoomed out)
    }

    if (desktopSidebarCollapsed) {
        return [50, 50, 50, 80]; // Minimal left padding when collapsed
    } else {
        return [50, 50, 50, 420]; // Left padding for expanded sidebar
    }
}

// Search Results Dropdown - Google Maps Style
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

    // Search stops
    const matchingStops = busData.filter(stop =>
        stop.name.toLowerCase().includes(lowerTerm)
    );

    // Search companies (get unique company names)
    const allCompanies = [...new Set(busData.flatMap(stop => stop.companies))];
    const matchingCompanies = allCompanies.filter(company =>
        company.toLowerCase().includes(lowerTerm)
    );

    // Render stop results
    matchingStops.forEach(stop => {
        html += `
            <div class="search-result-item stop" data-type="stop" data-id="${stop.id}">
                <div class="result-content">
                    <div class="result-title">${stop.name}</div>
                    <div class="result-subtitle">${stop.companies.join(', ')}</div>
                </div>
            </div>
        `;
    });

    // Render company results with stop names
    matchingCompanies.forEach(company => {
        const companyStops = busData.filter(s => s.companies.includes(company));
        const stopsHtml = companyStops.map(s => `<div class="result-stop-item">• ${s.name}</div>`).join('');
        html += `
            <div class="search-result-item company" data-type="company" data-name="${company}">
                <div class="result-content">
                    <div class="result-title">${company}</div>
                    <div class="result-stops">${stopsHtml}</div>
                </div>
            </div>
        `;
    });

    // No results
    if (matchingStops.length === 0 && matchingCompanies.length === 0) {
        html = '<div class="no-results">No results found</div>';
    }

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('active');
}

function initSearchDropdown() {
    const searchBar = document.getElementById('search-bar');
    const resultsContainer = document.getElementById('search-results');

    if (!searchBar || !resultsContainer) return;

    // Search input handler
    searchBar.addEventListener('input', function(e) {
        renderSearchResults(e.target.value.trim());
    });

    // Click on result item
    resultsContainer.addEventListener('click', function(e) {
        const item = e.target.closest('.search-result-item');
        if (!item) return;

        const type = item.dataset.type;

        if (type === 'stop') {
            const stopId = parseInt(item.dataset.id);
            const stop = busData.find(s => s.id === stopId);
            if (stop) filterByStop(stop);
        } else if (type === 'company') {
            const companyName = item.dataset.name;
            filterByCompany(companyName);
        }

        // Clear search and hide dropdown
        searchBar.value = '';
        renderSearchResults('');

        // Hide clear button
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) clearBtn.style.display = 'none';
    });

    // Click outside to close dropdown
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            renderSearchResults('');
        }
    });

    // Escape to close
    searchBar.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            searchBar.value = '';
            renderSearchResults('');
            searchBar.blur();

            // Hide clear button
            const clearBtn = document.getElementById('clear-search');
            if (clearBtn) clearBtn.style.display = 'none';
        }
    });
}

function initMap() {
    // Detect mobile and adjust initial zoom
    const isMobile = window.innerWidth <= 768;
    const initialZoom = isMobile ? 14 : 14;

    map = L.map('map', { maxZoom: 25, zoomControl: false }).setView([5.3950, 103.0830], initialZoom);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxNativeZoom: 19,
        maxZoom: 22
    }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'shadowPane', maxNativeZoom: 20, maxZoom: 22
    }).addTo(map);

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Collapse any expanded tooltips when clicking on empty map space
    map.on('click', function() {
        document.querySelectorAll('.custom-tooltip-popup').forEach(tp => {
            tp.classList.remove('expanded');
        });
    });

    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            busData = data.stops;
            renderGroupedList();
            showAllStops();
        });
}

function renderGroupedList() {
    const container = document.getElementById('company-list');
    container.innerHTML = '';

    busData.forEach(stop => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'stop-group collapsed'; // Default closed

        const header = document.createElement('button');
        header.className = 'stop-header';
        header.innerHTML = `<span>${stop.name}</span>`;
        header.onclick = () => {
            groupDiv.classList.toggle('collapsed');
            // On desktop, also zoom to stop
            if (window.innerWidth > 768) {
                filterByStop(stop);
            }
        };

        // Create image container (appears when expanded)
        const imageContainer = document.createElement('div');
        imageContainer.className = 'stop-image-container';
        const imageFilename = getStopImageFilename(stop.name);

        if (imageFilename) {
            const img = document.createElement('img');
            img.src = `image/bus-stop/${imageFilename}`;
            img.alt = stop.name;
            img.onerror = () => {
                img.style.display = 'none';
                imageContainer.classList.add('no-image');
            };
            imageContainer.appendChild(img);
            imageContainer.onclick = (e) => {
                e.stopPropagation();
                openFullscreenImage(stop.name, imageFilename);
            };
        } else {
            imageContainer.classList.add('no-image');
        }

        // Create button row (separate from header, mobile only)
        const buttonRow = document.createElement('div');
        buttonRow.className = 'stop-map-btn-row';
        const seeMapBtn = document.createElement('button');
        seeMapBtn.className = 'see-on-map-btn';
        seeMapBtn.innerHTML = '📍 See on map';
        seeMapBtn.onclick = () => showStopOnMap(stop);
        buttonRow.appendChild(seeMapBtn);

        const subList = document.createElement('div');
        subList.className = 'company-sub-list';

        stop.companies.forEach(companyName => {
            const btn = document.createElement('button');
            btn.className = 'company-btn';
            btn.innerText = companyName;
            btn.onclick = (e) => {
                e.stopPropagation(); // Don't trigger stop header
                filterByCompany(companyName, btn);
            };
            subList.appendChild(btn);
        });

        groupDiv.appendChild(header);
        groupDiv.appendChild(imageContainer);
        groupDiv.appendChild(buttonRow);
        groupDiv.appendChild(subList);
        container.appendChild(groupDiv);
    });
}

// Desktop only: zoom to stop and show marker
function filterByStop(stop) {
    // Skip animation if same stop is already selected
    if (currentSelectedStopId === stop.id) {
        return;
    }

    currentSelectedStopId = stop.id;
    resetButtons();
    currentActiveCompany = null;
    clearMarkers();

    const basePadding = getMapPadding();
    const padding = [100, 100, 100, basePadding[3]];
    map.flyToBounds([stop.coords], { padding: padding, maxZoom: 18, duration: 1.2 });

    const marker = createMarker(stop, false);
    marker.openPopup();
    markers.push(marker);

    setTimeout(() => {
        const tooltipEl = marker.getTooltip() && marker.getTooltip().getElement();
        if (tooltipEl) {
            tooltipEl.classList.add('show-close-btn');
        }
    }, 100);
}

// Mobile-specific: zoom to stop and collapse sheet
function showStopOnMap(stop) {
    // Skip animation if same stop is already selected
    if (currentSelectedStopId === stop.id) {
        return;
    }

    currentSelectedStopId = stop.id;
    resetButtons();
    currentActiveCompany = null;
    clearMarkers();

    map.flyToBounds([stop.coords], { padding: [150, 150], maxZoom: 18, duration: 1.2 });

    const marker = createMarker(stop, false);
    marker.openPopup();
    markers.push(marker);

    setTimeout(() => {
        const tooltipEl = marker.getTooltip() && marker.getTooltip().getElement();
        if (tooltipEl) {
            tooltipEl.classList.add('show-close-btn');
        }
    }, 100);

    // Collapse sheet to peek
    if (sheetElement) {
        sheetElement.style.height = '';
        setSheetState('peek');
    }
}

function showAllStops() {
    clearMarkers();
    currentActiveCompany = null;
    currentSelectedStopId = null; // Reset so any stop can animate again
    const coords = [];
    busData.forEach(stop => {
        markers.push(createMarker(stop, false));
        coords.push(stop.coords);
    });
    // Use dynamic padding based on sidebar state
    const padding = getMapPadding();
    if(coords.length > 0) map.flyToBounds(coords, { padding: padding, maxZoom: 18 });
    resetButtons();

    // Collapse bottom sheet on mobile
    if (window.innerWidth <= 768 && sheetElement) {
        sheetElement.style.height = '';
        setSheetState('peek');
    }
}

function toggleAllGroups() {
    const allGroups = document.querySelectorAll('.stop-group');
    const toggleBtn = document.getElementById('toggle-all-groups');

    // Check if any group is collapsed
    const hasCollapsed = Array.from(allGroups).some(group => group.classList.contains('collapsed'));

    if (hasCollapsed) {
        // Expand all
        allGroups.forEach(group => group.classList.remove('collapsed'));
        toggleBtn.textContent = '📋 Tutup Semua Senarai';

        // On mobile, fully expand the bottom sheet to show all operators
        if (window.innerWidth <= 768 && sheetElement) {
            sheetElement.style.height = '';
            setSheetState('full');
        }
    } else {
        // Collapse all
        allGroups.forEach(group => group.classList.add('collapsed'));
        toggleBtn.textContent = '📋 Papar Semua Operator';
    }
}

function filterByCompany(companyName, btn) {
    const isAlreadyActive = (currentActiveCompany === companyName);
    currentSelectedStopId = null; // Reset stop tracking when filtering by company

    if (!isAlreadyActive) {
        resetButtons();
        // Set ALL buttons with this company name to active (since they might appear twice)
        document.querySelectorAll('.company-btn').forEach(b => {
            if(b.innerText === companyName) b.classList.add('active');
        });
        currentActiveCompany = companyName;

        const activeCoords = busData.filter(s => s.companies.includes(companyName)).map(s => s.coords);
        if (activeCoords.length > 0) {
            const isMobile = window.innerWidth <= 768;
            const basePadding = getMapPadding();
            const padding = isMobile ? [100, 100] : [100, 100, 100, basePadding[3]];
            map.flyToBounds(activeCoords, { padding: padding, duration: 1.2, maxZoom: 18 });
        }
    }

    clearMarkers();
    busData.forEach(stop => {
        if (stop.companies.includes(companyName)) {
            markers.push(createMarker(stop, true));
        }
    });

    // Show close button on all tooltips
    setTimeout(() => {
        markers.forEach(marker => {
            if (marker.getTooltip) {
                const tooltipEl = marker.getTooltip() && marker.getTooltip().getElement();
                if (tooltipEl) {
                    tooltipEl.classList.add('show-close-btn');
                }
            }
        });
    }, 100);

    // Collapse bottom sheet on mobile
    if (window.innerWidth <= 768 && sheetElement) {
        sheetElement.style.height = '';
        setSheetState('peek');
    }
}

function createMarker(stop, isSelected) {
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.coords[0]},${stop.coords[1]}`;
    
    if (isSelected) {
        const dot = L.divIcon({ className: 'ground-dot' });
        markers.push(L.marker(stop.coords, { icon: dot, zIndexOffset: -100 }).addTo(map));
    }

    const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], tooltipAnchor: [13, 20], shadowSize: [41, 41]
    });

    const marker = L.marker(stop.coords, { icon: defaultIcon });

    if (isSelected) {
        marker.on('add', () => {
            setTimeout(() => {
                const el = marker.getElement();
                if (el) el.classList.add('marker-selected');
            }, 10);
        });
    }

    marker.addTo(map);

    // Create permanent tooltip with stop name and button hidden by default
    const tooltipContent = `
        <div class="popup-content-wrapper">
            <button class="tooltip-close-btn" onclick="event.stopPropagation(); showAllStops();">×</button>
            <strong class="popup-stop-name">${stop.name}</strong>
            <div class="popup-buttons">
                <button class="tooltip-info-btn" data-stop-id="${stop.id}">i</button>
                <a href="${googleUrl}" target="_blank" class="popup-link" onclick="event.stopPropagation();">Get Directions</a>
            </div>
        </div>
    `;

    // Use tooltipPosition from data.json, default to 'right' if not specified
    const direction = stop.tooltipPosition || 'right';
    const offset = direction === 'left' ? [-35, -40] : [5, -40];  // Left tooltips: 15px left, Right: 5px right

    marker.bindTooltip(tooltipContent, {
        permanent: true,
        direction: direction,
        className: 'custom-tooltip-popup',
        offset: offset  // Adjusts based on direction: left uses negative offset
    });

    // Function to toggle tooltip expansion
    function toggleTooltipExpansion(tooltipEl) {
        const isExpanded = tooltipEl.classList.contains('expanded');

        // Collapse all tooltips first
        document.querySelectorAll('.custom-tooltip-popup').forEach(tp => {
            tp.classList.remove('expanded');
        });

        // Toggle this tooltip based on previous state
        if (!isExpanded) {
            tooltipEl.classList.add('expanded');
        }
    }

    // Toggle this marker's button on click
    marker.on('click', function(e) {
        L.DomEvent.stopPropagation(e);

        const tooltipEl = this.getTooltip() && this.getTooltip().getElement();
        if (tooltipEl) {
            toggleTooltipExpansion(tooltipEl);
        }
    });

    // Add click handler to tooltip element (marker is already on map at this point)
    setTimeout(() => {
        const tooltipEl = marker.getTooltip() && marker.getTooltip().getElement();
        if (tooltipEl && !tooltipEl._clickHandlerAdded) {
            tooltipEl._clickHandlerAdded = true;
            tooltipEl.addEventListener('click', function(e) {
                // Handle info button click
                const infoBtn = e.target.closest('.tooltip-info-btn');
                if (infoBtn) {
                    e.stopPropagation();
                    const stopId = parseInt(infoBtn.dataset.stopId);
                    showStopInfoOverlay(stopId);
                    return;
                }
                // Don't toggle if clicking on the close button or the directions link
                if (e.target.closest('.tooltip-close-btn') || e.target.closest('.popup-link')) {
                    return;
                }
                e.stopPropagation();
                toggleTooltipExpansion(tooltipEl);
            });
        }
    }, 50);

    return marker;
}

function clearMarkers() { markers.forEach(m => map.removeLayer(m)); markers = []; }
function resetButtons() { document.querySelectorAll('.company-btn').forEach(b => b.classList.remove('active')); }

document.getElementById('show-all').onclick = showAllStops;
document.getElementById('toggle-all-groups').onclick = toggleAllGroups;

function createClearSearchButton() {
    const searchContainer = document.querySelector('.search-container');
    if (!searchContainer) return;

    // Check if button already exists
    if (document.getElementById('clear-search')) return;

    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-search';
    clearBtn.className = 'clear-search-btn';
    clearBtn.style.display = 'none';
    clearBtn.setAttribute('aria-label', 'Clear search');
    clearBtn.textContent = '×';

    // Insert after search bar
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
            renderSearchResults(''); // Hide search dropdown
            this.style.display = 'none';
            searchBar.focus(); // Return focus to search bar
        });
    }
}

window.onload = function() {
    initMap();
    initBottomSheet();      // Mobile only
    initDesktopSidebar();   // Desktop only
    initSearchDropdown();   // Search results dropdown
    createClearSearchButton();
    initClearSearchButton();
};

// Re-initialize on window resize
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');

    if (window.innerWidth <= 768) {
        // Mobile: Use bottom sheet, remove desktop collapsed state
        initBottomSheet();
        if (sidebar) sidebar.classList.remove('collapsed');
    } else {
        // Desktop: Restore sidebar collapsed state if needed
        if (sidebar && desktopSidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }
    }
});