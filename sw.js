const CACHE_NAME = "flashfiber-ftth-v5";
const OFFLINE_URL = "/index.html"; // Fallback si no hay conexión

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/pages/home.html",
  "/pages/mapa-ftth.html",
  "/pages/mapa-corporativo.html",
  "/pages/configuracion.html",

  "/assets/css/theme.css",
  "/assets/css/layout.css",
  "/assets/css/app-ui.css",
  "/assets/css/map.css",
  "/assets/css/panels.css",
  "/assets/css/mobile.css",
  "/assets/css/search.css",

  "/assets/js/app.js",
  "/assets/js/config.js",
  "/assets/js/utils/errorHandler.js",
  "/assets/js/utils/validators.js"
];

// 🔹 INSTALACIÓN (cachear uno a uno para no fallar si algún asset da 404)
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("📦 Service Worker: Cacheando assets estáticos");
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn("⚠️ SW: no se pudo cachear", url, err.message);
          })
        )
      );
    })
  );
});

// 🔹 ACTIVACIÓN
self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Tomar control inmediatamente
      caches.keys().then(keys => {
        // Eliminar caches antiguos
        return Promise.all(
          keys
            .filter(k => k !== CACHE_NAME)
            .map(k => {
              console.log("🗑️ Service Worker: Eliminando cache antiguo:", k);
              return caches.delete(k);
            })
        );
      })
    ])
  );
});

// 🔹 FETCH - Estrategia: Network First, Cache Fallback
self.addEventListener("fetch", event => {
  // Solo procesar requests GET
  if (event.request.method !== "GET") return;
  
  const url = new URL(event.request.url);
  
  // ✅ Excluir Firebase y Mapbox de cache (siempre usar red)
  if (url.hostname.includes("firebase") || 
      url.hostname.includes("firebasestorage") ||
      url.hostname.includes("mapbox") ||
      url.hostname.includes("gstatic")) {
    return; // Dejar que el navegador maneje normalmente
  }

  // ✅ Excluir API calls y recursos dinámicos
  if (url.pathname.includes("/api/") || 
      url.pathname.includes(".json") && url.pathname.includes("geojson")) {
    // Para GeoJSON, intentar red primero pero cachear si funciona
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200 && response.type === "basic") {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone).catch(() => {});
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback a cache si no hay red
          return caches.match(event.request);
        })
    );
    return;
  }

  // ✅ Estrategia Network First para otros recursos
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cachear solo respuestas same-origin y exitosas (evita NotFoundError)
        if (response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // ✅ Fallback a cache
        return caches.match(event.request)
          .then(cached => {
            if (cached) return cached;
            
            // ✅ Fallback a página offline si es navegación
            if (event.request.mode === "navigate") {
              return caches.match(OFFLINE_URL);
            }
            
            // ✅ Respuesta genérica para otros recursos
            return new Response("Sin conexión", { 
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "text/plain" }
            });
          });
      })
  );
});
