/* =========================================================
   FlashFiber FTTH | tool.gps.js
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App) {
    console.error("❌ App no disponible en tool.gps.js");
    return;
  }

  let watchId = null;
  const SOURCE = "gps-src";
  const LAYER = "gps-layer";

  function start() {
    if (!App || !App.map) {
      console.warn("⚠️ App o mapa no disponible");
      return;
    }

    if (!navigator.geolocation) {
      alert("❌ Este dispositivo no soporta GPS");
      return;
    }

    watchId = navigator.geolocation.watchPosition(
      pos => {
        const { longitude, latitude } = pos.coords;

        const geojson = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          }
        };

        drawPoint(geojson);

        App.map.easeTo({
          center: [longitude, latitude],
          zoom: 18,
          duration: 600
        });
      },
      err => {
        console.error("❌ Error GPS:", err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000
      }
    );

    console.log("📍 GPS iniciado");
  }

  function stop() {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    if (App.map.getLayer(LAYER)) App.map.removeLayer(LAYER);
    if (App.map.getSource(SOURCE)) App.map.removeSource(SOURCE);

    console.log("📍 GPS detenido");
  }

  function drawPoint(data) {
    if (App.map.getSource(SOURCE)) {
      App.map.getSource(SOURCE).setData(data);
      return;
    }

    App.map.addSource(SOURCE, { type: "geojson", data });

    App.map.addLayer({
      id: LAYER,
      type: "circle",
      source: SOURCE,
      paint: {
        "circle-radius": 8,
        "circle-color": "#22d3ee",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#ffffff"
      }
    });
  }

  /* ========= REGISTRO ========= */
  App.tools.gps = { start, stop };
})();