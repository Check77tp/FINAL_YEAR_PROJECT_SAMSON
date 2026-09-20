// Caches the app shell + same-origin static assets so the PWA installs and
// loads even when fully offline. Offline request DRAFTING (queuing a
// submission made while offline, syncing once back online) is handled in
// the React app itself, not here — see services/draftQueue.js and
// draftSync.js. That's deliberate: Background Sync (the API this file
// could otherwise use to retry in the background) isn't supported in
// Safari/iOS or Firefox, and students overwhelmingly use this on a phone,
// so the sync logic lives where it reliably works — in the page, via
// IndexedDB and the browser's `online` event.

const CACHE_NAME = 'hostel-maintenance-shell-v3';
const APP_SHELL = ['/', '/manifest.json', '/favicon.svg'];

// If the network hasn't answered a page load within this long, show the
// cached app shell instead — on a weak hostel connection an instant shell
// beats a blank screen. Long enough that a healthy connection still gets the
// freshest index.html.
const NAVIGATION_TIMEOUT_MS = 2500;

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

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

async function networkFirst(request, timeoutMs) {
  const cache = await caches.open(CACHE_NAME);
  const fromNetwork = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  // Race the network against the timeout; on timeout or failure fall back to
  // whatever was cached last (or the app shell for page navigations).
  const fallback = () => cache.match(request).then((cached) => cached || cache.match('/'));
  try {
    if (!timeoutMs) return await fromNetwork;
    return await Promise.race([
      fromNetwork,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
  } catch {
    const cached = await fallback();
    if (cached) return cached;
    return fromNetwork;
  }
}

// Strategy per request type (same-origin GET only — API calls go to a
// different origin, so they're never intercepted here):
//  - /assets/*  Vite's build output. File names contain a content hash, so a
//               given URL never changes → cache-first: instant on every
//               visit after the first, no network at all.
//  - page loads Network-first with a short timeout, falling back to the
//               cached shell (fresh when online, instant when slow/offline).
//  - the rest   Network-first (manifest, icons; also keeps the Vite dev
//               server from ever serving stale modules).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request).catch(() => caches.match('/')));
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, NAVIGATION_TIMEOUT_MS));
  } else {
    event.respondWith(networkFirst(request, 0));
  }
});

// ---------------------------------------------------------------------------
// Push notifications. The server (web-push) sends a JSON payload
// { title, body, url, tag }; this runs even when the app is closed, which is
// what makes it a real notification rather than an in-page banner.
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Hostel Maintenance', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      // Same tag = a newer notification about the same request replaces the
      // older one instead of stacking up.
      tag: data.tag,
      data: { url: data.url || '/' },
    })
  );
});

// Tapping a notification opens (or focuses) the app on the relevant page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
