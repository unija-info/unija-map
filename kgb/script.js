document.addEventListener("DOMContentLoaded", () => {
    const dataUrl = `https://raw.githubusercontent.com/unija-info/unija-map/refs/heads/main/kgb/data/map.json?v=${new Date().getTime()}`;

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
                    (loc.number || '').toString().toLowerCase().includes(query) ||
                    (loc.place || '').toLowerCase().includes(query) ||
                    (loc.shortForm || '').toLowerCase().includes(query) ||
                    (loc.details || '').toLowerCase().includes(query)
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
                
                locationsByCategory[category].sort(customSort);
                
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
            // Gunakan innerHTML untuk memasukkan tag <br> (line break)
            details.innerHTML = `Info Tambahan:<br>${loc.details.trim()}`;
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
            allLocations = data.sort(customSort);
            
            let categories = [...new Set(allLocations.map(loc => loc.locationType).filter(Boolean))];

            // --- NEW: CUSTOM SORTING FOR CATEGORY BUTTONS ---
            const desiredOrder = [
                "PENTADBIRAN & PTJ",
                "BLOK AKADEMIK & KELAS",
                "BLOK FAKULTI & PUSAT PENGAJIAN",
                "KOLEJ KEDIAMAN",
                "PUSAT AKTIVITI",
                "SUKAN & REKREASI",
                "CAFE & MAKANAN",
                "KESIHATAN",
                "IBADAH"
            ];

            categories.sort((a, b) => {
                let indexA = desiredOrder.indexOf(a);
                let indexB = desiredOrder.indexOf(b);
                // If a category is not in our list, push it to the end
                if (indexA === -1) indexA = Infinity;
                if (indexB === -1) indexB = Infinity;
                return indexA - indexB;
            });
            // --- END OF NEW LOGIC ---

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
        if (directorySection) {
            directorySection.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});