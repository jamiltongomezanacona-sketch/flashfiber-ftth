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
    if (typeof window !== "undefined") window.__CORREGIR_RUTA_MODE__ = false;

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
    if (window.__CORREGIR_RUTA_MODE__) {
      window.openCorregirRutaModal?.(metros);
    } else {
      window.openRouteModal?.(metros);
    }
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
        paint: { "line-color": "#0d47a1", "line-width": 4 }
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
        "line-color": "#0d47a1",
        "line-width": 3,
        "line-opacity": 0.8
      }
    });

    console.log("✅ Capa rutas guardadas creada");
  }

  /**
   * Filtra la capa de rutas guardadas por molécula (como geojson-lines / geojson-points).
   * Si moleculaOrNull es null, se muestran todas; si es un string (ej. "SI05"), solo las rutas de esa molécula.
   */
  function applySavedRoutesMoleculaFilter(moleculaOrNull) {
    if (!App?.map) return;
    App._lastSavedRoutesMoleculaFilter = moleculaOrNull ?? null;
    if (!App.map.getLayer(SAVED_ROUTES_LAYER)) return;
    try {
      if (moleculaOrNull == null || moleculaOrNull === "") {
        App.map.setFilter(SAVED_ROUTES_LAYER, null);
      } else {
        App.map.setFilter(SAVED_ROUTES_LAYER, ["==", ["get", "molecula"], String(moleculaOrNull)]);
      }
    } catch (e) {
      console.warn("⚠️ applySavedRoutesMoleculaFilter:", e);
    }
  }

  App.applySavedRoutesMoleculaFilter = applySavedRoutesMoleculaFilter;

  /**
   * Sincroniza la lista de rutas de Firebase al mapa: reemplaza la capa con esas rutas
   * y asegura properties.molecula en cada feature para que el filtro por molécula funcione.
   */
  function syncFirebaseRutasToMap(rutas) {
    if (!App?.map || !Array.isArray(rutas)) return;
    if (!App.map.getSource(SAVED_ROUTES_SOURCE)) return;
    savedRoutes.clear();
    rutas.forEach((r) => {
      let geom = null;
      let props = {};
      try {
        const parsed = typeof r.geojson === "string" ? JSON.parse(r.geojson) : r.geojson;
        if (parsed && parsed.geometry) {
          geom = parsed.geometry;
          props = { ...(parsed.properties || {}), molecula: String(r.molecula || "") };
        } else if (parsed && parsed.features?.[0]) {
          const f = parsed.features[0];
          geom = f.geometry;
          props = { ...(f.properties || {}), molecula: String(r.molecula || "") };
        }
      } catch (e) {
        console.warn("⚠️ Ruta " + (r.id || "") + " sin geojson válido:", e);
      }
      if (!geom || geom.type !== "LineString") return;
      const feature = {
        type: "Feature",
        id: r.id || "route-" + Date.now() + "-" + Math.random().toString(36).slice(2),
        properties: props,
        geometry: geom
      };
      savedRoutes.set(feature.id, feature);
    });
    const source = App.map.getSource(SAVED_ROUTES_SOURCE);
    if (source) {
      source.setData({ type: "FeatureCollection", features: Array.from(savedRoutes.values()) });
    }
    applySavedRoutesMoleculaFilter(App._lastSavedRoutesMoleculaFilter ?? null);
  }

  App.syncFirebaseRutasToMap = syncFirebaseRutasToMap;

  function startFirebaseRutasSync() {
    if (!window.FTTH_FIREBASE?.escucharRutas || !App?.map?.getLayer?.(SAVED_ROUTES_LAYER)) return;
    if (App._firebaseRutasUnsubscribe) return;
    try {
      App._firebaseRutasUnsubscribe = window.FTTH_FIREBASE.escucharRutas((rutas) => {
        syncFirebaseRutasToMap(rutas || []);
      });
      console.log("🛣️ Rutas Firebase sincronizadas al mapa (filtro por molécula activo)");
    } catch (e) {
      console.warn("⚠️ No se pudo suscribir a rutas Firebase:", e);
    }
  }

  function drawSavedRoute(feature) {
    if (!App.map || !feature?.geometry) return;

    // Asegurar properties.molecula para filtrar por molécula (como geojson-lines / geojson-points)
    const props = feature.properties || {};
    if (typeof props.molecula === "undefined" || props.molecula === null) {
      props.molecula = "";
    }
    feature.properties = props;

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
    // Reaplicar filtro por molécula si existe
    if (typeof App.applySavedRoutesMoleculaFilter === "function") {
      App.applySavedRoutesMoleculaFilter(App._lastSavedRoutesMoleculaFilter ?? null);
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
        const props = ruta.properties || {};
        if (typeof props.molecula === "undefined" || props.molecula === null) props.molecula = "";
        ruta.properties = props;
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
    if (typeof App.applySavedRoutesMoleculaFilter === "function") {
      App.applySavedRoutesMoleculaFilter(App._lastSavedRoutesMoleculaFilter ?? null);
    }
  };

  // Exponer función global para dibujar rutas
  window.drawSavedRoute = drawSavedRoute;

  // Inicializar capa al cargar
  if (App.map && App.map.isStyleLoaded()) {
    initSavedRoutesLayer();
    setTimeout(startFirebaseRutasSync, 800);
  } else if (App.map) {
    App.map.once("load", () => {
      initSavedRoutesLayer();
      App.reloadRutas();
      setTimeout(startFirebaseRutasSync, 800);
    });
  }

  // Reconstruir al cambiar estilo
  if (App.map) {
    App.map.on("style.load", () => {
      initSavedRoutesLayer();
      App.reloadRutas();
      setTimeout(startFirebaseRutasSync, 500);
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
  const inputMolecula = document.getElementById("routeMolecula");
  const inputNotes   = document.getElementById("routeNotes");

  function closeRouteModal() {
    routeModal?.classList.add("hidden");
  }

  function openRouteModal(distanceMeters) {
    if (!routeModal) return;
    if (routeDistanceLabel) {
      routeDistanceLabel.innerText = `Distancia: ${Number(distanceMeters).toFixed(0)} m`;
    }
    if (inputCentral) inputCentral.value = "";
    if (inputMolecula) {
      inputMolecula.disabled = true;
      inputMolecula.innerHTML = "<option value=\"\">Seleccione Molécula</option>";
    }
    routeModal.classList.remove("hidden");
  }

  window.openRouteModal = openRouteModal;

  /* Populate routeMolecula when routeCentral changes (same as Corregir Ruta) */
  if (inputCentral && inputMolecula) {
    inputCentral.addEventListener("change", () => {
      const CENTRALES = window.__FTTH_CENTRALES__;
      const selectMol = inputMolecula;
      selectMol.innerHTML = "<option value=\"\">Seleccione Molécula</option>";
      const centralVal = inputCentral.value;
      if (!centralVal || !CENTRALES?.CENTRAL_PREFIX?.[centralVal]) {
        selectMol.disabled = true;
        return;
      }
      const prefijo = CENTRALES.CENTRAL_PREFIX[centralVal];
      const moleculas = CENTRALES.generarMoleculas(prefijo) || [];
      moleculas.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        selectMol.appendChild(opt);
      });
      selectMol.disabled = false;
    });
  }

  /* ---------- Modal Corregir Ruta ---------- */
  const corregirRutaModal = document.getElementById("corregirRutaModal");
  const corregirRutaDistance = document.getElementById("corregirRutaDistance");
  const corregirRutaCentral = document.getElementById("corregirRutaCentral");
  const corregirRutaMolecula = document.getElementById("corregirRutaMolecula");
  const corregirRutaName = document.getElementById("corregirRutaName");
  const corregirRutaNotes = document.getElementById("corregirRutaNotes");

  function closeCorregirRutaModal() {
    corregirRutaModal?.classList.add("hidden");
  }

  function openCorregirRutaModal(distanceMeters) {
    if (!corregirRutaModal) return;
    if (corregirRutaDistance) {
      corregirRutaDistance.innerText = "Distancia: " + Number(distanceMeters).toFixed(0) + " m";
    }
    if (corregirRutaCentral) corregirRutaCentral.value = "";
    if (corregirRutaMolecula) {
      corregirRutaMolecula.disabled = true;
      corregirRutaMolecula.innerHTML = "<option value=\"\">Seleccione Molécula</option>";
    }
    if (corregirRutaName) corregirRutaName.value = "";
    if (corregirRutaNotes) corregirRutaNotes.value = "";
    corregirRutaModal.classList.remove("hidden");
  }
  window.openCorregirRutaModal = openCorregirRutaModal;

  if (corregirRutaCentral) {
    corregirRutaCentral.addEventListener("change", () => {
      const CENTRALES = window.__FTTH_CENTRALES__;
      const selectMol = corregirRutaMolecula;
      if (!selectMol) return;
      selectMol.innerHTML = "<option value=\"\">Seleccione Molécula</option>";
      const centralVal = corregirRutaCentral.value;
      if (!centralVal || !CENTRALES?.CENTRAL_PREFIX?.[centralVal]) {
        selectMol.disabled = true;
        return;
      }
      const prefijo = CENTRALES.CENTRAL_PREFIX[centralVal];
      const moleculas = CENTRALES.generarMoleculas(prefijo) || [];
      moleculas.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        selectMol.appendChild(opt);
      });
      selectMol.disabled = false;
    });
  }

  document.getElementById("btnSaveCorregirRuta")?.addEventListener("click", () => {
    const rutasAPI = window.__FTTH_APP__?.tools?.rutas;
    if (!rutasAPI) return;
    const pts = rutasAPI.getPoints();
    if (!pts || pts.length < 2) {
      App?.ui?.notify?.("⚠️ No hay puntos suficientes.");
      return;
    }
    const central = corregirRutaCentral?.value?.trim();
    const molecula = corregirRutaMolecula?.value?.trim();
    if (!central || !molecula) {
      App?.ui?.notify?.("⚠️ Seleccione Central y Molécula.");
      return;
    }
    const metros = rutasAPI.getLength();
    const feature = {
      type: "Feature",
      id: "CORREGIR-" + Date.now(),
      properties: {
        nombre: corregirRutaName?.value?.trim() || "Corrección " + central + " " + molecula,
        tipo: "corregir_ruta",
        central: central,
        molecula: molecula,
        notas: corregirRutaNotes?.value?.trim() || "",
        longitud_m: metros,
        fecha: new Date().toISOString()
      },
      geometry: { type: "LineString", coordinates: [...pts] }
    };
    const payloadCloud = {
      nombre: feature.properties.nombre,
      tipo: "corregir_ruta",
      central: central,
      molecula: molecula,
      notas: feature.properties.notas,
      distancia: metros,
      geojson: JSON.stringify({ type: "Feature", geometry: feature.geometry, properties: feature.properties })
    };
    if (!window.FTTH_FIREBASE?.guardarRuta) {
      App?.ui?.notify?.("⚠️ Firebase no disponible.");
      return;
    }
    window.FTTH_FIREBASE.guardarRuta(payloadCloud)
      .then(() => {
        if (window.drawSavedRoute) window.drawSavedRoute(feature);
        App?.ui?.notify?.("✅ Ruta corregida guardada en Firebase");
        rutasAPI.stop();
        closeCorregirRutaModal();
      })
      .catch(err => {
        console.error("❌ Error guardando corrección:", err);
        App?.ui?.notify?.("⚠️ No se pudo guardar en Firebase");
      });
  });
  document.getElementById("btnCancelCorregirRuta")?.addEventListener("click", () => {
    window.__FTTH_APP__?.tools?.rutas?.stop();
    closeCorregirRutaModal();
  });
  document.getElementById("closeCorregirRutaModal")?.addEventListener("click", closeCorregirRutaModal);

  function guardarRutaActual() {
    const rutasAPI = window.__FTTH_APP__?.tools?.rutas;
    if (!rutasAPI) return;

    const pts = rutasAPI.getPoints();
    if (!pts || pts.length < 2) {
      App?.ui?.notify?.("⚠️ No hay puntos suficientes para guardar.");
      return;
    }

    const metros = rutasAPI.getLength();
    const saveToFirebase = document.getElementById("routeSaveFirebase")?.checked !== false;
    const centralVal = inputCentral?.value?.trim();
    const moleculaVal = inputMolecula?.value?.trim();

    if (saveToFirebase && window.FTTH_FIREBASE?.guardarRuta) {
      if (!centralVal || !moleculaVal) {
        App?.ui?.notify?.("⚠️ Seleccione Central y Molécula para guardar en Firebase.");
        return;
      }
    }

    const feature = {
      type: "Feature",
      id: "RUTA-" + Date.now(),
      properties: {
        nombre: inputName?.value?.trim() || "Ruta sin nombre",
        tipo: inputType?.value || "distribucion",
        central: inputCentral?.value?.trim() || "SIN-DEFINIR",
        molecula: inputMolecula?.value?.trim() || "",
        notas: inputNotes?.value?.trim() || "",
        tecnico: "Hamilton",
        fecha: new Date().toISOString(),
        longitud_m: metros,
        estado: "planificada",
        version: 1
      },
      geometry: { type: "LineString", coordinates: [...pts] }
    };

    // ✅ Guardado local (localStorage vía __FTTH_STORAGE__)
    window.__FTTH_STORAGE__?.saveRuta?.(feature);

    // ✅ Dibujar ruta en el mapa inmediatamente
    if (window.drawSavedRoute) {
      window.drawSavedRoute(feature);
    }

    // ☁️ Guardado en Firebase solo si la opción está habilitada
    if (saveToFirebase && window.FTTH_FIREBASE?.guardarRuta) {
      const payloadCloud = {
        nombre: feature.properties.nombre,
        tipo: feature.properties.tipo,
        central: feature.properties.central,
        molecula: feature.properties.molecula || "",
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
export {};