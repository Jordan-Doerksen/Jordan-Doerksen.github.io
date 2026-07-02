// ==========================================================================
// SERVICE WORKER — makes the assistant installable + fully offline.
// Strategy: precache the whole app shell + content on install; serve
// stale-while-revalidate (instant from cache, refresh in the background).
// To force every client to refresh after a deploy, BUMP CACHE below.
// ==========================================================================

const CACHE = 'cror-v2';   // ← bump (v3, v4 …) whenever content/code changes, to push updates

const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './css/app.css',
  './js/main.js', './js/router.js', './js/reference.js', './js/search.js', './js/data.js',
  './js/signal.js', './js/drills.js', './js/progress.js', './js/progressview.js',
  './js/study.js', './js/guide.js', './js/tour.js', './js/footer-train.js', './js/schema.js',
  './content/index.js', './content/defs.js', './content/signals.js',
  './content/switching.js', './content/operating.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req);
    const network = fetch(req)
      .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => cached || (req.mode === 'navigate' ? cache.match('./index.html') : undefined));
    return cached || network;
  }));
});
