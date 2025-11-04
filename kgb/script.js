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

    // --- FUNGSI UNTUK MENDAPATKAN TARIKH & MASA KEMAS KINI DARI GITHUB (FORMAT KHAS) ---

    async function fetchLastUpdateDates() {
        const REPO_OWNER = 'unija-info';
        const REPO_NAME = 'unija-map';
        const DATA_FILE_PATH = 'kgb/data/map.json';
        const MAP_IMAGE_PATH = 'kgb/file/02_Map-Unija-KGB.png'; // Pastikan laluan ini betul

        // Fungsi bantuan baharu untuk memformat tarikh dan masa mengikut format yang diminta
        const formatDateTime = (dateString) => {
            if (!dateString) return "Tidak tersedia";

            const date = new Date(dateString);
            
            // Menggunakan nama bulan dalam Bahasa Inggeris untuk sepadan dengan 'PM'
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            
            const day = date.getDate();
            const month = months[date.getMonth()];
            const year = date.getFullYear();

            let hours = date.getHours();
            const minutes = date.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';

            hours = hours % 12;
            hours = hours ? hours : 12; // jam '0' sepatutnya menjadi '12'

            // Tambah '0' di depan minit jika ia kurang dari 10 (cth: 05)
            const paddedMinutes = minutes < 10 ? '0' + minutes : minutes;

            const timeString = `${hours}:${paddedMinutes} ${ampm}`;

            return `${day} ${month} ${year}, ${timeString}`;
        };

        // Fungsi untuk mendapatkan tarikh commit terakhir bagi satu fail
        const getLastCommitDate = async (filePath) => {
            const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?path=${filePath}&per_page=1`;
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
                const commits = await response.json();
                if (commits.length > 0) {
                    return formatDateTime(commits[0].commit.committer.date);
                }
                return "Tidak tersedia";
            } catch (error) {
                console.error(`Failed to fetch update date for ${filePath}:`, error);
                return "Tidak tersedia";
            }
        };

        // Dapatkan kedua-dua tarikh
        const mapDate = await getLastCommitDate(MAP_IMAGE_PATH);
        const dataDate = await getLastCommitDate(DATA_FILE_PATH);

        // Kemas kini elemen di footer
        const mapDateElement = document.getElementById('map-update-date');
        const dataDateElement = document.getElementById('data-update-date');
        
        if (mapDateElement) mapDateElement.textContent = mapDate;
        if (dataDateElement) dataDateElement.textContent = dataDate;
    }

    // Panggil fungsi untuk memulakan proses
    fetchLastUpdateDates();
});