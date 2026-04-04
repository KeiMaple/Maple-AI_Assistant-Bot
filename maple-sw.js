// ════════════════════════════════════════════════════════
//  MAPLE — sw.js (Service Worker)
//  Makes Maple work as a PWA:
//    - Installable on phone and laptop home screens
//    - Works offline after first load
//    - Assets cached for instant load on re-open
// ════════════════════════════════════════════════════════

'use strict';

const CACHE_NAME = 'maple-v1';

// Files to cache for offline use
const CACHE_FILES = [
  './',
  './index.html',
  './style.css',
  './brain.js',
  './app.js',
  './manifest.json'
];

// ── Install: cache all app files ──────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES);
    })
  );
  // Take control immediately (don't wait for old SW to expire)
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache, fall back to network ─────
self.addEventListener('fetch', event => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache fresh responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // If offline and not cached, return the app shell
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
