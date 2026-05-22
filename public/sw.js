/* NUTRYX Service Worker (production-safe)
   - Caches navigation (index.html) and runtime static assets
   - Ignores cross-origin requests and any `/api` routes
   - Supports `SKIP_WAITING` message to activate new worker
*/

const CACHE_VERSION = 'v1';
const PRECACHE = `nutryx-precache-${CACHE_VERSION}`;
const RUNTIME = `nutryx-runtime-${CACHE_VERSION}`;
const PRECACHE_URLS = [ '/', '/index.html' ];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== PRECACHE && key !== RUNTIME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Only handle same-origin, non-API GET requests
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  // Navigation requests: network-first with cache fallback (SPA)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(PRECACHE).then(cache => cache.put(req, copy));
        }
        return response;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first, then network update
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const copy = response.clone();
        caches.open(RUNTIME).then(cache => cache.put(req, copy));
        return response;
      }).catch(() => {
        if (req.destination === 'image') {
          // Return an empty response for missing images instead of crashing
          return new Response('', { status: 404, statusText: 'Not Found' });
        }
        return caches.match('/index.html');
      });
    })
  );
});
