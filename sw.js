const CACHE_NAME = 'mflip-diary-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Tailwind CDN is external, but caching it helps. 
  // In a production build process, you'd bundle CSS.
  'https://cdn.tailwindcss.com', 
  'https://esm.sh/react-dom@^19.2.3/',
  'https://esm.sh/react@^19.2.3/',
  'https://esm.sh/lucide-react@^0.562.0'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Attempt to cache core assets. 
      // Note: External CDNs might be opaque or vary, 
      // but for a simple PWA trigger this is often sufficient.
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.log('Cache addAll failed', err);
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
            // Only cache valid responses
            if(networkResponse.ok && event.request.method === 'GET') {
                 cache.put(event.request, networkResponse.clone());
            }
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});