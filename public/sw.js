// Service Worker para Emblema Nexus PWA
const CACHE_NAME = 'emblema-nexus-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET idénticas
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // No cachear llamadas a APIs ni autenticación para no guardar datos sensibles en caché
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // Fallback básico si está offline
        return caches.match('/');
      });
    })
  );
});
