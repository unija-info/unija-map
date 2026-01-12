let map;
let markers = [];
let busData = [];
let isMapView = false;
let currentActiveCompany = null;

function initMap() {
    // 1. Set the map's overall max zoom to 22 (allowing deeper zoom)
    map = L.map('map', {
        maxZoom: 22 
    }).setView([5.3950, 103.0830], 14);

    // 2. Update the Satellite Layer with maxNativeZoom
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxNativeZoom: 19, // The highest level where real photos exist
        maxZoom: 22        // How far the user can actually zoom (digital zoom)
    }).addTo(map);

    // 3. Update the Labels Layer as well
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'shadowPane',
        maxNativeZoom: 20,
        maxZoom: 22
    }).addTo(map);

    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            busData = data.stops;
            renderCompanyList();
            showAllStops();
        });
}

function renderCompanyList() {
    const companySet = new Set();
    busData.forEach(stop => stop.companies.forEach(c => companySet.add(c)));
    const container = document.getElementById('company-list');
    Array.from(companySet).sort().forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'company-btn';
        btn.innerText = name;
        btn.onclick = () => filterByCompany(name, btn);
        container.appendChild(btn);
    });
}

function showAllStops() {
    clearMarkers();
    currentActiveCompany = null;
    const coords = [];
    busData.forEach(stop => {
        markers.push(createMarker(stop, false));
        coords.push(stop.coords);
    });
    if(coords.length > 0) map.flyToBounds(coords, { padding: [50, 50] });
    resetButtons();
}

function filterByCompany(companyName, btn) {
    const isAlreadyActive = (currentActiveCompany === companyName);

    // Camera move only if company is different
    if (!isAlreadyActive) {
        resetButtons();
        btn.classList.add('active');
        currentActiveCompany = companyName;

        const activeCoords = busData.filter(s => s.companies.includes(companyName)).map(s => s.coords);
        if (activeCoords.length > 0) {
            map.flyToBounds(activeCoords, { padding: [100, 100], duration: 1.2 });
        }
    }

    // Always clear and re-add markers to restart animation
    clearMarkers();
    busData.forEach(stop => {
        if (stop.companies.includes(companyName)) {
            markers.push(createMarker(stop, true));
        }
    });

    if (window.innerWidth <= 768 && !isAlreadyActive) toggleMobileView();
}

function createMarker(stop, shouldBounce) {
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${stop.coords[0]},${stop.coords[1]}`;
    
    // Define the default icon explicitly to ensure the anchor is at the bottom tip
    const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41], // This points the tip EXACTLY at the coordinate
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
    });

    const marker = L.marker(stop.coords, { icon: defaultIcon });

    if (shouldBounce) {
        marker.on('add', function() {
            setTimeout(() => {
                const el = marker.getElement();
                if (el) {
                    el.classList.remove('marker-bounce');
                    void el.offsetWidth; 
                    el.classList.add('marker-bounce');
                }
            }, 10);
        });
    }

    marker.addTo(map);

    marker.bindTooltip(stop.name, {
        permanent: true,
        direction: 'top',
        className: 'leaflet-tooltip-own',
        offset: [0, -10]
    });

    marker.bindPopup(`
        <div style="text-align:center">
            <strong>${stop.name}</strong><br>
            <a href="${googleUrl}" target="_blank" class="popup-link">Get Directions</a>
        </div>
    `);

    return marker;
}

function clearMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
}

function resetButtons() {
    document.querySelectorAll('.company-btn').forEach(b => b.classList.remove('active'));
}

function toggleMobileView() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-view');
    isMapView = !isMapView;
    sidebar.classList.toggle('hidden', isMapView);
    toggleBtn.innerText = isMapView ? "Show List" : "Show Map";
    setTimeout(() => map.invalidateSize(), 300);
}

document.getElementById('search-bar').addEventListener('keyup', function(e) {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.company-btn').forEach(btn => {
        btn.style.display = btn.innerText.toLowerCase().includes(term) ? 'block' : 'none';
    });
});

document.getElementById('toggle-view').onclick = toggleMobileView;
document.getElementById('show-all').onclick = showAllStops;
window.onload = initMap;