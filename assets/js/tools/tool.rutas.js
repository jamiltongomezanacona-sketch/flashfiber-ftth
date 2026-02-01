/* =========================================================
   FlashFiber FTTH | tool.rutas.js
   Rutas + Modal + Guardado Profesional (FINAL)
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App) return console.error("❌ App no disponible");

  if (!App.tools) App.tools = {};

  let active = false;
  let points = [];
  let isPanning = false;

  const SRC_LINE   = "ruta-line-src";
  const SRC_PTS    = "ruta-points-src";
  const LAYER_LINE = "ruta-line-layer";
  const LAYER_PTS  = "ruta-points-layer";

  /* ============================
     START
  ============================ */
  function start() {
    if (!App || !App.map || !App.map.isStyleLoaded()) return;

    active = true;
    points = [];
    isPanning = false;

    if (!App || !App.map) return;
    App.map.getCanvas().style.cursor = "crosshair";

    App.map.on("click", onClick);
    App.map.on("movestart", () => isPanning = true);
    App.map.on("moveend",   () => isPanning = false);

    createLayers();
    updatePreview();

    App.ui?.notify?.("🛣️ Toca para marcar puntos. Arrastra para mover. Usa 2 dedos para zoom.");
    console.log("🛣️ Ruta activa");
  }

  /* ============================
     STOP
  ============================ */
  function stop() {
    if (!App || !App.map) return;

    active = false;
    points = [];
    isPanning = false;

    if (App && App.map) {
      App.map.off("click", onClick);
      App.map.off("movestart");
      App.map.off("moveend");
      App.map.getCanvas().style.cursor = "";
    }
    safeRemove();

    console.log("🛑 Ruta detenida");
  }

  /* ============================
     CLICK → agregar punto
  ============================ */
  function onClick(e) {
    if (!active || isPanning) return;
    const p = [e.lngLat.lng, e.lngLat.lat];
    points.push(p);
    updatePreview();
  }

  /* ============================
     FINALIZAR → abrir modal
  ============================ */
  function finish() {
    if (!active || points.length < 2) {
      App.ui?.notify?.("⚠️ Marca mínimo 2 puntos para crear una ruta.");
      return;
    }

    const metros = calcLength(points);
    window.openRouteModal?.(metros);
  }

  /* ============================
     CAPAS PREVIEW
  ============================ */
  function createLayers() {
    const map = App.map;

    if (!map.getSource(SRC_LINE)) {
      map.addSource(SRC_LINE, { type: "geojson", data: emptyLine() });
      map.addLayer({
        id: LAYER_LINE,
        type: "line",
        source: SRC_LINE,
        paint: { "line-color": "#00e5ff", "line-width": 4 }
      });
    }

    if (!map.getSource(SRC_PTS)) {
      map.addSource(SRC_PTS, { type: "geojson", data: emptyPoints() });
      map.addLayer({
        id: LAYER_PTS,
        type: "circle",
        source: SRC_PTS,
        paint: {
          "circle-radius": 6,
          "circle-color": "#fff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#00e5ff"
        }
      });
    }
  }

  function updatePreview() {
    const map = App.map;

    map.getSource(SRC_LINE)?.setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: points }
    });

    map.getSource(SRC_PTS)?.setData({
      type: "FeatureCollection",
      features: points.map(p => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: p }
      }))
    });
  }

  function safeRemove() {
    const map = App.map;
    [LAYER_LINE, LAYER_PTS].forEach(id => map.getLayer(id) && map.removeLayer(id));
    [SRC_LINE, SRC_PTS].forEach(id => map.getSource(id) && map.removeSource(id));
  }

  function emptyLine() {
    return { type: "Feature", geometry: { type: "LineString", coordinates: [] } };
  }

  function emptyPoints() {
    return { type: "FeatureCollection", features: [] };
  }

  /* ============================
     DISTANCIA
  ============================ */
  function calcLength(coords) {
    if (!window.turf) return 0;

    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      total += turf.distance(
        turf.point(coords[i - 1]),
        turf.point(coords[i]),
        { units: "kilometers" }
      );
    }
    return Math.round(total * 1000);
  }

  /* ============================
     RUTAS GUARDADAS - Dibujar en mapa
  ============================ */
  const SAVED_ROUTES_SOURCE = "saved-routes-src";
  const SAVED_ROUTES_LAYER = "saved-routes-layer";
  const savedRoutes = new Map(); // Almacenar rutas por ID

  function initSavedRoutesLayer() {
    if (!App || !App.map || !App.map.isStyleLoaded()) return;
    if (App.map.getSource(SAVED_ROUTES_SOURCE)) return;

    App.map.addSource(SAVED_ROUTES_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }
    });

    App.map.addLayer({
      id: SAVED_ROUTES_LAYER,
      type: "line",
      source: SAVED_ROUTES_SOURCE,
      paint: {
        "line-color": "#00e5ff",
        "line-width": 3,
        "line-opacity": 0.8
      }
    });

    console.log("✅ Capa rutas guardadas creada");
  }

  function drawSavedRoute(feature) {
    if (!App.map || !feature?.geometry) return;

    // Inicializar capa si no existe
    initSavedRoutesLayer();

    // Agregar o actualizar ruta
    const routeId = feature.id || `route-${Date.now()}`;
    savedRoutes.set(routeId, feature);

    // Actualizar source con todas las rutas guardadas
    if (!App || !App.map) return;
    const allRoutes = Array.from(savedRoutes.values());
    const source = App.map.getSource(SAVED_ROUTES_SOURCE);
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: allRoutes
      });
    }
  }

  /* ============================
     Exponer recarga global para cambios de estilo
  ============================ */
  App.reloadRutas = function () {
    console.log("🔄 Recargando capa RUTAS");

    // Volver a crear source + layer si fueron destruidos
    initSavedRoutesLayer();

    // Recargar todas las rutas guardadas
    const rutas = window.__FTTH_STORAGE__?.getRutas() || [];
    savedRoutes.clear();
    rutas.forEach(ruta => {
      if (ruta?.geometry) {
        const routeId = ruta.id || `route-${Date.now()}`;
        savedRoutes.set(routeId, ruta);
      }
    });

    // Actualizar source
    if (!App || !App.map) return;
    const source = App.map.getSource(SAVED_ROUTES_SOURCE);
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: Array.from(savedRoutes.values())
      });
    }
  };

  // Exponer función global para dibujar rutas
  window.drawSavedRoute = drawSavedRoute;

  // Inicializar capa al cargar
  if (App.map && App.map.isStyleLoaded()) {
    initSavedRoutesLayer();
  } else if (App.map) {
    App.map.once("load", () => {
      initSavedRoutesLayer();
      App.reloadRutas();
    });
  }

  // Reconstruir al cambiar estilo
  if (App.map) {
    App.map.on("style.load", () => {
      initSavedRoutesLayer();
      App.reloadRutas();
    });
  }

  /* ============================
     API
  ============================ */
  App.tools.rutas = {
    start,
    stop,
    finish,
    getPoints: () => [...points],
    getLength: () => calcLength(points),
    isActive: () => active
  };

})();

