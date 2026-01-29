/* =========================================================
   FlashFiber FTTH | Carga capas FTTH GeoJSON
========================================================= */

(function () {
  "use strict";

  const wait = setInterval(() => {
    const App = window.__FTTH_APP__;
    if (!App?.map) return;

    clearInterval(wait);
    console.log("🧩 FTTH loader listo");

    loadFTTHLayers();

    // Permite recargar si cambia estilo
    App.reloadFTTH = loadFTTHLayers;

  }, 300);

  function loadFTTHLayers() {
    const App = window.__FTTH_APP__;
    const map = App.map;

    if (!map.isStyleLoaded()) return;

    // Evitar duplicar
    if (map.getSource("ftth-src")) return;

    console.log("📡 Cargando FTTH GeoJSON...");

    map.addSource("ftth-src", {
      type: "geojson",
      data: "../geojson/FTTH_COMPLETO.geojson"
    });

    /* ======================
       CAPA LINEAS (CABLES)
    ====================== */
    map.addLayer({
      id: "ftth-cables",
      type: "line",
      source: "ftth-src",
      filter: ["==", ["geometry-type"], "LineString"],
      paint: {
        "line-width": 2,
        "line-color": "#00e5ff"
      }
    });

    /* ======================
       CAPA PUNTOS
    ====================== */
    map.addLayer({
      id: "ftth-puntos",
      type: "circle",
      source: "ftth-src",
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#ffaa00",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#000"
      }
    });

    console.log("✅ Capas FTTH cargadas");
  }

})();
