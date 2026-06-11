// Kill-switch service worker.
// Replaces the previously-deployed Workbox SW at /sw.js so already-installed
// browsers evict it on next visit. Deletes only Workbox-owned caches so any
// other origin caches (e.g. push messaging) are left alone, then unregisters
// itself in `finally` to ensure cleanup even if a step fails.

function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)supabase-cache|(^|-)googleAnalytics-/.test(name);
  return hasWorkboxBucket;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const workboxCacheNames = cacheNames.filter(isWorkboxCacheForThisRegistration);
        await Promise.allSettled(workboxCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();
        // NOTE: Do NOT call client.navigate() here.
        // On iOS Safari, calling client.navigate() from a service worker
        // causes a permanent blank white screen. The SW unregistration below
        // is sufficient — the next user-initiated navigation will work correctly.
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);
