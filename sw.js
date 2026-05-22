const CACHE_NAME = 'nutryx-v1';
const ASSETS = [
  '/', '/index.html', '/src/main.jsx'
];

self.addEventListener('install', (e)=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>{ if(k!==CACHE_NAME) return caches.delete(k); }))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  const url = new URL(req.url);
  // Ignore cross-origin requests and any /api routes
  if(url.origin !== self.location.origin) return;
  if(url.pathname.startsWith('/api')) return;
  if(req.method !== 'GET') return;

  e.respondWith(caches.match(req).then(cached=>{
    if(cached) return cached;
    return fetch(req).then(res=>{
      if(!res || res.status !== 200 || res.type !== 'basic') return res;
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(req, clone));
      return res;
    }).catch(()=>caches.match('/index.html'));
  }));
});
