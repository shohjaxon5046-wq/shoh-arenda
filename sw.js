// =========================================================================
// WMS ARENDA ERP - PWA SERVICE WORKER
// =========================================================================

const CACHE_NAME = 'wms-arenda-v13.0';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.svg',
    './icons/icon-512.svg',
    './locales/uz.json',
    './locales/ru.json',
    './js/i18n.js',
    './js/data.js',
    './js/section1_kirim.js',
    './js/section1_wms_picking_putaway.js',
    './js/section2_catalog.js',
    './js/section3_crm_staff.js',
    './js/section4_partners.js',
    './js/section5_orders.js',
    './js/section6_finance.js',
    './js/section7_receipts.js',
    './js/section8_dashboard.js',
    './js/section9_ai_agent.js',
    './js/section11_service_calculator.js',
    './js/section12_mobile_scanner_bot.js',
    './js/app.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[ServiceWorker] Caching core PWA shell assets');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[ServiceWorker] Some assets could not be pre-cached:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[ServiceWorker] Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Skip non-GET or chrome-extension or external API requests
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request).then(response => {
            // Update cache dynamically with successful network responses
            if (response && response.status === 200 && response.type === 'basic') {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
            }
            return response;
        }).catch(() => {
            // Network failed, serve from cache
            return caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Fallback to index.html for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
