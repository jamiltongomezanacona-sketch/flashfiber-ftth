const CACHE_NAME = "flashfiber-ftth-v2";

const STATIC_ASSETS = [
  "/",
  "/index.html",

  "/assets/css/theme.css",
  "/assets/css/layout.css",
  "/assets/css/app-ui.css",
  "/assets/css/map.css",
  "/assets/css/panels.css",
  "/assets/css/mobile.css",

  "/assets/js/app.js",
  "/assets/js/config.js",
  "/assets/js/auth.js"
];

// 🔹 INSTALACIÓN
self.addEventListener("install", event => {
  self.skipWaiting(); // 🔥 CLAVE
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// 🔹 ACTIVACIÓN
self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // 🔥 CLAVE
      caches.keys().then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )
      )
    ])
  );
});

// 🔹 FETCH
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
