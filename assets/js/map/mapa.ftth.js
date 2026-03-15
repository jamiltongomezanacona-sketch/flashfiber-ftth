/* =========================================================
   FlashFiber FTTH | Carga capas FTTH GeoJSON
========================================================= */

(function () {
  "use strict";

  function whenMapReady(fn) {
    if (window.__FTTH_APP__?.map) {
      fn();
      return;
    }
    document.addEventListener("ftth-map-ready", fn, { once: true });
  }

  const log = window.__FTTH_LOG__;
  whenMapReady(() => {
    const App = window.__FTTH_APP__;
    if (log) log("log", "🧩 FTTH loader listo");
    loadFTTHLayers();
    App.reloadFTTH = loadFTTHLayers;
  });

  function loadFTTHLayers() {
    const App = window.__FTTH_APP__;
    const map = App.map;

    if (!map.isStyleLoaded()) return;

    // Evitar duplicar
    if (map.getSource("ftth-src")) return;

    if (log) log("log", "📡 Cargando FTTH GeoJSON...");

    const geojsonUrl = typeof window !== "undefined" && window.__FTTH_GEOJSON_CONSOLIDADO_URL__
      ? window.__FTTH_GEOJSON_CONSOLIDADO_URL__
      : "../geojson/consolidado-ftth.geojson";
    map.addSource("ftth-src", {
      type: "geojson",
      data: geojsonUrl,
      promoteId: "__id"
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
        if (log) log("log", "✅ Capa ftth-cables registrada en sistema FTTH");
      }
      if (!App.__ftthLayerIds.includes("ftth-puntos")) {
        App.__ftthLayerIds.push("ftth-puntos");
        if (log) log("log", "✅ Capa ftth-puntos registrada en sistema FTTH");
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ftth-consolidated-layers-ready"));
      }
    }

    if (log) log("log", "✅ Capas FTTH cargadas");
  }

})();
export {};
