// Offline support: network-first (always fresh when online), cache fallback when offline.
const CACHE = 'wardrobe-v2';
const FILES = [
  './', './index.html', './styles.css', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './vendor/fflate.js', './fonts/archivo-wdth.woff2',
  './src/app.js', './src/photo.js',
  './src/core/colours.js', './src/core/occasions.js', './src/core/rules.js',
  './src/core/taste.js', './src/core/generator.js', './src/core/backup.js',
  './src/data/db.js',
  './src/ui/install-prompt.js', './src/ui/wardrobe.js', './src/ui/item-editor.js',
  './src/ui/outfit.js', './src/ui/train.js', './src/ui/settings.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