/* ======================================================
   MODAL RUTA UI + GUARDADO
====================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const App = window.__FTTH_APP__;

  const routeModal         = document.getElementById("routeModal");
  const routeDistanceLabel= document.getElementById("routeDistance");

  const btnSaveRouteUI     = document.getElementById("btnSaveRoute");
  const btnCancelRouteUI   = document.getElementById("btnCancelRoute");
  const btnCloseRouteUI    = document.getElementById("closeRouteModal");

  const inputName    = document.getElementById("routeName");
  const inputType    = document.getElementById("routeType");
  const inputCentral = document.getElementById("routeCentral");
  const inputNotes   = document.getElementById("routeNotes");

  function closeRouteModal() {
    routeModal?.classList.add("hidden");
  }

  function openRouteModal(distanceMeters) {
    if (!routeModal) return;
    if (routeDistanceLabel) {
      routeDistanceLabel.innerText = `Distancia: ${Number(distanceMeters).toFixed(0)} m`;
    }
    routeModal.classList.remove("hidden");
  }

  window.openRouteModal = openRouteModal;

  function guardarRutaActual() {
    const rutasAPI = window.__FTTH_APP__?.tools?.rutas;
    if (!rutasAPI) return;

    const pts = rutasAPI.getPoints();
    if (!pts || pts.length < 2) {
      App?.ui?.notify?.("⚠️ No hay puntos suficientes para guardar.");
      return;
    }

    const metros = rutasAPI.getLength();

    const feature = {
      type: "Feature",
      id: "RUTA-" + Date.now(),
      properties: {
        nombre: inputName?.value?.trim() || "Ruta sin nombre",
        tipo: inputType?.value || "distribucion",
        central: inputCentral?.value?.trim() || "SIN-DEFINIR",
        notas: inputNotes?.value?.trim() || "",
        tecnico: "Hamilton",
        fecha: new Date().toISOString(),
        longitud_m: metros,
        estado: "planificada",
        version: 1
      },
      geometry: { type: "LineString", coordinates: [...pts] }
    };

    // ✅ Guardado local
    window.__FTTH_DB__?.saveRuta(feature);

    // ✅ Dibujar ruta en el mapa inmediatamente
    if (window.drawSavedRoute) {
      window.drawSavedRoute(feature);
    }

    // ☁️ Guardado en Firebase (payload plano)
    if (window.FTTH_FIREBASE?.guardarRuta) {
      const payloadCloud = {
        nombre: feature.properties.nombre,
        tipo: feature.properties.tipo,
        central: feature.properties.central,
        notas: feature.properties.notas,
        distancia: feature.properties.longitud_m,

        // 🔐 GeoJSON serializado
        geojson: JSON.stringify({
          type: "Feature",
          geometry: feature.geometry,
          properties: feature.properties
        })
      };

      console.log("☁️ Enviando a Firebase:", payloadCloud);

      // ✅ Mejorar manejo de errores
      window.FTTH_FIREBASE.guardarRuta(payloadCloud)
        .then(id => {
          console.log("✅ Ruta sincronizada:", id);
          // Actualizar feature con ID de Firebase si es necesario
          if (id && feature.id) {
            feature.id = id;
          }
        })
        .catch(err => {
          console.error("❌ Error Firebase al guardar ruta:", err);
          App?.ui?.notify?.("⚠️ Ruta guardada localmente, pero no se pudo sincronizar con Firebase");
        });
    }

    App?.ui?.notify?.("✅ Ruta guardada correctamente");
    rutasAPI.stop();

    if (inputName) inputName.value = "";
    if (inputCentral) inputCentral.value = "";
    if (inputNotes) inputNotes.value = "";

    closeRouteModal();
  }

  btnSaveRouteUI?.addEventListener("click", guardarRutaActual);
  btnCancelRouteUI?.addEventListener("click", closeRouteModal);
  btnCloseRouteUI?.addEventListener("click", closeRouteModal);
});