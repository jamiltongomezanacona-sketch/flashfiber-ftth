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

    if (!map.isStyleLoaded()) {
      map.once("load", () => loadFTTHLayers());
      map.once("style.load", () => loadFTTHLayers());
      return;
    }

    // Evitar duplicar
    if (map.getSource("ftth-src")) return;

    if (log) log("log", "📡 Cargando FTTH GeoJSON...");

    try {
      const geojsonUrl = typeof window !== "undefined" && window.__FTTH_GEOJSON_CONSOLIDADO_URL__
        ? window.__FTTH_GEOJSON_CONSOLIDADO_URL__
        : "../geojson/consolidado-ftth.geojson";
      map.addSource("ftth-src", {
        type: "geojson",
        data: geojsonUrl,
        promoteId: "__id"
      });

      map.addLayer({
        id: "ftth-cables",
        type: "line",
        source: "ftth-src",
        filter: ["==", ["geometry-type"], "LineString"],
        layout: { visibility: "none" },
        paint: { "line-width": 2, "line-color": "#000099" }
      });

      map.addLayer({
        id: "ftth-puntos",
        type: "circle",
        source: "ftth-src",
        filter: ["==", ["geometry-type"], "Point"],
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 5,
          "circle-color": "#ffaa00",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#000"
        }
      });

      if (App) {
        if (!App.__ftthLayerIds) App.__ftthLayerIds = [];
        if (!App.__ftthLayerIds.includes("ftth-cables")) App.__ftthLayerIds.push("ftth-cables");
        if (!App.__ftthLayerIds.includes("ftth-puntos")) App.__ftthLayerIds.push("ftth-puntos");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ftth-consolidated-layers-ready"));
        }
      }
      if (log) log("log", "✅ Capas FTTH cargadas");
    } catch (err) {
      const msg = err && err.message ? String(err.message) : "";
      if (/style is not done loading/i.test(msg)) {
        try {
          if (map.getSource("ftth-src")) {
            if (map.getLayer("ftth-cables")) map.removeLayer("ftth-cables");
            if (map.getLayer("ftth-puntos")) map.removeLayer("ftth-puntos");
            map.removeSource("ftth-src");
          }
        } catch (e) {
          if (window.__FTTH_CONFIG__?.DEBUG) console.debug("[mapa.ftth] cleanup on style error", e?.message);
        }
        if (log) log("warn", "⏳ Estilo aún cargando, reintentando en style.load...");
        map.once("load", () => loadFTTHLayers());
        map.once("style.load", () => loadFTTHLayers());
      } else {
        throw err;
      }
    }
  }

})();
export {};
