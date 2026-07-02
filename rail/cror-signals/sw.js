// ==========================================================================
// SERVICE WORKER — cache-first app shell so CROR Signals works fully offline
// (yards and tunnels have no signal). Bump CACHE on any release to refresh.
// ==========================================================================

const CACHE = 'cror-signals-v4';
const ASSETS = [
  './', './index.html', './css/app.css', './manifest.webmanifest',
  './js/main.js', './js/router.js', './js/store.js', './js/progress.js', './js/quizgen.js',
  './js/quiz.js', './js/build.js', './js/drill.js', './js/exam.js', './js/progressview.js',
  './js/about.js', './js/home.js', './js/learn.js', './js/onboarding.js', './js/audio.js',
  './js/signal.js', './js/data.js', './js/util.js', './content/aspects.js', './content/variants.js', './icons/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
