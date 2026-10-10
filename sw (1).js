// Wheel Workshop service worker.
// Network-first: when online you always get the newest files; when offline it falls back to the saved copy.
// Bump VERSION only if you want to force-clear old saved copies.
const VERSION = 'wheel-v2';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  /* Network first, but never wait long: on a weak or unstable connection, use the saved copy after 3 seconds. */
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const net = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    net.catch(() => {});
    const saved = () => cache.match(req).then(r => r || cache.match('index.html'));
    try {
      return await Promise.race([net, new Promise((_, no) => setTimeout(no, 3000))]);
    } catch (err) {
      const r = await saved();
      return r || net;
    }
  })());
});
