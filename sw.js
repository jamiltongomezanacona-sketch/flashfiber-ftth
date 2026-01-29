const CACHE_NAME = "flashfiber-ftth-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/pages/home.html",
  "/pages/mapa-ftth.html",

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

// Instalar
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Activar
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
});

// Interceptar requests
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
