document.addEventListener("DOMContentLoaded", () => {
    const dataUrl = 'https://raw.githubusercontent.com/unija-info/unija-map/refs/heads/main/kgb/data/map.json';

    // DOM ELEMENTS
    const quickLinksContainer = document.getElementById('quick-links');
    const locationListContainer = document.getElementById('location-list');
    const searchBar = document.getElementById('search-bar');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const resultsCountContainer = document.getElementById('results-count');
    const backToTopBtn = document.getElementById('back-to-top-btn');
    
    // STATE MANAGEMENT
    let allLocations = [];
    let activeFilters = new Set();
    let searchQuery = '';
    let clearFiltersBtn = null;

    function updateClearFiltersButtonVisibility() {
        if (activeFilters.size > 0) {
            if (!clearFiltersBtn) createClearFiltersButton();
            clearFiltersBtn.classList.remove('hidden');
        } else {
            if (clearFiltersBtn) clearFiltersBtn.classList.add('hidden');
        }
    }

    function createClearFiltersButton() {
        clearFiltersBtn = document.createElement('button');
        clearFiltersBtn.id = 'clear-filters-btn';
        clearFiltersBtn.className = 'clear-filters-btn hidden';
        clearFiltersBtn.textContent = 'Clear Filters';
        quickLinksContainer.appendChild(clearFiltersBtn);

        clearFiltersBtn.addEventListener('click', () => {
            activeFilters.clear();
            document.querySelectorAll('.filter-btn.active').forEach(btn => btn.classList.remove('active'));
            renderLocations();
            updateClearFiltersButtonVisibility();
        });
    }

    function getLabelClass(category) {
        if (!category) return 'label-uncategorized';
        return 'label-' + category.toString().toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-');
    }

    function renderLocations() {
        let filteredLocations = [...allLocations];
        const isFiltering = activeFilters.size > 0 || searchQuery !== '';

        if (!isFiltering) {
            locationListContainer.innerHTML = `<div class="initial-message"><h3>Pilih mana-mana kategori atau gunakan 'Search Bar' di atas untuk mencari lokasi.</h3></div>`;
            resultsCountContainer.innerHTML = '';
            return;
        }
        
        if (searchQuery) {
            filteredLocations = filteredLocations.filter(loc => {
                const query = searchQuery.toLowerCase();
                return (
                    loc.number.toString().toLowerCase().includes(query) ||
                    loc.place.toLowerCase().includes(query) ||
                    (loc.shortForm && loc.shortForm.toLowerCase().includes(query)) ||
                    (loc.details && loc.details.toLowerCase().includes(query))
                );
            });
        }
        
        if (activeFilters.size > 0) {
            filteredLocations = filteredLocations.filter(loc => activeFilters.has(loc.locationType));
        }

        resultsCountContainer.textContent = `Memaparkan ${filteredLocations.length} lokasi.`;

        locationListContainer.innerHTML = '';
        if (filteredLocations.length === 0) {
            locationListContainer.innerHTML = '<div class="initial-message">Tiada lokasi yang sepadan dengan carian anda.</div>';
        } else {
            const locationsByCategory = filteredLocations.reduce((acc, loc) => {
                const category = loc.locationType || "Uncategorized";
                if (!acc[category]) acc[category] = [];
                acc[category].push(loc);
                return acc;
            }, {});

            Object.keys(locationsByCategory).sort().forEach(category => {
                const header = document.createElement('h3');
                header.className = 'category-header';
                header.textContent = category;
                locationListContainer.appendChild(header);
                locationsByCategory[category].forEach(loc => locationListContainer.appendChild(createLocationElement(loc)));
            });
        }
    }

    function createLocationElement(loc) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'location-item';
        const label = document.createElement('span');
        label.className = 'location-label ' + getLabelClass(loc.locationType);
        label.textContent = loc.locationType;
        const titleText = loc.shortForm && loc.shortForm.trim() !== '' ? `${loc.number}: ${loc.place} (${loc.shortForm})` : `${loc.number}: ${loc.place}`;
        const title = document.createElement('p');
        title.className = 'location-title';
        title.textContent = titleText;
        itemDiv.appendChild(label);
        itemDiv.appendChild(title);
        if (loc.details && loc.details.trim() !== '') {
            const details = document.createElement('p');
            details.className = 'location-details';
            details.textContent = `Info Tambahan: ${loc.details.trim()}`;
            itemDiv.appendChild(details);
        }
        const mapLink = document.createElement('p');
        mapLink.className = 'location-link';
        mapLink.innerHTML = `<a href="${loc.googleMapLink}" target="_blank" rel="noopener noreferrer">View on Google Maps</a>`;
        itemDiv.appendChild(mapLink);
        return itemDiv;
    }

    fetch(dataUrl)
        .then(response => { if (!response.ok) throw new Error(`HTTP error!`); return response.json(); })
        .then(data => {
            allLocations = data;
            const categories = [...new Set(allLocations.map(loc => loc.locationType).filter(Boolean))].sort();
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'filter-btn ' + getLabelClass(category);
                button.textContent = category;
                button.dataset.category = category;
                quickLinksContainer.appendChild(button);
            });
            createClearFiltersButton();
            renderLocations();
        })
        .catch(error => { console.error("Failed to load map data:", error); locationListContainer.innerHTML = `<p style="color: red;">Error: Could not load location data.</p>`; });

    searchBar.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        clearSearchBtn.classList.toggle('hidden', !searchQuery);
        renderLocations();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchBar.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        renderLocations();
    });

    quickLinksContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            const category = e.target.dataset.category;
            e.target.classList.toggle('active');
            if (activeFilters.has(category)) {
                activeFilters.delete(category);
            } else {
                activeFilters.add(category);
            }
            renderLocations();
            updateClearFiltersButtonVisibility();
        }
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
            backToTopBtn.classList.remove('hidden');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const directorySection = document.getElementById('directory');
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});