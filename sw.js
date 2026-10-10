import {publicAssets} from './src/public-assets.js';
const cacheName = 'cyper-public-v0.14.0';
const precache = ['/', ...publicAssets.filter(path => path !== '/sw.js')];
const allowed = new Set(precache);
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(cacheName);
  await cache.addAll(precache);
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('cyper-public-') && key !== cacheName) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Authenticated API responses and all private routes always go to the network.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !allowed.has(url.pathname) || url.search) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(url.pathname) || fetch(event.request);
  })());
});
