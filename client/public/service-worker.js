// Caches the app shell + same-origin static assets so the PWA installs and
// loads even when fully offline. Offline request DRAFTING (queuing a
// submission made while offline, syncing once back online) is handled in
// the React app itself, not here — see services/draftQueue.js and
// draftSync.js. That's deliberate: Background Sync (the API this file
// could otherwise use to retry in the background) isn't supported in
// Safari/iOS or Firefox, and students overwhelmingly use this on a phone,
// so the sync logic lives where it reliably works — in the page, via
// IndexedDB and the browser's `online` event.

const CACHE_NAME = 'hostel-maintenance-shell-v2';
const APP_SHELL = ['/', '/manifest.json', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Network-first, falling back to cache — same-origin GET requests only.
// API calls always go to a different origin in this architecture (see
// CLAUDE.md's "client never talks to Supabase directly" / REST API rule),
// so they're never intercepted here regardless of dev vs. production.
// Network-first (rather than cache-first) means the app stays up to date
// whenever there's a connection, while still falling back to whatever was
// last cached when there isn't one — including hashed JS/CSS bundle files,
// which get added to the cache as they're fetched rather than needing to be
// known in advance.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseCopy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});
