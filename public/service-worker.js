// public/service-worker.js
self.addEventListener("install", (event) => {
    console.log("Service worker installed");
    event.waitUntil(self.skipWaiting());
  });
  
  self.addEventListener("activate", (event) => {
    console.log("Service worker activated");
    event.waitUntil(self.clients.claim());
  });
  
  self.addEventListener("fetch", function(event) {
    event.respondWith(fetch(event.request));
  });
  