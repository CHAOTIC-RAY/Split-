const CACHE_NAME = 'split-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now, just enough to make it installable
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
