let map;
let markers = [];
let busData = [];
let isMapView = false;
let currentActiveCompany = null;

// Bottom sheet state management (mobile only)
let sheetState = 'peek'; // 'peek' (15%), 'half' (50%), 'full' (90%)
let touchStartY = 0;
let touchCurrentY = 0;
let isDragging = false;
let sheetElement = null;

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

    // Attach event listeners
    const actualHandle = sheetElement.querySelector('.sheet-handle');

    // Touch events for swipe
    actualHandle.addEventListener('touchstart', handleTouchStart, { passive: false });
    actualHandle.addEventListener('touchmove', handleTouchMove, { passive: false });
    actualHandle.addEventListener('touchend', handleTouchEnd);

    // Click event for tap toggle
    actualHandle.addEventListener('click', handleSheetTap);
}

function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    isDragging = true;
}

function handleTouchMove(e) {
    if (!isDragging) return;

    e.preventDefault(); // Prevent page scroll while dragging
    touchCurrentY = e.touches[0].clientY;

    // Optional: Add visual feedback during drag
    const deltaY = touchStartY - touchCurrentY;
    // Can implement real-time sheet height adjustment here for smoother UX
}

function handleTouchEnd(e) {
    if (!isDragging) return;

    const deltaY = touchStartY - touchCurrentY;
    const velocity = Math.abs(deltaY);

    // Determine swipe direction and update state
    if (deltaY > 50) {
        // Swipe up
        if (sheetState === 'peek') {
            setSheetState('half');
        } else if (sheetState === 'half') {
            setSheetState('full');
        }
    } else if (deltaY < -50) {
        // Swipe down
        if (sheetState === 'full') {
            setSheetState('half');
        } else if (sheetState === 'half') {
            setSheetState('peek');
        }
    }

    isDragging = false;
}

