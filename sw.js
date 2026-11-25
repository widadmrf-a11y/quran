const VERSION = 'nour-v3.0.0';
const SHELL_CACHE = `${VERSION}-shell`;
const API_CACHE   = `${VERSION}-api`;
const FONT_CACHE  = `${VERSION}-fonts`;

const SHELL_ASSETS = [
  './', './index.html', './manifest.json', './css/extra.css',
  './js/srs.js', './js/dashboard.js', './js/app.js',
  './icons/192.png', './icons/512.png', './icons/maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_ASSETS.map(async url => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (e) { console.warn('[SW] skip', url, e.message); }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname === 'api.aladhan.com') {
    event.respondWith(networkFirst(request, API_CACHE, 3000));
    return;
  }
  if (url.hostname === 'api.alquran.cloud') {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('./index.html')) || new Response('Hors-ligne', { status: 503 });
      }
    })());
    return;
  }
  event.respondWith(cacheFirst(request, SHELL_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(cacheName)).put(req, res.clone());
    return res;
  } catch { return new Response('', { status: 504 }); }
}

async function networkFirst(req, cacheName, timeoutMs = 4000) {
  const cache = await caches.open(cacheName);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(rej, timeoutMs, 'timeout'))
    ]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) ||
           new Response(JSON.stringify({ code: 503, offline: true }),
                        { headers: { 'Content-Type': 'application/json' } });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await network) || new Response('', { status: 504 });
}

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});