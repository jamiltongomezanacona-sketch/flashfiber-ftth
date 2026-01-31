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

  mapboxgl.accessToken = MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12", // 👈 SOLO CALLES
    center: [-74.08, 4.65], // ajusta a tu zona
    zoom: 13,
    bearing: 0,
    pitch: 0
  });


  map.addControl(new mapboxgl.NavigationControl(), "top-right");
  map.addControl(new mapboxgl.FullscreenControl(), "top-right");
  map.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-right");

  App.setMap(map);

  map.on("load", () => {
    console.log("🗺️ MAPA CARGADO CORRECTAMENTE");

    // 🌍 Cargar capas FTTH
    App.layers?.loadIndex();

    // 💾 Cargar rutas guardadas
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
  });


})();