// Self-destruct service worker. Replaces an earlier profile-cache SW that
// could pin stale Cache API entries across deploys for users who had it
// registered. Activating this SW clears all caches and unregisters itself,
// so the next page load uses the standard browser network stack only.
//
// Bumped name + simple body forces the browser update path to pick this up:
// previous SW called skipWaiting/clients.claim, so as soon as the browser
// fetches /service-worker.js (which it does on every navigation by spec),
// it installs this one, runs the install/activate handlers, and the old SW
// is gone.

const CACHE_NAME = 'circles-sw-killswitch-v1';

self.addEventListener('install', () => {
  // Take over immediately — don't wait for old tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Drop every Cache API store this origin has accumulated.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // 2. Claim open clients so the unregister below also affects this tab.
      await self.clients.claim();

      // 3. Unregister this SW. Subsequent navigations have no SW at all
      //    until/unless the app re-registers (which it doesn't).
      await self.registration.unregister();
    })()
  );
});

// No fetch handler on purpose — anything served from this SW would just be
// pass-through to the network; while activate is running we don't want to
// short-circuit any request paths.
