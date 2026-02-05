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
      layout: {
        visibility: "none" // ✅ Iniciar oculto - sin cables visibles
      },
      paint: {
        "line-width": 2,
        "line-color": "#000099"
      }
    });

    /* ======================
       CAPA PUNTOS (oculta por defecto; solo desde árbol o buscador)
    ====================== */
    map.addLayer({
      id: "ftth-puntos",
      type: "circle",
      source: "ftth-src",
      filter: ["==", ["geometry-type"], "Point"],
      layout: {
        visibility: "none" // ✅ Solo visible si el usuario activa desde árbol de capas o buscador
      },
      paint: {
        "circle-radius": 5,
        "circle-color": "#ffaa00",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#000"
      }
    });
    
    // ✅ Registrar en el sistema de capas FTTH (después de crear ambas capas)
    // App ya está declarado arriba en la función
    if (App) {
      if (!App.__ftthLayerIds) {
        App.__ftthLayerIds = [];
      }
      if (!App.__ftthLayerIds.includes("ftth-cables")) {
        App.__ftthLayerIds.push("ftth-cables");
        console.log(`✅ Capa ftth-cables registrada en sistema FTTH`);
      }
      if (!App.__ftthLayerIds.includes("ftth-puntos")) {
        App.__ftthLayerIds.push("ftth-puntos");
        console.log(`✅ Capa ftth-puntos registrada en sistema FTTH`);
      }
    }

    console.log("✅ Capas FTTH cargadas");
  }

})();
