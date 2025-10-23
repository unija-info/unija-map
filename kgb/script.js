document.addEventListener("DOMContentLoaded", () => {
    const dataUrl = 'https://raw.githubusercontent.com/unija-info/unija-map/refs/heads/main/kgb/data/map.json';

    // DOM ELEMENTS
    const quickLinksContainer = document.getElementById('quick-links');
    const locationListContainer = document.getElementById('location-list');
    const searchBar = document.getElementById('search-bar');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    // STATE MANAGEMENT
    let allLocations = [];
    let activeFilters = new Set();
    let searchQuery = '';

    /**
     * Toggles the visibility of the "Clear Selection" button.
     */
    function updateClearButtonVisibility() {
        const hasActiveFilters = activeFilters.size > 0 || searchQuery !== '';
        if (hasActiveFilters) {
            clearFiltersBtn.classList.remove('hidden');
        } else {
            clearFiltersBtn.classList.add('hidden');
        }
    }
    
    /**
     * Helper to generate a CSS class from a category name.
     */
    function getLabelClass(category) {
        if (!category) return 'label-uncategorized';
        return 'label-' + category.toString().toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-');
    }

    /**
     * Custom sorting for the initial (unfiltered) list.
     */
    function customSort(a, b) {
        const aIsNum = !isNaN(a.number);
        const bIsNum = !isNaN(b.number);
        if (aIsNum && !bIsNum) return -1;
        if (!aIsNum && bIsNum) return 1;
        if (aIsNum && bIsNum) return parseInt(a.number, 10) - parseInt(b.number, 10);
        return a.number.localeCompare(b.number);
    }

    /**
     * The main rendering function.
     */
    function renderLocations() {
        let filteredLocations = [...allLocations];
        const isFiltering = activeFilters.size > 0 || searchQuery !== '';

        if (!isFiltering) {
            locationListContainer.innerHTML = `<div class="initial-message">
                <h3>Pilih mana-mana kategori atau gunakan 'Search Bar' di atas untuk mencari lokasi.</h3>
            </div>`;
            return;
        }
        
        // Apply search query
        if (searchQuery) {
            filteredLocations = filteredLocations.filter(loc => {
                const query = searchQuery.toLowerCase();
                return (
                    // --- THIS IS THE NEW LINE ---
                    loc.number.toString().toLowerCase().includes(query) ||
                    // --- END OF NEW LINE ---
                    loc.place.toLowerCase().includes(query) ||
                    (loc.shortForm && loc.shortForm.toLowerCase().includes(query)) ||
                    (loc.details && loc.details.toLowerCase().includes(query))
                );
            });
        }
        
        // Apply category filters
        if (activeFilters.size > 0) {
            filteredLocations = filteredLocations.filter(loc => activeFilters.has(loc.locationType));
        }

        // Render the filtered results
        locationListContainer.innerHTML = '';
        if (filteredLocations.length === 0) {
            locationListContainer.innerHTML = '<p class="initial-message">No locations match your criteria.</p>';
        } else {
            filteredLocations.forEach(loc => {
                locationListContainer.appendChild(createLocationElement(loc));
            });
        }
    }

    /**
     * Creates a single location item's HTML element.
     */
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

    // --- INITIALIZATION ---
    fetch(dataUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            allLocations = data.sort(customSort);

            const categories = [...new Set(allLocations.map(loc => loc.locationType).filter(Boolean))].sort();
            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'filter-btn ' + getLabelClass(category);
                button.textContent = category;
                button.dataset.category = category;
                quickLinksContainer.appendChild(button);
            });

            renderLocations();
        })
        .catch(error => {
            console.error("Failed to load map data:", error);
            locationListContainer.innerHTML = `<p style="color: red;">Error: Could not load location data.</p>`;
        });

    // --- EVENT LISTENERS ---
    searchBar.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderLocations();
        updateClearButtonVisibility();
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
            updateClearButtonVisibility();
        }
    });

    clearFiltersBtn.addEventListener('click', () => {
        activeFilters.clear();
        searchBar.value = '';
        searchQuery = '';
        document.querySelectorAll('.filter-btn.active').forEach(btn => btn.classList.remove('active'));
        renderLocations();
        updateClearButtonVisibility();
    });
});
