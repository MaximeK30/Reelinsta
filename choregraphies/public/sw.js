// Service worker minimal : rend le site installable (condition du menu Partager Android)
// et garde l'interface dispo hors ligne. L'API n'est jamais mise en cache.
const CACHE = 'choreo-v2';
const SHELL = ['/', '/index.html', '/app.js', '/style.css', '/share.html', '/manifest.webmanifest', '/icons/icon-192.png', '/fonts/bodoni-moda.woff2', '/fonts/bodoni-moda-italic.woff2', '/fonts/jost.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: u.pathname === '/share.html' })));
});
