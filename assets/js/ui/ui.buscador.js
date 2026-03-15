/* =========================================================
   FlashFiber FTTH | Buscador Moderno Multifuncional
   Busca en: Centrales, Cables, Cierres
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  const CONFIG = window.__FTTH_CONFIG__ || {};
  if (!App) {
    console.error("❌ App no disponible en ui.buscador.js");
    return;
  }

  // Elementos DOM
  const searchInput = document.getElementById("searchInput");
  const searchClear = document.getElementById("searchClear");
  const searchResults = document.getElementById("searchResults");
  
  if (!searchInput || !searchClear || !searchResults) {
    console.warn("⚠️ Elementos del buscador no encontrados");
    return;
  }

  // Estado
  let searchTimeout = null;
  let allResults = [];
  let currentSearch = "";
  const PIN_COORDS_SOURCE_ID = "search-coordenadas-pin";
  const PIN_COORDS_LAYER_ID = "search-coordenadas-pin-layer";

  /** Caché de resultados por texto (2.3 recomendación): evita re-filtrar en cada tecleo cuando se repite la misma búsqueda */
  const SEARCH_CACHE_MAX = 50;
  const searchResultCache = new Map();

  function clearSearchCache() {
    searchResultCache.clear();
  }

  // GIS Corporativo: solo buscar los 235 cables de CABLES (no FTTH)
  const isCorporativo = typeof window !== "undefined" && !!window.__GEOJSON_INDEX__;

  // Índice de búsqueda (centrales, moléculas, cables, cierres, eventos y rutas desde Firebase)
  const searchIndex = {
    centrales: [],
    moleculas: [],
    cables: [],
    cierres: [],
    eventos: [],
    rutas: []
  };

  // IDs de capas desde config (fallback a valores por defecto)
  const LAYER_CENTRALES = CONFIG.LAYERS?.CENTRALES || "CORPORATIVO_CENTRALES_ETB";
  const LAYER_CIERRES = CONFIG.LAYERS?.CIERRES || "cierres-layer";
  const LAYER_EVENTOS = CONFIG.LAYERS?.EVENTOS || "eventos-layer";
  const SEARCH_DEBOUNCE_MS = CONFIG.SEARCH?.DEBOUNCE_MS ?? 300;
  const SEARCH_RETRY_DELAY_MS = CONFIG.SEARCH?.RETRY_DELAY_MS ?? 600;
  const SEARCH_MAX_RETRIES = CONFIG.SEARCH?.MAX_RETRIES ?? 3;
  const SEARCH_MAX_RESULTS = CONFIG.SEARCH?.MAX_RESULTS ?? 20;
  const MAP_FLYTO_DURATION_MS = CONFIG.MAP_FLYTO_DURATION_MS ?? 1500;
  const GEOCODE_BOGOTA_BBOX = CONFIG.SEARCH?.GEOCODE_BOGOTA_BBOX ?? [-74.35, 4.46, -73.99, 4.83];
  const GEOCODE_LIMIT = CONFIG.SEARCH?.GEOCODE_LIMIT ?? 5;
  const MAPBOX_TOKEN = CONFIG.MAPBOX_TOKEN || "";

  /** Normaliza código de molécula (mayúsculas, trim). Misma lógica en todo el proyecto. */
  function normalizeMolecula(mol) {
    const fn = window.__FTTH_CENTRALES__?.normalizeMolecula;
    return typeof fn === "function" ? fn(mol) : (mol != null && mol !== "" ? String(mol).trim().toUpperCase() : "");
  }
  /** Filtro Mapbox case-insensitive para propiedad "molecula". */
  function buildFilterMolecula(molNorm) {
    return molNorm ? ["==", ["upcase", ["coalesce", ["get", "molecula"], ""]], molNorm] : null;
  }
  /** Filtro Mapbox case-insensitive para propiedad "_molecula". */
  function buildFilterMoleculaUnderscore(molNorm) {
    return molNorm ? ["==", ["upcase", ["coalesce", ["get", "_molecula"], ""]], molNorm] : null;
  }

  /** Normaliza código de molécula (mayúsculas, trim). Misma lógica en todo el proyecto. */
  function normalizeMolecula(mol) {
    const fn = window.__FTTH_CENTRALES__?.normalizeMolecula;
    return typeof fn === "function" ? fn(mol) : (mol != null && mol !== "" ? String(mol).trim().toUpperCase() : "");
  }
  /** Filtro Mapbox case-insensitive para propiedad "molecula". */
  function buildFilterMolecula(molNorm) {
    return molNorm ? ["==", ["upcase", ["coalesce", ["get", "molecula"], ""]], molNorm] : null;
  }
  /** Filtro Mapbox case-insensitive para propiedad "_molecula". */
  function buildFilterMoleculaUnderscore(molNorm) {
    return molNorm ? ["==", ["upcase", ["coalesce", ["get", "_molecula"], ""]], molNorm] : null;
  }

  /* =========================
     Coordenadas (decimal y DMS)
  ========================= */
  /**
   * Parsea coordenadas en formato decimal (4.583832, -74.229158) o DMS (4°34'53.3"N 74°13'43.7"W).
   * @param {string} query - Texto del buscador
   * @returns {[number, number]|null} [lng, lat] en orden GeoJSON/Mapbox, o null si no es coordenada
   */
  function parseCoordinates(query) {
    const trimmed = query.trim();
    if (!trimmed) return null;

    // Formato "4.620694° N, 74.126016° W" (grados decimales + cardinal)
    const decimalCardinalMatch = trimmed.match(/^(\d+\.?\d*)\s*°?\s*[,;\s]*\s*([NnSsEeWw])?\s*[,;\s]+\s*(\d+\.?\d*)\s*°?\s*[,;\s]*\s*([NnSsEeWw])?$/);
    if (decimalCardinalMatch) {
      const n1 = parseFloat(decimalCardinalMatch[1]);
      const n2 = parseFloat(decimalCardinalMatch[3]);
      const c1 = (decimalCardinalMatch[2] || "").toUpperCase();
      const c2 = (decimalCardinalMatch[4] || "").toUpperCase();
      let lat = null, lng = null;
      if (c1 === "N") { lat = n1; } else if (c1 === "S") { lat = -n1; } else if (c1 === "E") { lng = n1; } else if (c1 === "W") { lng = -n1; }
      if (c2 === "N") { lat = n2; } else if (c2 === "S") { lat = -n2; } else if (c2 === "E") { lng = n2; } else if (c2 === "W") { lng = -n2; }
      if (lat == null || lng == null) {
        if (lat == null && lng == null) {
          if (Math.abs(n1) <= 90 && Math.abs(n2) <= 180) { lat = n1; lng = n2; } else if (Math.abs(n2) <= 90 && Math.abs(n1) <= 180) { lng = n1; lat = n2; } else return null;
        } else {
          if (lat == null) lat = n2;
          if (lng == null) lng = n2;
        }
      }
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return [lng, lat];
      return null;
    }

    // Formato decimal: uno o dos números con coma o espacio (ej. "4.583832, -74.229158" o "-74.229158 4.583832")
    const decimalMatch = trimmed.match(/^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/);
    if (decimalMatch) {
      const a = parseFloat(decimalMatch[1]);
      const b = parseFloat(decimalMatch[2]);
      if (isNaN(a) || isNaN(b)) return null;
      // GeoJSON/Mapbox usa [lng, lat]. Detectar orden: el valor en [-90,90] es lat, el otro lng.
      let lng, lat;
      if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
        lat = a;
        lng = b;
      } else if (Math.abs(b) <= 90 && Math.abs(a) <= 180) {
        lng = a;
        lat = b;
      } else {
        return null;
      }
      if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) return [lng, lat];
      return null;
    }

    // Formato DMS: 4°34'53.3"N 74°13'43.7"W (grados ' minutos " segundos N/S/E/W)
    const dmsLat = trimmed.match(/(\d+)[°º]\s*(\d+)['′]?\s*(\d*\.?\d*)?["″]?\s*([NnSs])/);
    const dmsLng = trimmed.match(/(\d+)[°º]\s*(\d+)['′]?\s*(\d*\.?\d*)?["″]?\s*([EeWw])/);
    if (dmsLat && dmsLng) {
      const latDeg = parseInt(dmsLat[1], 10);
      const latMin = parseInt(dmsLat[2], 10);
      const latSec = parseFloat(dmsLat[3]) || 0;
      const latSign = /[Nn]/.test(dmsLat[4]) ? 1 : -1;
      const lat = latSign * (latDeg + latMin / 60 + latSec / 3600);

      const lngDeg = parseInt(dmsLng[1], 10);
      const lngMin = parseInt(dmsLng[2], 10);
      const lngSec = parseFloat(dmsLng[3]) || 0;
      const lngSign = /[Ee]/.test(dmsLng[4]) ? 1 : -1;
      const lng = lngSign * (lngDeg + lngMin / 60 + lngSec / 3600);

      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return [lng, lat];
    }
    return null;
  }

  /* =========================
     Geocodificación: direcciones en Bogotá (Mapbox)
  ========================= */
  /**
   * Busca direcciones en Bogotá con Mapbox Geocoding API.
   * @param {string} query - Texto de búsqueda (ej. "Cra 7 con 26", "Chapinero")
   * @returns {Promise<Array>} Lista de resultados { type, id, name, subtitle, coordinates, icon }
   */
  async function geocodeBogota(query) {
    const q = (query || "").trim();
    if (q.length < 2 || !MAPBOX_TOKEN) return [];
    const bbox = GEOCODE_BOGOTA_BBOX;
    const bboxStr = bbox.join(",");
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&country=co&bbox=${bboxStr}&limit=${GEOCODE_LIMIT}&types=address,place,poi`;
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.features || !Array.isArray(data.features)) return [];
      return data.features.map((f, i) => {
        const center = f.center && f.center.length >= 2 ? f.center : null;
        if (!center) return null;
        return {
          type: "direccion",
          id: "dir-" + i + "-" + center[0].toFixed(5) + "-" + center[1].toFixed(5),
          name: f.place_name || f.text || "Dirección",
          subtitle: f.context ? f.context.map(c => c.text).join(", ") : (f.place_type ? f.place_type[0] : ""),
          coordinates: center,
          icon: "<i class=\"fas fa-map-marker-alt\"></i>"
        };
      }).filter(Boolean);
    } catch (err) {
      console.warn("⚠️ Geocodificación Bogotá:", err.message);
      return [];
    }
  }

  /* =========================
     Inicialización
  ========================= */
  async function init() {
    setupEventListeners();

    // Registrar desde el inicio para no perder el primer refresh de datos (pines al primer clic en molécula)
    window.addEventListener("ftth-cierres-layer-refreshed", function reapplyCierres() {
      if (App?._selectedMoleculaForPins && typeof setSelectedMoleculaForPins === "function") {
        setSelectedMoleculaForPins(App._selectedMoleculaForPins, { keepCablesVisible: !!App.__cablesExplicitlyVisible, fromSearch: !!App._moleculaFromSearch });
      }
    });
    window.addEventListener("ftth-eventos-layer-refreshed", function reapplyEventos() {
      if (App?._selectedMoleculaForPins && typeof setSelectedMoleculaForPins === "function") {
        setSelectedMoleculaForPins(App._selectedMoleculaForPins, { keepCablesVisible: !!App.__cablesExplicitlyVisible, fromSearch: !!App._moleculaFromSearch });
      }
    });

    // Un solo listener en document para cerrar al hacer clic fuera (resultados + dropdown molécula)
    document.addEventListener("click", function onDocumentClickCloseBuscadorPanels(e) {
      const mainInput = document.getElementById("searchInput");
      const mainResults = document.getElementById("searchResults");
      const filterSearch = document.getElementById("filterMoleculaSearch");
      const filterDropdown = document.getElementById("filterMoleculaDropdown");
      if (mainInput && mainResults && !mainInput.contains(e.target) && !mainResults.contains(e.target)) {
        hideResults();
      }
      if (filterSearch && filterDropdown && !filterSearch.contains(e.target) && !filterDropdown.contains(e.target)) {
        filterDropdown.classList.add("hidden");
      }
    });

    if (isCorporativo) {
      // GIS Corporativo: solo los 235 cables de CABLES (no centrales/cierres/eventos FTTH)
      loadCablesCorporativo().then(() => {
        console.log(`✅ Buscador Corporativo: ${searchIndex.cables.length} cables`);
      });
      console.log("🔍 Buscador GIS Corporativo - solo cables CABLES");
    } else {
      loadCentrales().then(() => {
        console.log(`✅ Centrales cargadas: ${searchIndex.centrales.length}`);
      });
      loadCables().then(() => loadCablesMuzu()).then(() => {
        console.log(`✅ Cables cargados: ${searchIndex.cables.length}`);
      });
      waitForFirebaseAndLoadCierres();
      waitForFirebaseAndLoadEventos();
      waitForFirebaseAndLoadRutas();
      setupFilterToggles();
      setupMoleculaFilter();
      if (App) App.setSelectedMoleculaForPins = setSelectedMoleculaForPins;
      console.log("🔍 Buscador inicializado - cargando datos en segundo plano");
    }
  }

  async function waitForFirebaseAndLoadCierres(maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.FTTH_FIREBASE?.escucharCierres) {
        await loadCierres();
        console.log(`✅ Cierres cargados: ${searchIndex.cierres.length} cierres`);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.warn("⚠️ Firebase no disponible para cargar cierres");
    return false;
  }

  async function waitForFirebaseAndLoadEventos(maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.FTTH_FIREBASE?.escucharEventos) {
        await loadEventos();
        console.log(`✅ Eventos cargados: ${searchIndex.eventos.length} eventos`);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.warn("⚠️ Firebase no disponible para cargar eventos");
    return false;
  }

  async function waitForFirebaseAndLoadRutas(maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.FTTH_FIREBASE?.escucharRutas) {
        loadRutas();
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  // Molécula seleccionada desde el árbol de capas (solo entonces se muestran pines)
  let selectedMoleculaForPins = null;

  /* =========================
     Filtros: mostrar/ocultar pines Centrales, Cierres y Eventos
     Por defecto mapa limpio (pines ocultos hasta que se seleccione molécula en Capas)
  ========================= */
  function setupFilterToggles() {
    const filterCentrales = document.getElementById("filterCentrales");
    const filterCierres = document.getElementById("filterCierres");
    const filterEventos = document.getElementById("filterEventos");
    const filterComentarios = document.getElementById("filterComentarios");
    const filterOcultarPines = document.getElementById("filterOcultarPines");
    if (!filterCierres || !filterEventos) return;

    // Por defecto mostrar centrales, cierres, eventos y comentarios cuando haya molécula seleccionada
    if (filterCentrales) filterCentrales.checked = true;
    filterCierres.checked = true;
    filterEventos.checked = true;
    if (filterComentarios) filterComentarios.checked = true;

    function setCentralesVisibility() {
      if (!App?.map || !filterCentrales) return;
      if (App.map.getLayer(LAYER_CENTRALES)) {
        try {
          App.map.setLayoutProperty(LAYER_CENTRALES, "visibility", filterCentrales.checked ? "visible" : "none");
        } catch (e) {}
      }
    }

    function applyPinsVisibility() {
      if (!App?.map) return;
      const hideAllPins = filterOcultarPines?.checked === true;
      const molNorm = normalizeMolecula(selectedMoleculaForPins);
      const showPins = !hideAllPins && molNorm !== "";
      const filter = buildFilterMolecula(molNorm);
      [LAYER_CIERRES, LAYER_EVENTOS].forEach((layerId, i) => {
        if (!App.map.getLayer(layerId)) return;
        const toggleChecked = i === 0 ? filterCierres.checked : filterEventos.checked;
        const visible = showPins && toggleChecked;
        try {
          App.map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
          App.map.setFilter(layerId, showPins ? filter : null);
        } catch (e) {}
      });
      // Cierres del consolidado (CUNI, etc.): capa geojson-points filtrada por _molecula (misma lógica estándar)
      if (App.map.getLayer("geojson-points")) {
        const visibleConsolidated = showPins && filterCierres.checked;
        const filterPoints = molNorm
          ? ["all", ["==", ["geometry-type"], "Point"], buildFilterMoleculaUnderscore(molNorm)]
          : null;
        try {
          App.map.setLayoutProperty("geojson-points", "visibility", visibleConsolidated ? "visible" : "none");
          App.map.setFilter("geojson-points", filterPoints || ["==", ["geometry-type"], "Point"]);
        } catch (e) {}
      }
      // Comentarios (notas rápidas): visibles cuando Comentarios está activado en el sidebar
      const NOTAS_LAYER = (window.__FTTH_CONFIG__?.LAYERS?.NOTAS) || "notas-layer";
      const NOTAS_LABEL_LAYER = "notas-layer-label";
      const showNotasSidebar = showPins && (filterComentarios?.checked === true);
      if (showNotasSidebar && !App.map.getLayer(NOTAS_LAYER) && typeof App.tools?.notaRapida?.ensureLayer === "function") {
        App.tools.notaRapida.ensureLayer();
        setTimeout(applyPinsVisibility, 350);
      }
      [NOTAS_LAYER, NOTAS_LABEL_LAYER].forEach(function (layerId) {
        if (App.map.getLayer(layerId)) {
          try {
            App.map.setFilter(layerId, showNotasSidebar ? buildFilterMolecula(molNorm) : null);
            App.map.setLayoutProperty(layerId, "visibility", showNotasSidebar ? "visible" : "none");
          } catch (e) {}
        }
      });
      setCentralesVisibility();
    }

    if (filterCentrales) filterCentrales.addEventListener("change", setCentralesVisibility);
    filterCierres.addEventListener("change", applyPinsVisibility);
    filterEventos.addEventListener("change", applyPinsVisibility);
    if (filterComentarios) filterComentarios.addEventListener("change", applyPinsVisibility);
    if (filterOcultarPines) filterOcultarPines.addEventListener("change", applyPinsVisibility);
    setCentralesVisibility();
  }

  /* =========================
     Mostrar/ocultar pines según molécula seleccionada en árbol Capas
     Llamado desde ui.layers.tree.js al marcar/desmarcar molécula
  ========================= */
  /**
   * Filtra los pines (cierres y eventos) por molécula seleccionada en el árbol de capas.
   * Actualiza el filtro de molécula en el sidebar y la visibilidad/filtro de LAYER_CIERRES y LAYER_EVENTOS.
   * @param {string|null} moleculaOrNull - Código de molécula (ej. "SI02") o null para mostrar todos.
   * @param {{ keepCablesVisible?: boolean }} [opts] - keepCablesVisible: true cuando se llama desde selección de cable (no ocultar geojson-lines).
   */
  function setSelectedMoleculaForPins(moleculaOrNull, opts) {
    selectedMoleculaForPins = moleculaOrNull || null;
    if (App) {
      App._selectedMoleculaForPins = selectedMoleculaForPins;
      App._moleculaFromSearch = (opts?.fromSearch === true) && selectedMoleculaForPins != null;
    }
    const filterCierres = document.getElementById("filterCierres");
    const filterEventos = document.getElementById("filterEventos");
    const filterOcultarPines = document.getElementById("filterOcultarPines");
    const filterMolecula = document.getElementById("filterMolecula");
    if (filterMolecula) {
      filterMolecula.value = moleculaOrNull || "";
    }
    const filterMoleculaSearch = document.getElementById("filterMoleculaSearch");
    if (filterMoleculaSearch) {
      filterMoleculaSearch.value = moleculaOrNull || "";
    }
    // Al seleccionar una molécula, marcar Cierres, Eventos y Comentarios para que se vean los pines
    if (moleculaOrNull != null && String(moleculaOrNull).trim() !== "") {
      if (filterCierres) filterCierres.checked = true;
      if (filterEventos) filterEventos.checked = true;
      const filterComentarios = document.getElementById("filterComentarios");
      if (filterComentarios) filterComentarios.checked = true;
      const filterOcultar = document.getElementById("filterOcultarPines");
      if (filterOcultar) filterOcultar.checked = false;
    }
    if (!App?.map) return;
    if (!App.map.isStyleLoaded()) {
      App.map.once("load", () => setSelectedMoleculaForPins(moleculaOrNull, opts));
      return;
    }
    // Al cambiar molécula, ocultar capas individuales del árbol (ej. FTTH_CHICO_CO36_*) salvo si estamos mostrando un cable
    if (App) App.__cablesExplicitlyVisible = !!opts?.keepCablesVisible;
    if (typeof App.enforceOnlyCentralesVisible === "function") App.enforceOnlyCentralesVisible();
    if (typeof App.syncTreeToSelectedMolecula === "function") App.syncTreeToSelectedMolecula(selectedMoleculaForPins);
    const hideAllPins = filterOcultarPines?.checked === true;
    const molNorm = normalizeMolecula(selectedMoleculaForPins);
    const showPins = !hideAllPins && molNorm !== "";
    const filter = buildFilterMolecula(molNorm);
    let pinsLayersApplied = 0;
    [LAYER_CIERRES, LAYER_EVENTOS].forEach((layerId, i) => {
      if (!App.map.getLayer(layerId)) return;
      pinsLayersApplied++;
      const toggleChecked = (i === 0 ? filterCierres?.checked : filterEventos?.checked) !== false;
      const visible = showPins && toggleChecked;
      try {
        App.map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
        App.map.setFilter(layerId, showPins ? filter : null);
      } catch (e) {}
    });
    if (showPins && pinsLayersApplied === 0) {
      [200, 400, 800, 1500, 3000, 5000].forEach(function (delay) {
        setTimeout(function () {
          if (!App?.map || !App.map.getLayer(LAYER_CIERRES)) return;
          setSelectedMoleculaForPins(moleculaOrNull, opts);
        }, delay);
      });
    }
    // Cierres del consolidado (CUNI): geojson-points con filtro por _molecula (misma lógica estándar)
    if (App.map.getLayer("geojson-points")) {
      const visibleConsolidated = showPins && (filterCierres?.checked !== false);
      const filterPoints = molNorm
        ? ["all", ["==", ["geometry-type"], "Point"], buildFilterMoleculaUnderscore(molNorm)]
        : ["==", ["geometry-type"], "Point"];
      try {
        App.map.setLayoutProperty("geojson-points", "visibility", visibleConsolidated ? "visible" : "none");
        App.map.setFilter("geojson-points", filterPoints);
      } catch (e) {}
    }
    // Rutas guardadas (Firebase/local): filtrar por molécula como cables y cierres
    if (typeof App.applySavedRoutesMoleculaFilter === "function") {
      App.applySavedRoutesMoleculaFilter(selectedMoleculaForPins);
    }
    // Notas rápidas: visibles cuando Comentarios está activado en sidebar y la molécula viene de Capas (no del buscador)
    const filterComentariosPins = document.getElementById("filterComentarios");
    const NOTAS_LAYER = (window.__FTTH_CONFIG__?.LAYERS?.NOTAS) || "notas-layer";
    const NOTAS_LABEL_LAYER = "notas-layer-label";
    const showNotas = showPins && !opts?.fromSearch && (filterComentariosPins?.checked !== false);
    [NOTAS_LAYER, NOTAS_LABEL_LAYER].forEach((layerId) => {
      if (App.map.getLayer(layerId)) {
        try {
          const filterNotas = buildFilterMolecula(molNorm);
          App.map.setFilter(layerId, filterNotas);
          App.map.setLayoutProperty(layerId, "visibility", showNotas ? "visible" : "none");
        } catch (e) {}
      }
    });
  }


  /* =========================
     Filtro por molécula: buscador versátil (sidebar)
  ========================= */
  function formatCentralLabel(key) {
    return key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  function buildMoleculaData() {
    const centrales = window.__FTTH_CENTRALES__;
    const CENTRAL_PREFIX = centrales?.CENTRAL_PREFIX || {};
    const generarMoleculas = centrales?.generarMoleculas || (() => []);
    const list = [];
    Object.keys(CENTRAL_PREFIX).sort().forEach(centralKey => {
      const prefijo = CENTRAL_PREFIX[centralKey];
      const label = formatCentralLabel(centralKey);
      const moleculas = generarMoleculas(prefijo) || [];
      moleculas.forEach(mol => {
        list.push({ mol, centralKey, centralLabel: label, prefijo });
      });
    });
    return list;
  }

  function setupMoleculaFilter() {
    const select = document.getElementById("filterMolecula");
    const searchInput = document.getElementById("filterMoleculaSearch");
    const dropdown = document.getElementById("filterMoleculaDropdown");
    if (!select || !searchInput || !dropdown) return;

    const allMoleculas = buildMoleculaData();

    function filterByQuery(q) {
      const qn = (q || "").trim().toUpperCase();
      if (!qn) return allMoleculas.slice(0, 50);
      return allMoleculas.filter(item =>
        item.mol.toUpperCase().includes(qn) ||
        item.prefijo.toUpperCase().includes(qn) ||
        item.centralLabel.toUpperCase().includes(qn.replace(/\s/g, " "))
      ).slice(0, 80);
    }

    function renderDropdown(items, query) {
      dropdown.innerHTML = "";
      const hasQuery = (query || "").trim().length > 0;

      const optTodas = document.createElement("div");
      optTodas.className = "molecula-dropdown-item";
      optTodas.setAttribute("role", "option");
      optTodas.setAttribute("data-value", "");
      optTodas.textContent = "Todas";
      optTodas.addEventListener("click", () => selectMolecula(""));
      dropdown.appendChild(optTodas);

      if (items.length === 0 && hasQuery) {
        const empty = document.createElement("div");
        empty.className = "molecula-dropdown-item";
        empty.style.color = "var(--text-muted)";
        empty.textContent = "Sin resultados";
        dropdown.appendChild(empty);
        return;
      }

      let lastCentral = null;
      items.forEach(item => {
        if (item.centralKey !== lastCentral) {
          lastCentral = item.centralKey;
          const header = document.createElement("div");
          header.className = "molecula-dropdown-header";
          header.textContent = `${item.centralLabel} (${item.prefijo})`;
          dropdown.appendChild(header);
        }
        const opt = document.createElement("div");
        opt.className = "molecula-dropdown-item";
        opt.setAttribute("role", "option");
        opt.setAttribute("data-value", item.mol);
        opt.textContent = item.mol;
        opt.addEventListener("click", () => selectMolecula(item.mol));
        dropdown.appendChild(opt);
      });
    }

    function selectMolecula(value) {
      select.value = value || "";
      setSelectedMoleculaForPins(value || null, { fromSearch: !!value });
      searchInput.value = value || "";
      dropdown.classList.add("hidden");
    }

    function openDropdown() {
      const q = searchInput.value.trim();
      renderDropdown(filterByQuery(q), q);
      dropdown.classList.remove("hidden");
    }

    function closeDropdown() {
      dropdown.classList.add("hidden");
    }

    searchInput.addEventListener("focus", openDropdown);
    searchInput.addEventListener("input", () => {
      openDropdown();
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDropdown();
        searchInput.blur();
      }
    });

    select.innerHTML = '<option value="">Todas</option>';
    allMoleculas.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.mol;
      opt.textContent = item.mol;
      select.appendChild(opt);
    });
  }

  /* =========================
     Cargar índice de búsqueda (DEPRECADO - usar funciones individuales)
  ========================= */
  async function loadSearchIndex() {
    try {
      // 1. Cargar centrales
      await loadCentrales();
      
      // 2. Cargar cables (del árbol GeoJSON)
      await loadCables();
      
      // 3. Cargar cierres (de Firebase)
      await loadCierres();
      
      console.log(`✅ Índice cargado: ${searchIndex.centrales.length} centrales, ${searchIndex.cables.length} cables, ${searchIndex.cierres.length} cierres`);
    } catch (error) {
      console.error("❌ Error cargando índice de búsqueda:", error);
    }
  }

  /* =========================
     Cargar centrales desde GeoJSON
  ========================= */
  async function loadCentrales() {
    try {
      const res = await fetch("../geojson/CORPORATIVO/centrales-etb.geojson", { cache: "default" });
      const geojson = await res.json();
      
      if (geojson.features) {
        clearSearchCache();
        searchIndex.centrales = geojson.features.map(feature => ({
          id: feature.properties.name || "Sin nombre",
          name: feature.properties.name || "Sin nombre",
          type: "central",
          coordinates: feature.geometry.coordinates,
          icon: "🏢",
          subtitle: "Central ETB"
        }));
      }
    } catch (error) {
      console.warn("⚠️ No se pudieron cargar centrales:", error);
    }
  }

  /* =========================
     GIS Corporativo: solo cables de CABLES (235 cables del KML)
  ========================= */
  const CABLES_CORPORATIVO_URL = "../geojson/CABLES/cables.geojson";

  async function loadCablesCorporativo() {
    searchIndex.cables = [];
    try {
      const res = await fetch(CABLES_CORPORATIVO_URL, { cache: "default" });
      if (!res.ok) throw new Error("No se pudo cargar cables corporativos");
      const geojson = await res.json();
      if (!geojson.features || !geojson.features.length) return;
      geojson.features.forEach(feature => {
        const name = feature.properties?.name || "Sin nombre";
        let coordinates = null;
        if (feature.geometry?.type === "LineString" && feature.geometry.coordinates?.length > 0) {
          const mid = Math.floor(feature.geometry.coordinates.length / 2);
          coordinates = feature.geometry.coordinates[mid];
        }
        if (coordinates) {
          searchIndex.cables.push({
            id: name,
            name: name,
            type: "cable",
            layerId: "CABLES_KML",
            coordinates: coordinates,
            icon: "🧵",
            subtitle: "Cable corporativo"
          });
        }
      });
    } catch (err) {
      console.warn("⚠️ Error cargando cables corporativos:", err);
    }
  }

  /* =========================
     Cargar cables: índice único (1 fetch) o fallback al árbol (N fetches)
  ========================= */
  const CABLES_INDEX_URL = "../geojson/cables-index.json";

  async function loadCables() {
    if (isCorporativo) return;
    try {
      console.log("🔍 Iniciando carga de cables para buscador...");
      clearSearchCache();
      searchIndex.cables = [];
      searchIndex.moleculas = [];
      // Primero consolidado (misma fuente que el mapa): asegura CO36FH144 y todos los cables
      await loadCablesFromConsolidado();
      const res = await fetch(CABLES_INDEX_URL, { cache: "default" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          searchIndex.cables = data.map(function (c) {
            return {
              id: c.id,
              name: c.name,
              type: "cable",
              layerId: c.layerId,
              coordinates: c.coordinates,
              icon: "🧵",
              subtitle: c.subtitle || "",
              central: c.central || "",
              molecula: c.molecula || "",
              tipo: c.tipo || "",
              fibras: c.fibras || ""
            };
          });
          // Poblar moléculas desde cables (para que CO36, SI05, etc. aparezcan en el buscador)
          searchIndex.cables.forEach(function (c) {
            if (c.central && c.molecula && /^[A-Z]{2}\d+$/i.test(c.molecula)) {
              const exists = searchIndex.moleculas.some(m => m.id === c.molecula && m.central === c.central);
              if (!exists && c.coordinates) {
                searchIndex.moleculas.push({
                  id: c.molecula,
                  name: c.molecula,
                  type: "molecula",
                  central: c.central,
                  coordinates: c.coordinates,
                  icon: "📍",
                  subtitle: `${c.central} · ${c.molecula}`
                });
              }
            }
          });
          console.log("✅ Cables cargados desde índice único:", searchIndex.cables.length);
          return;
        }
      }
      // Fallback: recorrer árbol (múltiples fetches)
      const indexUrl = (typeof window !== "undefined" && window.__GEOJSON_INDEX__) || "../geojson/index.json";
      const indexRes = await fetch(indexUrl, { cache: "default" });
      if (!indexRes.ok) throw new Error("Índice de cables no disponible");
      const root = await indexRes.json();
      await walkTreeForCables(root, "../geojson/");
      console.log("✅ Cables cargados desde árbol:", searchIndex.cables.length);
      // Respaldo: completar índice desde consolidado (asegura CO35FH144, CO36, etc. aunque falle un fetch del árbol)
      await loadCablesFromConsolidado();
    } catch (error) {
      console.error("❌ Error cargando cables para buscador:", error);
      await loadCablesFromConsolidado();
    }
  }

  /** URLs para consolidado (misma fuente que el mapa): relativa y absoluta por si la página está en /mapa-ftth. */
  const CONSOLIDADO_URLS = ["../geojson/consolidado-ftth.geojson", "/geojson/consolidado-ftth.geojson", "geojson/consolidado-ftth.geojson"];

  /** Completar searchIndex.cables y searchIndex.moleculas desde consolidado-ftth.geojson (todos los cables del mapa, incl. CO36FH144). */
  async function loadCablesFromConsolidado() {
    if (isCorporativo) return;
    for (let i = 0; i < CONSOLIDADO_URLS.length; i++) {
      try {
        const res = await fetch(CONSOLIDADO_URLS[i], { cache: "default" });
        if (!res.ok) continue;
        const geojson = await res.json();
        if (!geojson.features || !geojson.features.length) continue;
        let added = 0;
        geojson.features.forEach(function (feature) {
          if (feature.geometry?.type !== "LineString" || !feature.properties) return;
          const layerId = feature.properties._layerId;
          const molecula = feature.properties._molecula || feature.properties.molecula;
          const central = feature.properties.central || "";
          const name = feature.properties.name || feature.properties._layerLabel || "";
          if (!layerId || !name) return;
          let coordinates = null;
          if (feature.geometry.coordinates && feature.geometry.coordinates.length > 0) {
            const mid = Math.floor(feature.geometry.coordinates.length / 2);
            coordinates = feature.geometry.coordinates[mid];
          }
          if (!coordinates) return;
          const id = layerId;
          const exists = searchIndex.cables.some(function (c) { return c.id === id || c.layerId === layerId; });
          if (!exists) {
            searchIndex.cables.push({
              id: id,
              name: shortCableDisplayName(layerId, name),
              type: "cable",
              layerId: layerId,
              coordinates: coordinates,
              icon: "🧵",
              subtitle: central + (molecula ? " · " + molecula : ""),
              central: central,
              molecula: molecula || ""
            });
            added++;
          }
          if (molecula && central && /^[A-Z]{2}\d+$/i.test(molecula)) {
            const molExists = searchIndex.moleculas.some(function (m) { return m.id === molecula && m.central === central; });
            if (!molExists) {
              searchIndex.moleculas.push({
                id: molecula,
                name: molecula,
                type: "molecula",
                central: central,
                coordinates: coordinates,
                icon: "📍",
                subtitle: central + " · " + molecula
              });
            }
          }
        });
        if (added > 0) {
          clearSearchCache();
          console.log("✅ Buscador: " + added + " cables desde consolidado (CO36FH144, etc.)");
        }
        return;
      } catch (e) {
        if (i === CONSOLIDADO_URLS.length - 1) {
          console.warn("⚠️ No se pudo cargar consolidado para buscador:", e.message || e);
        }
      }
    }
  }

  /** Cargar cables MUZU al índice del buscador (mismo método que otras centrales: layerId geojson-lines, filtro por _molecula). */
  async function loadCablesMuzu() {
    if (isCorporativo) return;
    try {
      const res = await fetch("../geojson/FTTH/MUZU/muzu.geojson", { cache: "default" });
      if (!res.ok) return;
      const geojson = await res.json();
      if (!geojson.features || !geojson.features.length) return;
      let count = 0;
      geojson.features.forEach(function (f) {
        if (f.geometry && f.geometry.type !== "LineString") return;
        const name = (f.properties && f.properties.name) ? String(f.properties.name).trim() : "";
        if (!name) return;
        const coords = f.geometry.coordinates;
        if (!coords || coords.length < 2) return;
        const mid = Math.floor(coords.length / 2);
        const coordinates = coords[mid];
        const moleculaMatch = name.match(/(MU\d+)/i);
        const molecula = moleculaMatch ? moleculaMatch[1].toUpperCase() : "";
        searchIndex.cables.push({
          id: "FTTH_MUZU_" + molecula + "_" + name,
          name: name,
          type: "cable",
          layerId: "geojson-lines",
          coordinates: coordinates,
          icon: "🧵",
          subtitle: "MUZU" + (molecula ? " · " + molecula : ""),
          central: "MUZU",
          molecula: molecula
        });
        if (molecula) {
          const exists = searchIndex.moleculas.some(m => m.id === molecula && m.central === "MUZU");
          if (!exists) {
            searchIndex.moleculas.push({
              id: molecula,
              name: molecula,
              type: "molecula",
              central: "MUZU",
              coordinates: coordinates,
              icon: "📍",
              subtitle: "MUZU · " + molecula
            });
          }
        }
        count++;
      });
      if (count > 0) console.log("✅ Cables MUZU en buscador: " + count + " (estándar geojson-lines)");
    } catch (e) {
      console.warn("⚠️ Cables MUZU para buscador:", e.message || e);
    }
  }

  /** CHICO se carga como el resto de centrales desde el árbol FTTH (walkTreeForCables / cables-index.json). */

  /** Normalizar nombre cable CUNI: CUO6FH144 → CU06FH144 (O a 0). */
  function normalizeCuniCableName(s) {
    if (!s || typeof s !== "string") return s;
    return s.replace(/CUO(\d)/gi, "CU0$1");
  }

  /** Nombre corto para mostrar (ej. SI22FH144_1, CU06FH144). Extrae del id largo o del nombre. */
  function shortCableDisplayName(layerId, fallbackName) {
    const from = (layerId || fallbackName || "").toString();
    if (!from) return "";
    const normalized = from.replace(/\s+/g, "");
    const match = normalized.match(/(SI\d+FH\d+(?:_\d+)?)/i);
    if (match) return match[1];
    // CUNI: CUO6FH144 o FTTH_CUNI_CU06_CUO6FH144 → CU06FH144
    const matchCuni = normalized.match(/(CUO?\d+FH\d+(?:_\d+)?)/i);
    if (matchCuni) return normalizeCuniCableName(matchCuni[1]);
    // Holanda: HO01FH144
    const matchHo = normalized.match(/(HO\d+FH\d+(?:_\d+)?)/i);
    if (matchHo) return matchHo[1];
    // Bachue: BAO5FH144 → BA05FH144, BA05_BAO5FH144 → BA05FH144
    const matchBa = normalized.match(/(BAO?\d+FH\d+(?:_\d+)?)/i);
    if (matchBa) return matchBa[1].replace(/^BAO(\d)/gi, "BA0$1");
    // Fontibón: FO05FH144
    const matchFo = normalized.match(/(FO\d+FH\d+(?:_\d+)?)/i);
    if (matchFo) return matchFo[1];
    // Chico: CO04FH144 (central CHICO, moléculas COxx)
    const matchCo = normalized.match(/(CO\d+FH\d+(?:_\d+)?)/i);
    if (matchCo) return matchCo[1];
    // Suba: SU01FH144 (central SUBA, moléculas SUxx)
    const matchSu = normalized.match(/(SU\d+FH\d+(?:_\d+)?)/i);
    if (matchSu) return matchSu[1];
    // Toberín: TO01FH144 (central TOBERIN, moléculas TOxx)
    const matchTo = normalized.match(/(TO\d+FH\d+(?:_\d+)?)/i);
    if (matchTo) return matchTo[1];
    // Guaymaral: GU01FH144 (central GUAYMARAL, moléculas GUxx)
    const matchGu = normalized.match(/(GU\d+FH\d+(?:_\d+)?)/i);
    if (matchGu) return matchGu[1];
    // MUZU: MU05FH144 (moléculas MUxx)
    const matchMu = normalized.match(/(MU\d+FH\d+(?:_\d+)?)/i);
    if (matchMu) return matchMu[1];
    if (from.startsWith("FTTH_") && from.includes("_")) {
      const parts = from.split("_");
      if (parts.length >= 2) return normalizeCuniCableName(parts.slice(-2).join("_"));
    }
    return normalizeCuniCableName(fallbackName || layerId || from);
  }

  /** Mismo nombre corto pero con sufijo con guión para UI (ej. SI22FH144-1). */
  function cableNameForDisplay(layerId, fallbackName) {
    return shortCableDisplayName(layerId, fallbackName).replace(/_(\d+)$/, "-$1");
  }

  /** Obtener molécula de un cable (ej. SI22, MU05): del índice o extraída de layerId/nombre. */
  function getMoleculaFromCable(cable) {
    if (cable.molecula && /^[A-Z]{2}\d+$/i.test(cable.molecula)) return cable.molecula;
    if (cable.layerId && typeof cable.layerId === "string") {
      const parts = cable.layerId.split("_");
      const match = parts.find(function (p) { return /^[A-Z]{2}\d+$/.test(p); });
      if (match) return match;
    }
    const from = (cable.name || "").toString();
    const molMatch = from.match(/(SI\d+)/i);
    if (molMatch) return molMatch[1].toUpperCase();
    const muMatch = from.match(/(MU\d+)/i);
    if (muMatch) return muMatch[1].toUpperCase();
    const coMatch = from.match(/(CO\d+)/i);
    if (coMatch) return coMatch[1].toUpperCase();
    return null;
  }

  async function walkTreeForCables(node, basePath) {
    if (!node) return;

    // Si es una capa de tipo "layer"
    if (node.type === "layer") {
      // ✅ Detectar cables de múltiples formas:
      // 1. Si el path contiene "cables" o "cable"
      // 2. Si el basePath contiene "cables"
      // 3. Si el typeLayer es "line" (los cables son líneas)
      // 4. Si el ID contiene patrones de cables (FH, etc.)
      const pathLower = (node.path || "").toLowerCase();
      const basePathLower = (basePath || "").toLowerCase();
      const idLower = (node.id || "").toLowerCase();
      const typeLayer = (node.typeLayer || "").toLowerCase();
      
      const isCable = pathLower.includes("cable") || 
                     basePathLower.includes("cables") ||
                     typeLayer === "line" ||
                     idLower.match(/si\d+fh\d+/i); // Patrón: SI##FH##
      
      if (!isCable) {
        return; // Omitir si no es cable
      }
      
      try {
        // ✅ Normalizar URL
        let url = basePath + node.path;
        url = url.replace(/\/+/g, "/");
        if (!url.startsWith("../geojson/")) {
          if (url.startsWith("geojson/")) {
            url = "../" + url;
          } else {
            url = "../geojson/" + url.replace(/^\.\.\/geojson\//, "");
          }
        }
        
        const res = await fetch(url, { cache: "default" });
        if (!res.ok) {
          console.warn(`⚠️ No se pudo cargar cable: ${url} (${res.status})`);
          return;
        }
        const geojson = await res.json();
        
        if (geojson.features && geojson.features.length > 0) {
          geojson.features.forEach(feature => {
            const props = feature.properties || {};
            const id = props.id || props.codigo || node.id;
            const codigo = props.codigo || id;
            const central = props.central || "";
            const molecula = props.molecula || "";
            const tipo = props.tipo || "";
            const fibras = props.fibras || "";
            
            // Obtener coordenadas (centroide para líneas)
            let coordinates = null;
            if (feature.geometry.type === "LineString" && feature.geometry.coordinates.length > 0) {
              const midIndex = Math.floor(feature.geometry.coordinates.length / 2);
              coordinates = feature.geometry.coordinates[midIndex];
            } else if (feature.geometry.type === "Point") {
              coordinates = feature.geometry.coordinates;
            }
            
            if (coordinates && id) {
              // ✅ Evitar duplicados
              const exists = searchIndex.cables.some(c => c.id === id);
              if (!exists) {
                searchIndex.cables.push({
                  id: id,
                  name: shortCableDisplayName(node.id, codigo),
                  type: "cable",
                  layerId: node.id,
                  coordinates: coordinates,
                  icon: "🧵",
                  subtitle: `${central}${molecula ? " · " + molecula : ""}${tipo ? " · " + tipo : ""}${fibras ? " · " + fibras + "F" : ""}`,
                  central: central,
                  molecula: molecula,
                  tipo: tipo,
                  fibras: fibras
                });
                console.log(`✅ Cable agregado al buscador: ${id}`);
              }
              // ✅ Añadir molécula al índice para que "CO36" etc. aparezca en el buscador
              if (central && molecula && /^[A-Z]{2}\d+$/i.test(molecula)) {
                const molExists = searchIndex.moleculas.some(m => m.id === molecula && m.central === central);
                if (!molExists) {
                  searchIndex.moleculas.push({
                    id: molecula,
                    name: molecula,
                    type: "molecula",
                    central: central,
                    coordinates: coordinates,
                    icon: "📍",
                    subtitle: `${central} · ${molecula}`
                  });
                }
              }
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error cargando cable ${node.id}:`, error.message);
      }
      return;
    }

    // Si tiene hijos, recorrerlos en paralelo
    if (node.children?.length) {
      const promises = [];
      
      for (const child of node.children) {
        if (child.type === "layer") {
          promises.push(walkTreeForCables(child, basePath));
        } else if (child.index) {
          promises.push(
            (async () => {
              try {
                // ✅ Normalizar URL
                let url = basePath + child.index;
                url = url.replace(/\/+/g, "/");
                if (!url.startsWith("../geojson/")) {
                  if (url.startsWith("geojson/")) {
                    url = "../" + url;
                  } else {
                    url = "../geojson/" + url.replace(/^\.\.\/geojson\//, "");
                  }
                }
                
                const res = await fetch(url, { cache: "default" });
                if (!res.ok) {
                  console.warn(`⚠️ No se pudo cargar índice: ${url} (${res.status})`);
                  return;
                }
                const json = await res.json();
                const nextBase = basePath + child.index.replace("index.json", "");
                await walkTreeForCables(json, nextBase);
              } catch (error) {
                console.warn(`⚠️ Error cargando índice ${child.index}:`, error.message);
              }
            })()
          );
        }
      }
      
      // ✅ Ejecutar todas las promesas en paralelo
      await Promise.allSettled(promises);
    }
  }

  /* =========================
     Cargar cierres desde Firebase
  ========================= */
  async function loadCierres() {
    try {
      // Esperar a que Firebase esté disponible
      let attempts = 0;
      while (!window.FTTH_FIREBASE?.escucharCierres && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!window.FTTH_FIREBASE?.escucharCierres) {
        console.warn("⚠️ Firebase cierres no disponible después de esperar");
        return;
      }

      // Escuchar cambios en cierres
      window.FTTH_FIREBASE.escucharCierres((cierre) => {
        clearSearchCache();
        if (cierre._deleted) {
          // Eliminar del índice
          searchIndex.cierres = searchIndex.cierres.filter(c => c.id !== cierre.id);
        } else {
          // Solo agregar si tiene coordenadas válidas
          if (cierre.lng && cierre.lat && Number.isFinite(cierre.lng) && Number.isFinite(cierre.lat)) {
            // Agregar o actualizar
            const index = searchIndex.cierres.findIndex(c => c.id === cierre.id);
            const cierreData = {
              id: cierre.id,
              name: cierre.codigo || "Sin código",
              type: "cierre",
              coordinates: [Number(cierre.lng), Number(cierre.lat)],
              icon: "🔒",
              subtitle: `${cierre.tipo || ""}${cierre.central ? " · " + cierre.central : ""}${cierre.molecula ? " · " + cierre.molecula : ""}`,
              codigo: cierre.codigo,
              tipo: cierre.tipo,
              central: cierre.central,
              molecula: cierre.molecula
            };
            
            if (index >= 0) {
              searchIndex.cierres[index] = cierreData;
            } else {
              searchIndex.cierres.push(cierreData);
            }
          }
        }
        
        // Si hay búsqueda activa, actualizar resultados
        if (currentSearch) {
          performSearch(currentSearch);
        }
      });
    } catch (error) {
      console.warn("⚠️ No se pudieron cargar cierres:", error);
    }
  }

  /* =========================
     Cargar eventos desde Firebase
  ========================= */
  async function loadEventos() {
    try {
      let attempts = 0;
      while (!window.FTTH_FIREBASE?.escucharEventos && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      if (!window.FTTH_FIREBASE?.escucharEventos) {
        console.warn("⚠️ Firebase eventos no disponible después de esperar");
        return;
      }
      window.FTTH_FIREBASE.escucharEventos((evento) => {
        clearSearchCache();
        if (evento._deleted) {
          searchIndex.eventos = searchIndex.eventos.filter(e => e.id !== evento.id);
        } else {
          if (evento.lng != null && evento.lat != null && Number.isFinite(Number(evento.lng)) && Number.isFinite(Number(evento.lat))) {
            const eventoData = {
              id: evento.id,
              name: evento.tipo || "Evento",
              type: "evento",
              coordinates: [Number(evento.lng), Number(evento.lat)],
              icon: "🚨",
              subtitle: `${evento.accion || ""}${evento.estado ? " · " + evento.estado : ""}${evento.central ? " · " + evento.central : ""}`,
              layerId: LAYER_EVENTOS,
              molecula: evento.molecula || null,
              estado: evento.estado || "PROVISIONAL"
            };
            const index = searchIndex.eventos.findIndex(e => e.id === evento.id);
            if (index >= 0) searchIndex.eventos[index] = eventoData;
            else searchIndex.eventos.push(eventoData);
          }
        }
        if (currentSearch) performSearch(currentSearch);
      });
    } catch (error) {
      console.warn("⚠️ No se pudieron cargar eventos:", error);
    }
  }

  /* =========================
     Cargar rutas desde Firebase (Montar Ruta + Corregir Ruta)
  ========================= */
  function rutaCoordinatesFromGeojson(geojsonStr) {
    if (!geojsonStr || typeof geojsonStr !== "string") return null;
    try {
      const parsed = JSON.parse(geojsonStr);
      const geom = parsed && (parsed.geometry || parsed.features?.[0]?.geometry);
      if (!geom || geom.type !== "LineString" || !Array.isArray(geom.coordinates) || geom.coordinates.length === 0) return null;
      const coords = geom.coordinates;
      const mid = Math.floor(coords.length / 2);
      return coords[mid];
    } catch (e) {
      return null;
    }
  }

  function loadRutas() {
    if (!window.FTTH_FIREBASE?.escucharRutas) return;
    try {
      window.FTTH_FIREBASE.escucharRutas((rutas) => {
        clearSearchCache();
        searchIndex.rutas = (rutas || []).map((r) => {
          const coordinates = rutaCoordinatesFromGeojson(r.geojson);
          const isCorreccion = (r.tipo || "").toLowerCase() === "corregir_ruta";
          return {
            id: r.id,
            name: r.nombre || (isCorreccion ? "Corrección " + (r.molecula || r.central || "") : "Ruta sin nombre"),
            type: isCorreccion ? "correccion" : "ruta",
            coordinates: coordinates,
            icon: isCorreccion ? "✏️" : "🛣️",
            subtitle: [r.central, r.molecula].filter(Boolean).join(" · ") + (r.distancia ? " · " + (Number(r.distancia) >= 1000 ? (Number(r.distancia) / 1000).toFixed(1) + " km" : r.distancia + " m") : ""),
            central: r.central || "",
            molecula: r.molecula || "",
            geojson: r.geojson,
            distancia: r.distancia
          };
        }).filter((r) => r.coordinates != null);
        if (searchIndex.rutas.length > 0) console.log("✅ Rutas en buscador: " + searchIndex.rutas.length);
        if (currentSearch) performSearch(currentSearch);
      });
    } catch (err) {
      console.warn("⚠️ No se pudieron cargar rutas:", err);
    }
  }
  function setupEventListeners() {
    // Input de búsqueda
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      
      if (query.length === 0) {
        hideResults();
        searchClear.classList.add("hidden");
        currentSearch = "";
        return;
      }
      
      searchClear.classList.remove("hidden");
      
      // Debounce
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, SEARCH_DEBOUNCE_MS);
    });

    // Enter en búsqueda
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && allResults.length > 0) {
        selectResult(allResults[0]);
      }
    });

    // Botón limpiar
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchClear.classList.add("hidden");
      hideResults();
      currentSearch = "";
    });

    // Un solo clic en cualquier resultado: ubicar en el mapa de inmediato (delegado, una vez)
    searchResults.addEventListener("click", (e) => {
      const row = e.target.closest(".search-result-item");
      if (!row) return;
      e.preventDefault();
      e.stopPropagation();
      const type = row.dataset.type;
      const id = row.dataset.id;
      const result = allResults.find(r => r.type === type && (String(r.id) === id || (r.layerId && String(r.layerId) === id)));
      if (result) {
        try {
          selectResult(result);
        } catch (err) {
          console.error("❌ Error al seleccionar resultado:", err);
          hideResults();
        }
      }
    });
  }

  /* =========================
     Realizar búsqueda
  ========================= */
  async function performSearch(query, retryCount) {
    if (!query || query.trim().length === 0) {
      hideResults();
      return;
    }

    currentSearch = query;
    if (typeof retryCount !== "number") retryCount = 0;
    const cacheKey = query.trim().toLowerCase();

    // ✅ Búsqueda por coordenadas (decimal o DMS): ir directo a resultado único
    const coords = parseCoordinates(query);
    if (coords) {
      allResults = [{
        type: "coordenadas",
        id: "coords-" + coords[0].toFixed(6) + "-" + coords[1].toFixed(6),
        name: "Ir a coordenadas",
        subtitle: query.trim(),
        coordinates: coords,
        icon: "<i class=\"fas fa-map-marker-alt\"></i>"
      }];
      renderResults();
      return;
    }

    // ✅ Búsqueda de direcciones en Bogotá (Mapbox Geocoding)
    let addressResults = [];
    if (query.trim().length >= 2) {
      addressResults = await geocodeBogota(query);
    }

    // ✅ Cache: misma búsqueda ya ejecutada → reutilizar resultados (no bloquear hilo con filtrado)
    if (cacheKey && searchResultCache.has(cacheKey)) {
      allResults = searchResultCache.get(cacheKey).slice();
      renderResults();
      return;
    }

    // ✅ Si el índice está vacío, mostrar "Cargando..." y reintentar cuando haya datos
    const totalItems = searchIndex.centrales.length + searchIndex.moleculas.length + searchIndex.cables.length + searchIndex.cierres.length + searchIndex.eventos.length + searchIndex.rutas.length;
    if (totalItems === 0) {
      if (retryCount < SEARCH_MAX_RETRIES) {
        searchResults.innerHTML = `<div class="search-no-results"><i class="fas fa-spinner fa-spin"></i><div>Cargando índice de búsqueda...</div></div>`;
        searchResults.classList.remove("hidden");
        if (isCorporativo) loadCablesCorporativo(); else { loadCentrales(); loadCables(); }
        setTimeout(() => performSearch(query, retryCount + 1), SEARCH_RETRY_DELAY_MS);
      } else {
        allResults = addressResults.slice(0, SEARCH_MAX_RESULTS);
        renderResults();
      }
      return;
    }

    const lowerQuery = query.toLowerCase();
    allResults = [];

    // Buscar en centrales
    searchIndex.centrales.forEach(central => {
      if (central.name.toLowerCase().includes(lowerQuery)) {
        allResults.push(central);
      }
    });

    // Buscar en moléculas (CO36, SI05, etc.)
    searchIndex.moleculas.forEach(mol => {
      const searchText = `${mol.name} ${mol.central || ""} ${mol.subtitle || ""}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        allResults.push(mol);
      }
    });

    // Buscar en cables
    searchIndex.cables.forEach(cable => {
      const searchText = `${cable.name} ${cable.central || ""} ${cable.molecula || ""} ${cable.tipo || ""}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        allResults.push(cable);
      }
    });

    // Buscar en cierres (Firebase)
    searchIndex.cierres.forEach(cierre => {
      const searchText = `${cierre.name} ${cierre.codigo || ""} ${cierre.central || ""} ${cierre.molecula || ""} ${cierre.tipo || ""}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        allResults.push(cierre);
      }
    });

    // Buscar en eventos (Firebase)
    searchIndex.eventos.forEach(evento => {
      const searchText = `${evento.name} ${evento.subtitle || ""}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        allResults.push(evento);
      }
    });

    // Buscar en rutas y correcciones (Firebase): por molécula, nombre, central
    searchIndex.rutas.forEach(ruta => {
      const searchText = `${ruta.name} ${ruta.central || ""} ${ruta.molecula || ""} ${ruta.subtitle || ""}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        allResults.push(ruta);
      }
      if (ruta.molecula && ruta.molecula.toLowerCase() === lowerQuery.trim()) {
        if (!allResults.some(r => r.type === ruta.type && r.id === ruta.id)) allResults.push(ruta);
      }
    });

    // Al buscar por molécula (ej. SI05, CO36), incluir también rutas y correcciones de esa molécula
    const molQuery = lowerQuery.trim().replace(/\s+/g, "");
    if (/^[a-z]{2}\d+$/i.test(molQuery)) {
      searchIndex.rutas.forEach(ruta => {
        if (ruta.molecula && ruta.molecula.toUpperCase() === molQuery.toUpperCase()) {
          if (!allResults.some(r => (r.type === "ruta" || r.type === "correccion") && r.id === ruta.id)) {
            allResults.push(ruta);
          }
        }
      });
    }

    // Añadir cables de la misma molécula (relacionados)
    const cableResults = allResults.filter(function (r) { return r.type === "cable"; });
    let maxResults = SEARCH_MAX_RESULTS;
    if (cableResults.length > 0) {
      const molecules = new Set();
      cableResults.forEach(function (r) {
        const mol = getMoleculaFromCable(r);
        if (mol) molecules.add(mol);
      });
      const existingIds = new Set(allResults.map(function (r) { return r.id; }));
      const existingLayerIds = new Set(
        allResults.filter(function (r) { return r.type === "cable"; }).map(function (r) { return r.layerId; })
      );
      const related = [];
      searchIndex.cables.forEach(function (cable) {
        if (existingIds.has(cable.id) || existingLayerIds.has(cable.layerId)) return;
        const mol = getMoleculaFromCable(cable);
        if (mol && molecules.has(mol)) related.push(cable);
      });
      allResults = allResults.concat(related);
      maxResults = Math.max(SEARCH_MAX_RESULTS, allResults.length);
    }

    // Direcciones de Bogotá primero, luego el resto (hasta GEOCODE_LIMIT direcciones + SEARCH_MAX_RESULTS del índice)
    allResults = addressResults.concat(allResults).slice(0, addressResults.length + SEARCH_MAX_RESULTS);

    if (cacheKey) {
      if (searchResultCache.size >= SEARCH_CACHE_MAX) {
        const firstKey = searchResultCache.keys().next().value;
        if (firstKey !== undefined) searchResultCache.delete(firstKey);
      }
      searchResultCache.set(cacheKey, allResults.slice());
    }

    renderResults();
  }

  /* =========================
     Renderizar resultados
  ========================= */
  function renderResults() {
    if (allResults.length === 0) {
      searchResults.innerHTML = `
        <div class="search-no-results">
          <i class="fas fa-search"></i>
          <div>No se encontraron resultados</div>
        </div>
      `;
      searchResults.classList.remove("hidden");
      return;
    }
    
    const html = `
      <div class="search-results-header">
        ${allResults.length} resultado${allResults.length > 1 ? "s" : ""}
      </div>
      <div class="search-results-list" role="listbox" aria-label="Resultados de búsqueda">
        ${allResults.map(result => {
          const rawName = result.type === "cable" ? cableNameForDisplay(result.layerId, result.name) : result.name;
          const displayName = escapeHtml(rawName != null ? String(rawName) : "");
          let badge = result.type;
          if (result.type === "direccion") badge = "dirección";
          else if (result.type === "molecula") badge = "molécula";
          else if (result.type === "correccion") badge = "corrección";
          else if (result.type === "ruta") badge = "ruta";
          const safeSubtitle = escapeHtml(result.subtitle != null ? String(result.subtitle) : "");
          const titleHtml = result.type === "direccion" ? displayName : highlightMatch(displayName, currentSearch);
          const safeId = escapeHtml(String(result.id != null ? result.id : ""));
          return `
          <div class="search-result-item" role="option" data-type="${result.type}" data-id="${safeId}">
            <div class="search-result-icon ${result.type}">
              ${result.icon}
            </div>
            <div class="search-result-content">
              <div class="search-result-title">
                ${titleHtml}
                <span class="search-result-badge">${escapeHtml(badge)}</span>
              </div>
              <div class="search-result-subtitle">${safeSubtitle}</div>
            </div>
            <input type="checkbox" class="search-result-btn-seleccionar" title="Ubicar en el mapa" aria-label="Seleccionar" unchecked />
          </div>
        `;
        }).join("")}
      </div>
    `;
    
    searchResults.innerHTML = html;
    searchResults.classList.remove("hidden");
  }

  /* =========================
     Seleccionar resultado
  ========================= */
  /**
   * Ubica en el mapa el resultado seleccionado: hace flyTo a sus coordenadas, muestra capas
   * necesarias (cierres/eventos) y opcionalmente aplica filtro por cable. Si el resultado es
   * cierre o evento y no está en App.data, lo añade y dispara ftth-refresh-cierres/eventos.
   * @param {Object} result - Resultado de búsqueda con al menos { type, id, name, coordinates: [lng, lat] }.
   * @param {string} [result.central] - Central (para cierres).
   * @param {string} [result.molecula] - Molécula (para cierres/eventos).
   * @param {string} [result.tipo] - Tipo de cierre (E1, E2).
   */
  function selectResult(result) {
    if (!App.map || !result.coordinates) {
      console.warn("⚠️ No se puede hacer zoom: mapa o coordenadas no disponibles");
      hideResults();
      return;
    }
    if (!App.map.isStyleLoaded()) {
      App.map.once("load", () => selectResult(result));
      return;
    }

    try {
    // Asegurar que la capa y los datos existan antes de zoom (para que se vea a la primera)
    if (result.type === "cierre") {
      if (!App.data) App.data = {};
      if (!App.data.cierres) App.data.cierres = [];
      const exists = App.data.cierres.some(f => f.id === result.id);
      if (!exists) {
        const label = (result.name || "").substring(0, 2).toUpperCase() || "";
        const iconId = `cierre-${result.tipo || "E1"}-${label || "default"}`;
        App.data.cierres.push({
          id: result.id,
          type: "Feature",
          geometry: { type: "Point", coordinates: result.coordinates },
          properties: {
            id: result.id,
            codigo: result.name,
            tipo: result.tipo || "E1",
            central: result.central,
            molecula: result.molecula,
            lng: result.coordinates[0],
            lat: result.coordinates[1],
            iconId: iconId
          }
        });
      }
      window.dispatchEvent(new CustomEvent("ftth-refresh-cierres"));
    }
    if (result.type === "evento") {
      if (!App.data) App.data = {};
      if (!App.data.eventos) App.data.eventos = [];
      const exists = App.data.eventos.some(f => f.id === result.id);
      if (!exists) {
        App.data.eventos.push({
          id: result.id,
          type: "Feature",
          geometry: { type: "Point", coordinates: result.coordinates },
          properties: {
            id: result.id,
            tipo: result.name,
            estado: result.estado || "PROVISIONAL",
            lng: result.coordinates[0],
            lat: result.coordinates[1]
          }
        });
      }
      window.dispatchEvent(new CustomEvent("ftth-refresh-eventos"));
    }

    // Pin de ubicación para búsqueda por coordenadas o dirección (capa del mapa)
    if (result.type === "coordenadas" || result.type === "direccion") {
      try {
        if (App.map.getLayer(PIN_COORDS_LAYER_ID)) App.map.removeLayer(PIN_COORDS_LAYER_ID);
        if (App.map.getSource(PIN_COORDS_SOURCE_ID)) App.map.removeSource(PIN_COORDS_SOURCE_ID);
      } catch (e) {}
    }

    // Hacer zoom al resultado
    const zoomLevel = result.type === "central" ? 15 : (result.type === "direccion" ? 17 : (result.type === "molecula" ? 16 : (result.type === "ruta" || result.type === "correccion" ? 15 : 17)));
    App.map.flyTo({
      center: result.coordinates,
      zoom: zoomLevel,
      duration: MAP_FLYTO_DURATION_MS
    });

    // Si el usuario mueve el mapa durante el flyTo, cancelar la animación para que no se bloquee
    App.map.once("movestart", function () {
      try {
        var c = App.map.getCenter();
        var z = App.map.getZoom();
        App.map.jumpTo({ center: c, zoom: z });
      } catch (e) {}
    });

    // Añadir pin como capa (círculo visible) cuando termine el movimiento
    if (result.type === "coordenadas" || result.type === "direccion") {
      App.map.once("moveend", function () {
        if (!App.map.isStyleLoaded()) return;
        try {
          if (App.map.getLayer(PIN_COORDS_LAYER_ID)) App.map.removeLayer(PIN_COORDS_LAYER_ID);
          if (App.map.getSource(PIN_COORDS_SOURCE_ID)) App.map.removeSource(PIN_COORDS_SOURCE_ID);
        } catch (e) {}
        var geo = {
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: { type: "Point", coordinates: result.coordinates } }]
        };
        App.map.addSource(PIN_COORDS_SOURCE_ID, { type: "geojson", data: geo });
        App.map.addLayer({
          id: PIN_COORDS_LAYER_ID,
          type: "circle",
          source: PIN_COORDS_SOURCE_ID,
          paint: {
            "circle-radius": 16,
            "circle-color": "#00e5ff",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff"
          }
        });
      });
    }

    // Mostrar capa de la molécula seleccionada (CO36, SI05, etc.): zoom + filtro por _molecula
    if (result.type === "molecula") {
      if (!isCorporativo && result.id && result.coordinates) {
        if (App) {
          App.__cablesExplicitlyVisible = true;
          App._selectedMoleculaForPins = result.id;
        }
        if (typeof App.enforceOnlyCentralesVisible === "function") App.enforceOnlyCentralesVisible();
        try {
          if (App.map.getLayer("ftth-cables")) {
            App.map.setLayoutProperty("ftth-cables", "visibility", "none");
          }
          if (App.map.getLayer("geojson-lines")) {
            const molNorm = normalizeMolecula(result.id);
            const lineFilter = molNorm ? ["all", ["==", ["geometry-type"], "LineString"], buildFilterMoleculaUnderscore(molNorm)] : ["==", ["geometry-type"], "LineString"];
            App.map.setFilter("geojson-lines", lineFilter);
            App.map.setLayoutProperty("geojson-lines", "visibility", "visible");
          }
        } catch (e) {
          console.warn("⚠️ Filtro molécula:", e);
        }
        if (typeof App.setSelectedMoleculaForPins === "function") {
          App.setSelectedMoleculaForPins(result.id, { keepCablesVisible: true, fromSearch: true });
        }
        if (typeof App.showPinsWhenCableActivated === "function") {
          App.showPinsWhenCableActivated(null, result.id);
        }
        if (App?.map && typeof App.setSelectedMoleculaForPins === "function") {
          App.map.once("idle", function () {
            setTimeout(function () {
              App.setSelectedMoleculaForPins(result.id, { keepCablesVisible: true, fromSearch: true });
            }, 100);
          });
        }
      }
    }
    // Mostrar capas del cable seleccionado (un solo método FTTH: geojson-lines por _molecula; MUZU ya va por aquí)
    if (result.type === "cable") {
      if (isCorporativo) {
        // GIS Corporativo: solo un cable a la vez (filter por nombre)
        if (App.map.getLayer("CABLES_KML")) {
          App.map.setFilter("CABLES_KML", ["==", ["get", "name"], result.name]);
          App.map.setLayoutProperty("CABLES_KML", "visibility", "visible");
        }
        // Mostrar solo los pines de eventos ligados a este cable
        if (App.map.getLayer(LAYER_EVENTOS)) {
          App.map.setLayoutProperty(LAYER_EVENTOS, "visibility", "visible");
          App.map.setFilter(LAYER_EVENTOS, ["==", ["get", "cable"], result.name]);
        }
      } else {
        // GIS FTTH: al elegir un cable desde el buscador, mostrar SOLO ese cable (por _layerId) para que al cambiar a otro el anterior desaparezca
        const mol = result.molecula || getMoleculaFromCable(result);
        if (App) {
          App.__cablesExplicitlyVisible = true;
          if (mol) App._selectedMoleculaForPins = mol;
        }
        if (typeof App.enforceOnlyCentralesVisible === "function") App.enforceOnlyCentralesVisible();
        const layerId = result.layerId || result.id;
        function applyCableFilter() {
          try {
            if (!App.map || !App.map.getLayer("geojson-lines")) return false;
            // Ocultar siempre la capa ftth-cables (FTTH_COMPLETO) para que no muestre todos los cables y persista CO36 u otro
            if (App.map.getLayer("ftth-cables")) {
              App.map.setLayoutProperty("ftth-cables", "visibility", "none");
            }
            // Primero filtrar a ninguno para que el cable anterior desaparezca; luego el cable seleccionado
            App.map.setFilter("geojson-lines", ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "_layerId"], "__none__"]]);
            if (layerId) {
              App.map.setFilter("geojson-lines", ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "_layerId"], layerId]]);
            } else if (mol) {
              const molNorm = normalizeMolecula(mol);
              if (molNorm) App.map.setFilter("geojson-lines", ["all", ["==", ["geometry-type"], "LineString"], buildFilterMoleculaUnderscore(molNorm)]);
            }
            App.map.setLayoutProperty("geojson-lines", "visibility", "visible");
            return true;
          } catch (e) {
            console.warn("⚠️ applyCableFilter:", e);
            return false;
          }
        }
        if (!applyCableFilter()) {
          if (typeof App.loadConsolidatedGeoJSONToBaseMap === "function") {
            App.loadConsolidatedGeoJSONToBaseMap();
            setTimeout(function retry() {
              try {
                if (applyCableFilter() && typeof App.showPinsWhenCableActivated === "function") {
                  App.showPinsWhenCableActivated(result.layerId, result.molecula || getMoleculaFromCable(result));
                }
              } catch (e) {
                console.warn("⚠️ Retry cable filter:", e);
              }
            }, 2500);
          }
        }
        if (typeof App.showPinsWhenCableActivated === "function") {
          App.showPinsWhenCableActivated(result.layerId, result.molecula || getMoleculaFromCable(result));
        }
        if (result.molecula && typeof App.setSelectedMoleculaForPins === "function") {
          const molCable = result.molecula || getMoleculaFromCable(result);
          App.setSelectedMoleculaForPins(result.molecula, { keepCablesVisible: true, fromSearch: true });
          if (App?.map && molCable) {
            App.map.once("idle", function () {
              setTimeout(function () {
                App.setSelectedMoleculaForPins(molCable, { keepCablesVisible: true, fromSearch: true });
              }, 100);
            });
          }
        }
      }
    }
    if (result.type === "cierre") {
      if (result.molecula && typeof App.setSelectedMoleculaForPins === "function") {
        App.setSelectedMoleculaForPins(result.molecula, { fromSearch: true });
      }
      if (App.map.getLayer(LAYER_CIERRES)) {
        App.map.setLayoutProperty(LAYER_CIERRES, "visibility", "visible");
      }
      const fc = document.getElementById("filterCierres");
      if (fc) fc.checked = true;
    }
    if (result.type === "evento") {
      if (result.molecula && typeof App.setSelectedMoleculaForPins === "function") {
        App.setSelectedMoleculaForPins(result.molecula, { fromSearch: true });
      }
      if (App.map.getLayer(LAYER_EVENTOS)) {
        App.map.setLayoutProperty(LAYER_EVENTOS, "visibility", "visible");
      }
      const fe = document.getElementById("filterEventos");
      if (fe) fe.checked = true;
    }

    // Ruta o corrección: dibujar línea en el mapa y opcionalmente filtrar por molécula
    if (result.type === "ruta" || result.type === "correccion") {
      if (result.geojson && typeof window.drawSavedRoute === "function") {
        try {
          const parsed = typeof result.geojson === "string" ? JSON.parse(result.geojson) : result.geojson;
          let feature = parsed.geometry
            ? { type: "Feature", geometry: parsed.geometry, properties: parsed.properties || {}, id: result.id }
            : (parsed.features?.[0] ? { ...parsed.features[0], id: result.id } : parsed);
          feature.properties = feature.properties || {};
          feature.properties.molecula = result.molecula || "";
          if (feature.geometry) window.drawSavedRoute(feature);
        } catch (e) {
          console.warn("⚠️ No se pudo dibujar ruta en el mapa:", e);
        }
      }
      if (result.molecula && typeof App.setSelectedMoleculaForPins === "function") {
        App.setSelectedMoleculaForPins(result.molecula, { keepCablesVisible: true, fromSearch: true });
      }
    }

    const zoomLabel = result.type === "cable" ? cableNameForDisplay(result.layerId, result.name) : result.name;
      console.log(`🎯 Zoom a ${result.type}: ${zoomLabel}`);
    } catch (err) {
      console.error("❌ Error en selectResult:", err);
    }
    // Siempre cerrar resultados y quitar foco
    hideResults();
    searchInput.blur();
  }

  /* =========================
     Utilidades (escape para evitar XSS en resultados de búsqueda)
  ========================= */
  function escapeHtml(str) {
    if (str == null) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function escapeRegex(str) {
    if (str == null) return "";
    return String(str).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }
  function highlightMatch(text, query) {
    if (!query) return text;
    const safeQuery = escapeRegex(query);
    const regex = new RegExp(`(${safeQuery})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  function hideResults() {
    searchResults.classList.add("hidden");
  }

  // Auto-inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
export {};