function handleSheetTap(e) {
    // Tap cycles through states: peek -> half -> full -> peek
    if (sheetState === 'peek') {
        setSheetState('half');
    } else if (sheetState === 'half') {
        setSheetState('full');
    } else if (sheetState === 'full') {
        setSheetState('peek');
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

function initMap() {
    // Detect mobile and adjust initial zoom
    const isMobile = window.innerWidth <= 768;
    const initialZoom = isMobile ? 13 : 14;

    map = L.map('map', { maxZoom: 22, zoomControl: false }).setView([5.3950, 103.0830], initialZoom);

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

    // Hide any visible tooltip buttons when clicking on empty map space
    map.on('click', function() {
        document.querySelectorAll('.popup-link').forEach(btn => {
            btn.classList.add('popup-link-hidden');
        });
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
            createNoResultsMessage(); // Create after list is populated
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
        header.onclick = (e) => {
            // Toggle accordion
            groupDiv.classList.toggle('collapsed');
            // Zoom to stop
            filterByStop(stop);
        };

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
        groupDiv.appendChild(subList);
        container.appendChild(groupDiv);
    });
}

function filterByStop(stop) {
    resetButtons();
    currentActiveCompany = null;
    clearMarkers();

    // Zoom specifically to this stop (add left padding for sidebar on desktop)
    const padding = window.innerWidth > 768 ? [100, 100, 100, 420] : [150, 150];
    map.flyToBounds([stop.coords], { padding: padding, maxZoom: 18, duration: 1.2 });

    // Highlight this stop's marker
    const marker = createMarker(stop, false);
    marker.openPopup();
    markers.push(marker);
}

function showAllStops() {
    clearMarkers();
    currentActiveCompany = null;
    const coords = [];
    busData.forEach(stop => {
        markers.push(createMarker(stop, false));
        coords.push(stop.coords);
    });
    // Add left padding for sidebar on desktop
    const padding = window.innerWidth > 768 ? [50, 50, 50, 420] : [50, 50];
    if(coords.length > 0) map.flyToBounds(coords, { padding: padding, maxZoom: 18 });
    resetButtons();
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
    } else {
        // Collapse all
        allGroups.forEach(group => group.classList.add('collapsed'));
        toggleBtn.textContent = '📋 Papar Semua Operator';
    }
}

function filterByCompany(companyName, btn) {
    const isAlreadyActive = (currentActiveCompany === companyName);

    if (!isAlreadyActive) {
        resetButtons();
        // Set ALL buttons with this company name to active (since they might appear twice)
        document.querySelectorAll('.company-btn').forEach(b => {
            if(b.innerText === companyName) b.classList.add('active');
        });
        currentActiveCompany = companyName;

        const activeCoords = busData.filter(s => s.companies.includes(companyName)).map(s => s.coords);
        if (activeCoords.length > 0) {
            // Add left padding for sidebar on desktop
            const padding = window.innerWidth > 768 ? [100, 100, 100, 420] : [100, 100];
            map.flyToBounds(activeCoords, { padding: padding, duration: 1.2, maxZoom: 18 });
        }
    }

    clearMarkers();
    busData.forEach(stop => {
        if (stop.companies.includes(companyName)) {
            markers.push(createMarker(stop, true));
        }
    });
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
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41]
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
            <strong class="popup-stop-name">${stop.name}</strong>
            <a href="${googleUrl}" target="_blank" class="popup-link popup-link-hidden" onclick="event.stopPropagation();">Get Directions</a>
        </div>
    `;

    marker.bindTooltip(tooltipContent, {
        permanent: true,
        direction: 'top',
        className: 'custom-tooltip-popup',
        offset: isSelected ? [-14, -5] : [-14, -15]
    });

    // Toggle this marker's button on click
    marker.on('click', function(e) {
        L.DomEvent.stopPropagation(e);

        const tooltipEl = this.getTooltip() && this.getTooltip().getElement();
        if (tooltipEl) {
            const btn = tooltipEl.querySelector('.popup-link');
            if (btn) {
                // Check if THIS marker's button is hidden BEFORE hiding all buttons
                const isHidden = btn.classList.contains('popup-link-hidden');

                // Hide all buttons
                document.querySelectorAll('.popup-link').forEach(btn => {
                    btn.classList.add('popup-link-hidden');
                });

                // Collapse all tooltips
                document.querySelectorAll('.custom-tooltip-popup').forEach(tp => {
                    tp.classList.remove('expanded');
                });

                // Toggle this marker's button based on previous state
                if (isHidden) {
                    btn.classList.remove('popup-link-hidden');
                    tooltipEl.classList.add('expanded');
                } else {
                    btn.classList.add('popup-link-hidden');
                    tooltipEl.classList.remove('expanded');
                }
            }
        }
    });

    return marker;
}

function clearMarkers() { markers.forEach(m => map.removeLayer(m)); markers = []; }
function resetButtons() { document.querySelectorAll('.company-btn').forEach(b => b.classList.remove('active')); }

// Advanced Search: Handles stop names and company names
document.getElementById('search-bar').addEventListener('keyup', function(e) {
    const term = e.target.value.toLowerCase();

    // Auto-expand sheet to half when user types (mobile only)
    if (window.innerWidth <= 768 && term.length > 0 && sheetState === 'peek') {
        setSheetState('half');
    }

    let totalVisibleGroups = 0; // Track visible groups

    document.querySelectorAll('.stop-group').forEach(group => {
        const stopHeader = group.querySelector('.stop-header');
        const stopName = stopHeader ? stopHeader.innerText.toLowerCase() : '';
        const btns = group.querySelectorAll('.company-btn');

        // Check if stop name matches
        const stopMatches = stopName.includes(term);

        let hasVisibleCompany = false;

        btns.forEach(btn => {
            const companyName = btn.innerText.toLowerCase();
            // Show button if either stop name or company name matches
            if (stopMatches || companyName.includes(term)) {
                btn.style.display = 'block';
                hasVisibleCompany = true;
            } else {
                btn.style.display = 'none';
            }
        });

        // Hide entire stop group if no matches, otherwise show it
        group.style.display = hasVisibleCompany ? 'block' : 'none';

        // Count visible groups
        if (hasVisibleCompany) {
            totalVisibleGroups++;
        }

        // Auto-expand if searching and has matches
        if(term.length > 0 && hasVisibleCompany) {
            group.classList.remove('collapsed');
        }
    });

    // Show/hide "No results found" message
    const noResultsMsg = document.getElementById('no-results-message');
    if (noResultsMsg) {
        if (term.length > 0 && totalVisibleGroups === 0) {
            // Show message when search term exists but no results
            noResultsMsg.style.display = 'block';
        } else {
            // Hide message when not searching or when results exist
            noResultsMsg.style.display = 'none';
        }
    }
});

document.getElementById('show-all').onclick = showAllStops;
document.getElementById('toggle-all-groups').onclick = toggleAllGroups;

function createNoResultsMessage() {
    const companyList = document.getElementById('company-list');
    if (!companyList) return;

    // Check if message already exists
    if (document.getElementById('no-results-message')) return;

    const noResultsDiv = document.createElement('div');
    noResultsDiv.id = 'no-results-message';
    noResultsDiv.className = 'no-results-message';
    noResultsDiv.style.display = 'none';

    noResultsDiv.innerHTML = `
        <div class="no-results-icon">🔍</div>
        <p class="no-results-title">No results found</p>
        <p class="no-results-subtitle">Try different keywords or check spelling</p>
    `;

    // Insert at beginning of company list
    companyList.insertBefore(noResultsDiv, companyList.firstChild);
}

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
            searchBar.dispatchEvent(new Event('keyup')); // Trigger search update
            this.style.display = 'none';
            searchBar.focus(); // Return focus to search bar
        });
    }
}

window.onload = function() {
    initMap();
    initBottomSheet();
    createClearSearchButton();
    initClearSearchButton();
};

// Re-initialize bottom sheet on window resize
window.addEventListener('resize', function() {
    // Re-initialize bottom sheet if switching to/from mobile
    if (window.innerWidth <= 768) {
        initBottomSheet();
    }
});