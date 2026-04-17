const CACHE_NAME = 'medical-pwa-v2'; // Bump version
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // claim clients immediately
  );
});

self.addEventListener('fetch', event => {
  // Network first strategy for everything to avoid stale JS chunks
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
