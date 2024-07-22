const CACHE_NAME = 'profile-cache-v1';
const MAX_CACHE_SIZE = 50; // Max number of items in the cache

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.hostname === "chiado-rpc.aboutcircles.com" && url.port === "3000") {
        if (url.pathname === "/get") {
            console.log("Handling single profile request for: " + event.request.url);
            event.respondWith(handleProfileRequest(event.request));
        }
    }
});

async function handleProfileRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const now = Date.now();

    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        console.log("Found cached response for: " + request.url);
        const cachedData = await cachedResponse.json();
        // Update usage timestamp
        await updateCacheTimestamp(cache, request, cachedData.profile, now);
        return new Response(JSON.stringify(cachedData.profile), { headers: { 'Content-Type': 'application/json' } });
    }

    console.log("No valid cached response found for: " + request.url);
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
        const profile = await networkResponse.clone().json();
        // Add new data to cache
        await addToCache(cache, request, profile, now);
        return networkResponse;
    }

    return cachedResponse || networkResponse;
}

async function addToCache(cache, request, profile, timestamp) {
    const cacheItems = await cache.keys();
    if (cacheItems.length >= MAX_CACHE_SIZE) {
        // Clean up least recently used cache items
        await cleanupCache(cache, cacheItems);
    }
    const cacheData = { profile, timestamp };
    await cache.put(request, new Response(JSON.stringify(cacheData), { headers: { 'Content-Type': 'application/json' } }));
}

async function updateCacheTimestamp(cache, request, profile, timestamp) {
    const cacheData = { profile, timestamp };
    await cache.put(request, new Response(JSON.stringify(cacheData), { headers: { 'Content-Type': 'application/json' } }));
}

async function cleanupCache(cache, cacheItems) {
    let oldestRequest = null;
    let oldestTimestamp = Date.now();

    for (const request of cacheItems) {
        const response = await cache.match(request);
        if (response) {
            const cachedData = await response.json();
            if (cachedData.timestamp < oldestTimestamp) {
                oldestTimestamp = cachedData.timestamp;
                oldestRequest = request;
            }
        }
    }

    if (oldestRequest) {
        await cache.delete(oldestRequest);
    }
}
