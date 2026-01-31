/* =========================================================
   FlashFiber FTTH | mapa.init.js
   Inicialización segura de Mapbox
========================================================= */

(() => {
  "use strict";

  console.log("🧪 mapa.init.js cargado");

  const App = window.__FTTH_APP__;
  const CONFIG = window.__FTTH_CONFIG__;

  if (!App || !CONFIG) {
    console.error("❌ App o FTTH_CONFIG no disponibles");
    return;
  }

  if (!window.mapboxgl) {
    console.error("❌ Mapbox GL no cargado");
    return;
  }

  // ✅ TOKEN
  mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

  // 🗺️ MAPA BASE – SOLO CALLES
  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-74.08, 4.65],
    zoom: 13,
    bearing: 0,
    pitch: 30
  });

  /* ===============================
     🔒 BLOQUEO INICIAL (CORRECTO)
     =============================== */

  map.dragRotate.disable();        // desktop
  map.touchZoomRotate.disable();   // ⚠️ TODO apagado (NO disableRotation)
  map.touchPitch.disable();

  // 🎛️ Controles nativos
  map.addControl(new mapboxgl.NavigationControl(), "top-right");
  map.addControl(new mapboxgl.FullscreenControl(), "top-right");
  map.addControl(
    new mapboxgl.ScaleControl({ unit: "metric" }),
    "bottom-right"
  );

  // Registrar mapa
  App.setMap(map);

  /* ===============================
     MAPA LISTO
     =============================== */
  map.on("load", () => {
    console.log("🗺️ MAPA CARGADO CORRECTAMENTE");

    // 🌍 Capas FTTH
    App.layers?.loadIndex();

    // 💾 Rutas guardadas
    try {
      const rutas = window.__FTTH_STORAGE__?.getRutas() || [];

      rutas.forEach(ruta => {
        if (window.drawSavedRoute) {
          window.drawSavedRoute(ruta);
        }
      });

      console.log("📦 Rutas cargadas:", rutas.length);
    } catch (e) {
      console.warn("⚠️ Error cargando rutas:", e);
    }

    // 🧭 CONTROLES (rotación ON / OFF)
    if (window.initMapControls) {
      window.initMapControls();
    }
  });

})();
