/* =========================================================
   FlashFiber FTTH | tool.gps.js
   GPS estilo Google Maps: punto azul, círculo de precisión,
   modo seguimiento, orientación (bearing), feedback.
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App) {
    console.error("❌ App no disponible en tool.gps.js");
    return;
  }

  const SOURCE_POINT = "gps-src";
  const LAYER_POINT = "gps-layer";
  const SOURCE_ACCURACY = "gps-accuracy-src";
  const LAYER_ACCURACY = "gps-accuracy-layer";

  const BLUE_DOT_COLOR = "#4285F4";
  const ACCURACY_FILL = "rgba(66, 133, 244, 0.15)";
  const ACCURACY_STROKE = "rgba(66, 133, 244, 0.35)";
  const MIN_ACCURACY_M = 5;
  const MAX_ACCURACY_M = 200;
  const FOLLOW_MOVE_THRESHOLD_M = 2;
  const EASE_DURATION = 400;
  const DEFAULT_ZOOM = 18;

  let watchId = null;
  let followMode = true;
  let lastCenter = null;
  let unbindMove = null;

  function notify(msg) {
    if (typeof App.ui?.notify === "function") {
      App.ui.notify(msg);
    } else {
      console.log("📍 GPS:", msg);
    }
  }

  function polygonCircle(lng, lat, radiusMeters) {
    const points = [];
    const R = 6371000;
    const latRad = (lat * Math.PI) / 180;
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * 2 * Math.PI;
      const dx = radiusMeters * Math.cos(angle);
      const dy = radiusMeters * Math.sin(angle);
      const dLng = (dx / (R * Math.cos(latRad))) * (180 / Math.PI);
      const dLat = (dy / R) * (180 / Math.PI);
      points.push([lng + dLng, lat + dLat]);
    }
    return points;
  }

  function ensureLayers() {
    if (!App.map.getSource(SOURCE_POINT)) {
      App.map.addSource(SOURCE_POINT, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "Point", coordinates: [0, 0] } }
      });
      App.map.addLayer({
        id: LAYER_POINT,
        type: "circle",
        source: SOURCE_POINT,
        paint: {
          "circle-radius": 10,
          "circle-color": BLUE_DOT_COLOR,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 1
        }
      });
    }
    if (!App.map.getSource(SOURCE_ACCURACY)) {
      App.map.addSource(SOURCE_ACCURACY, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 0], [0, 0]]] }
        }
      });
      App.map.addLayer(
        {
          id: LAYER_ACCURACY,
          type: "fill",
          source: SOURCE_ACCURACY,
          paint: {
            "fill-color": "#4285F4",
            "fill-opacity": 0.15,
            "fill-outline-color": "rgba(66, 133, 244, 0.4)"
          }
        },
        LAYER_POINT
      );
    }
  }

  function updatePoint(lng, lat, accuracyMeters) {
    ensureLayers();

    App.map.getSource(SOURCE_POINT).setData({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] }
    });

    const clamped = Math.max(MIN_ACCURACY_M, Math.min(MAX_ACCURACY_M, accuracyMeters || 20));
    const ring = polygonCircle(lng, lat, clamped);
    App.map.getSource(SOURCE_ACCURACY).setData({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] }
    });
  }

  function distanceMeters(lng1, lat1, lng2, lat2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function recenterIfFollow(lng, lat, bearing, accuracy) {
    if (!followMode || !App.map) return;
    const center = App.map.getCenter();
    const dist = distanceMeters(center.lng, center.lat, lng, lat);
    if (dist < FOLLOW_MOVE_THRESHOLD_M && lastCenter) return;
    lastCenter = [lng, lat];

    const opts = {
      center: [lng, lat],
      zoom: App.map.getZoom() < 16 ? DEFAULT_ZOOM : App.map.getZoom(),
      duration: EASE_DURATION
    };
    if (typeof bearing === "number" && !Number.isNaN(bearing) && bearing >= 0) {
      opts.bearing = bearing;
    }
    App.map.easeTo(opts);
  }

  function start() {
    if (!App?.map) {
      console.warn("⚠️ App o mapa no disponible");
      return;
    }

    if (!navigator.geolocation) {
      notify("Este dispositivo no soporta GPS");
      return;
    }

    followMode = true;
    lastCenter = null;

    unbindMove = () => {
      App.map.off("movestart", onUserMove);
      App.map.off("zoomstart", onUserMove);
    };
    function onUserMove() {
      followMode = false;
      unbindMove?.();
      unbindMove = null;
      notify("Seguimiento desactivado. Toca el botón de ubicación para seguir de nuevo.");
    }
    App.map.on("movestart", onUserMove);
    App.map.on("zoomstart", onUserMove);

    notify("Buscando GPS…");

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { longitude, latitude, accuracy, heading } = pos.coords;
        const accM = typeof accuracy === "number" && accuracy > 0 ? accuracy : 25;

        updatePoint(longitude, latitude, accM);

        const bearing = typeof heading === "number" && !Number.isNaN(heading) && heading >= 0 ? heading : undefined;
        recenterIfFollow(longitude, latitude, bearing, accM);
      },
      (err) => {
        if (err.code === 1) notify("Sin permiso de ubicación");
        else if (err.code === 2) notify("Posición no disponible");
        else if (err.code === 3) notify("Tiempo de espera agotado. Comprueba el GPS.");
        else console.error("❌ Error GPS:", err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 500,
        timeout: 15000
      }
    );

    console.log("📍 GPS iniciado (modo seguimiento activo)");
  }

  function stop() {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    unbindMove?.();
    unbindMove = null;
    followMode = false;
    lastCenter = null;

    if (App.map) {
      if (App.map.getLayer(LAYER_POINT)) App.map.removeLayer(LAYER_POINT);
      if (App.map.getSource(SOURCE_POINT)) App.map.removeSource(SOURCE_POINT);
      if (App.map.getLayer(LAYER_ACCURACY)) App.map.removeLayer(LAYER_ACCURACY);
      if (App.map.getSource(SOURCE_ACCURACY)) App.map.removeSource(SOURCE_ACCURACY);
    }

    console.log("📍 GPS detenido");
  }

  function recenter() {
    if (!watchId || !App.map) return;
    followMode = true;
    if (lastCenter) {
      App.map.easeTo({ center: lastCenter, zoom: DEFAULT_ZOOM, duration: EASE_DURATION });
      notify("Seguimiento activado");
    }
  }

  function isFollowing() {
    return followMode;
  }

  App.tools.gps = { start, stop, recenter, isFollowing };
})();
export {};
