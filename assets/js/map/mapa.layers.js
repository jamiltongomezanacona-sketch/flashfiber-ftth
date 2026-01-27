/* =========================================================
   FlashFiber FTTH | mapa.layers.js
   Carga dinámica de capas GeoJSON FTTH
   ✔ Estable para móvil
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App || !App.map) {
    console.error("❌ App o mapa no disponible en mapa.layers.js");
    return;
  }

  const FTTH_INDEX = "../geojson/FTTH/index.json";
  let cachedIndex = null;
  let restoring = false;

  /* ===============================
     Cargar index.json
  =============================== */
  async function loadIndex() {
    try {
      console.log("📂 Cargando índice FTTH...");

      const res = await fetch(FTTH_INDEX, { cache: "no-store" });
      const data = await res.json();

      cachedIndex = data;
      buildLayers(data);

    } catch (err) {
      console.error("❌ Error cargando index.json", err);
    }
  }

  /* ===============================
     Construir capas
  =============================== */
  function buildLayers(index) {
    if (!index?.layers?.length) return;

    index.layers.forEach(layer => {
      createLayer(layer);
    });
  }

  /* ===============================
     Crear capa segura
  =============================== */
  async function createLayer(layer) {
    const id  = layer.id;
    const url = "../geojson/FTTH/" + layer.path;

    if (!App.map.isStyleLoaded()) return;
    if (App.map.getSource(id)) return;

    try {
      const res = await fetch(url, { cache: "no-store" });
      const geojson = await res.json();

      App.map.addSource(id, {
        type: "geojson",
        data: geojson
      });

      App.map.addLayer({
        id,
        type: layer.type || "line",
        source: id,
        paint: layer.paint || {
          "line-color": "#00e5ff",
          "line-width": 2
        }
      });

      console.log("✅ Capa cargada:", id);

    } catch (err) {
      console.error("❌ Error cargando capa:", id, err);
    }
  }

  /* ===============================
     Restaurar capas tras cambio de estilo
  =============================== */
  function restoreLayers() {
    if (restoring) return;
    if (!cachedIndex) return;

    restoring = true;

    console.log("🔄 Restaurando capas FTTH...");

    // Pequeña espera para estabilidad interna del mapa
    setTimeout(() => {
      buildLayers(cachedIndex);
      restoring = false;
    }, 300);
  }

  /* ===============================
     Eventos del mapa
  =============================== */

  // Primera carga
  App.map.on("load", () => {
    console.log("🗺️ Mapa listo → cargando capas FTTH");
    loadIndex();
  });

  // Cambio de estilo (satélite / calles)


  /* ===============================
     API pública
  =============================== */
  App.layers = {
    reload: restoreLayers
  };

})();