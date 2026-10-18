// Weekly Planner service worker: keeps the app usable offline.
// Bump VERSION whenever you change any file, so iPads pick up the update.
const VERSION = 'lifetable-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pages: network first (so updates arrive), cache when offline.
// Everything else: cache first.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const origin = new URL(req.url).origin;
  // Firebase SDK files: cache after first load so the app opens offline.
  if (origin === 'https://www.gstatic.com' && req.url.includes('/firebasejs/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res;
    })));
    return;
  }
  if (origin !== location.origin) return; // Firestore and Auth traffic goes straight to Google
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
