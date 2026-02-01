const CACHE_NAME = "flashfiber-ftth-v4-tablet";
const OFFLINE_URL = "/index.html"; // Fallback si no hay conexión

// 📱 Assets optimizados para tablets y móviles
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/pages/home.html",
  "/pages/mapa-ftth.html",

  // CSS optimizado para tablets
  "/assets/css/theme.css",
  "/assets/css/layout.css",
  "/assets/css/app-ui.css",
  "/assets/css/map.css",
  "/assets/css/panels.css",
  "/assets/css/mobile.css",
  "/assets/css/search.css",

  // JavaScript core
  "/assets/js/app.js",
  "/assets/js/config.js",
  "/assets/js/utils/errorHandler.js",
  "/assets/js/utils/validators.js",
  
  // Manifest y documentación
  "/manifest.json",
  "/INSTALACION_TABLET.md"
];

// 🔹 INSTALACIÓN
self.addEventListener("install", event => {
  console.log("📦 Service Worker: Instalando versión optimizada para tablets...");
  self.skipWaiting(); // Activar inmediatamente
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("✅ Service Worker: Cacheando assets estáticos para tablets");
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn("⚠️ Service Worker: Algunos assets no se pudieron cachear:", err);
          // Continuar aunque algunos assets fallen
        });
      })
  );
});

// 🔹 ACTIVACIÓN
self.addEventListener("activate", event => {
  console.log("🔄 Service Worker: Activando versión para tablets...");
  
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
    ]).then(() => {
      console.log("✅ Service Worker: Activado y listo para tablets");
    })
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
    // 📱 Optimizado para tablets: cache más agresivo de GeoJSON
    event.respondWith(
      fetch(event.request, {
        // Timeout más corto en tablets para mejor UX
        signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
      })
        .then(response => {
          // Cachear respuesta exitosa
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback a cache si no hay red (importante para tablets en campo)
          return caches.match(event.request);
        })
    );
    return;
  }

  // ✅ Estrategia Network First para otros recursos
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // ✅ Cachear respuesta exitosa
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
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
