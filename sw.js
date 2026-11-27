/**
 * Al-Kalam Digital — Service Worker
 * Offline-first untuk halaman mushaf & data JSON
 */
const CACHE_NAME = 'alkalam-v176';
const DATA_CACHE = 'alkalam-data-v176';
const PAGE_CACHE = 'alkalam-pages-v176';
const IMG_CACHE = 'alkalam-img-v176';

// File yang di-cache saat install (app shell)
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/data.js',
  './js/app.js',
  './js/hifz.js',
  './assets/fonts/amiri-arabic-400.woff2',
  './assets/fonts/amiri-arabic-700.woff2',
  './assets/icons/icon-192.png',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== DATA_CACHE && key !== PAGE_CACHE && key !== IMG_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first for data, cache-first for app shell & pages
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET
  if (request.method !== 'GET') return;
  
  // Skip cross-origin (fonts, api)
  if (url.origin !== location.origin) {
    // Allow font requests to pass through
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      return;
    }
    // For API requests, network-only
    if (url.hostname.includes('quran') || url.hostname === 'everyayah.com' || url.hostname === 'cdn.jsdelivr.net') {
      return;
    }
    return;
  }
  
  // Gambar halaman mushaf -> cache-first permanen (sekali unduh, awet offline)
  if (url.pathname.includes('/data/pages/')) {
    event.respondWith(cacheFirstThenNetwork(request, IMG_CACHE));
    return;
  }

  // Data files (.json.gz) -> network-first, cache fallback
  if (url.pathname.endsWith('.json.gz')) {
    event.respondWith(networkFirstThenCache(request, DATA_CACHE));
    return;
  }

  // Halaman HTML -> network-first supaya pembaruan aplikasi langsung terpakai
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(networkFirstThenCache(request, PAGE_CACHE));
    return;
  }

  // App shell (js, css, manifest) -> network-first, cache sebagai cadangan offline.
  // Dengan begitu satu kali reload setelah deploy sudah memakai kode terbaru.
  event.respondWith(networkFirstThenCache(request, CACHE_NAME));
});

async function networkFirstThenCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    // revalidasi ke server: cegah cache HTTP lama (GitHub Pages max-age=600)
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Return offline fallback for data
    return new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
      statusText: 'Offline'
    });
  }
}

async function cacheFirstThenNetwork(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Optional: update cache in background
    fetch(request).then(response => {
      if (response.ok) cache.put(request, response);
    }).catch(() => {});
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    // Offline fallback for HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('./index.html');
    }
    throw err;
  }
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.delete(PAGE_CACHE);
    caches.delete(DATA_CACHE);
    caches.delete(IMG_CACHE);
  }
});

console.log('Al-Kalam SW loaded');