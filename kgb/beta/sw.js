const CACHE_NAME = 'unija-map-cache-v1';
const APP_SHELL_FILES = [
    // Laman KGB
    '/kgb/',
    '/kgb/index.html',
    '/kgb/info.html',
    '/kgb/feedback.html',
    '/kgb/style.css',
    '/kgb/script.js',
    '/kgb/data/map.json',
    // Ikon & Manifest
    '/media/favicon/favicon.ico',
    '/media/favicon/favicon.svg',
    '/media/favicon/android-chrome-192x192.png',
    // Imej & Logo
    'https://view.unija.info/media/logo/unija-info.png',
    'https://view.unija.info/map/KGB/02_Map-Unija-KGB.png',
    // Fon Google
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap',
    'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2'
];

// Peristiwa 'install': Simpan semua fail App Shell ke dalam cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache and caching app shell');
                return cache.addAll(APP_SHELL_FILES).catch(err => {
                    console.error('Failed to cache one or more app shell files:', err);
                });
            })
    );
});

// Peristiwa 'fetch': Layan fail dari cache jika offline (strategi Network First)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Jika berjaya, simpan salinan baharu di cache
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // Jika gagal (offline), cuba dapatkan dari cache
                return caches.match(event.request);
            })
    );
});

// Peristiwa 'activate': Bersihkan cache lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});