// public/service-worker.js
self.addEventListener("install", (event) => {
    console.log("Service worker installed");
    event.waitUntil(self.skipWaiting());
  });
  
  self.addEventListener("activate", (event) => {
    console.log("Service worker activated");
    event.waitUntil(self.clients.claim());
  });
  
  // Cache assets and offline page
  const CACHE_NAME = 'potoba-cache-v1';
  const OFFLINE_URL = '/offline.html';
  const ASSETS = [
    '/',
    OFFLINE_URL,
    '/manifest.json',
    '/favicon.ico',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
  ];
  
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
  });
  
  self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
      );
    } else {
      event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
      );
    }
  });
  
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
    );
  });
