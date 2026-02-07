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

  // GIS Corporativo: solo buscar los 235 cables de CABLES (no FTTH)
  const isCorporativo = typeof window !== "undefined" && !!window.__GEOJSON_INDEX__;

  // Índice de búsqueda (centrales, cables, cierres y eventos desde Firebase)
  const searchIndex = {
    centrales: [],
    cables: [],
    cierres: [],
    eventos: []
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

  /* =========================
     Inicialización
  ========================= */
  async function init() {
    setupEventListeners();

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
      loadCables().then(() => {
        console.log(`✅ Cables cargados: ${searchIndex.cables.length}`);
      });
      waitForFirebaseAndLoadCierres();
      waitForFirebaseAndLoadEventos();
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
    if (!filterCierres || !filterEventos) return;

    // Por defecto mostrar centrales, cierres y eventos cuando haya molécula seleccionada
    if (filterCentrales) filterCentrales.checked = true;
    filterCierres.checked = true;
    filterEventos.checked = true;

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
      const showPins = selectedMoleculaForPins != null;
      const filter = selectedMoleculaForPins ? ["==", ["get", "molecula"], selectedMoleculaForPins] : null;
      [LAYER_CIERRES, LAYER_EVENTOS].forEach((layerId, i) => {
        if (!App.map.getLayer(layerId)) return;
        const toggleChecked = i === 0 ? filterCierres.checked : filterEventos.checked;
        const visible = showPins && toggleChecked;
        try {
          App.map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
          App.map.setFilter(layerId, showPins ? filter : null);
        } catch (e) {}
      });
      // Cierres del consolidado (CUNI, etc.): capa geojson-points filtrada por _molecula
      if (App.map.getLayer("geojson-points")) {
        const visibleConsolidated = showPins && filterCierres.checked;
        const filterPoints = selectedMoleculaForPins
          ? ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "_molecula"], selectedMoleculaForPins]]
          : null;
        try {
          App.map.setLayoutProperty("geojson-points", "visibility", visibleConsolidated ? "visible" : "none");
          App.map.setFilter("geojson-points", filterPoints || ["==", ["geometry-type"], "Point"]);
        } catch (e) {}
      }
      setCentralesVisibility();
    }

    if (filterCentrales) filterCentrales.addEventListener("change", setCentralesVisibility);
    filterCierres.addEventListener("change", applyPinsVisibility);
    filterEventos.addEventListener("change", applyPinsVisibility);
    setCentralesVisibility();
  }

  /* =========================
     Mostrar/ocultar pines según molécula seleccionada en árbol Capas
     Llamado desde ui.layers.tree.js al marcar/desmarcar molécula
  ========================= */
  function setSelectedMoleculaForPins(moleculaOrNull) {
    selectedMoleculaForPins = moleculaOrNull || null;
    const filterCierres = document.getElementById("filterCierres");
    const filterEventos = document.getElementById("filterEventos");
    const filterMolecula = document.getElementById("filterMolecula");
    if (filterMolecula) {
      filterMolecula.value = moleculaOrNull || "";
    }
    const filterMoleculaSearch = document.getElementById("filterMoleculaSearch");
    if (filterMoleculaSearch) {
      filterMoleculaSearch.value = moleculaOrNull || "";
    }
    if (!App?.map) return;
    const showPins = selectedMoleculaForPins != null;
    const filter = selectedMoleculaForPins ? ["==", ["get", "molecula"], selectedMoleculaForPins] : null;
    [LAYER_CIERRES, LAYER_EVENTOS].forEach((layerId, i) => {
      if (!App.map.getLayer(layerId)) return;
      const toggleChecked = (i === 0 ? filterCierres?.checked : filterEventos?.checked) !== false;
      const visible = showPins && toggleChecked;
      try {
        App.map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
        App.map.setFilter(layerId, showPins ? filter : null);
      } catch (e) {}
    });
    // Cierres del consolidado (CUNI): geojson-points con filtro por _molecula
    if (App.map.getLayer("geojson-points")) {
      const visibleConsolidated = showPins && (filterCierres?.checked !== false);
      const filterPoints = selectedMoleculaForPins
        ? ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "_molecula"], selectedMoleculaForPins]]
        : ["==", ["geometry-type"], "Point"];
      try {
        App.map.setLayoutProperty("geojson-points", "visibility", visibleConsolidated ? "visible" : "none");
        App.map.setFilter("geojson-points", filterPoints);
      } catch (e) {}
    }
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
      setSelectedMoleculaForPins(value || null);
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

    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        closeDropdown();
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
      const res = await fetch(CABLES_INDEX_URL, { cache: "default" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
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
    } catch (error) {
      console.error("❌ Error cargando cables para buscador:", error);
    }
  }

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

  /** Obtener molécula de un cable (ej. SI22): del índice o extraída de layerId/nombre. */
  function getMoleculaFromCable(cable) {
    if (cable.molecula && /^[A-Z]{2}\d+$/i.test(cable.molecula)) return cable.molecula;
    if (cable.layerId && typeof cable.layerId === "string") {
      const parts = cable.layerId.split("_");
      const match = parts.find(function (p) { return /^[A-Z]{2}\d+$/.test(p); });
      if (match) return match;
    }
    const from = (cable.name || "").toString();
    const molMatch = from.match(/(SI\d+)/i);
    return molMatch ? molMatch[1].toUpperCase() : null;
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
     Event Listeners
  ========================= */
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

    // Cerrar resultados al hacer clic fuera
    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        hideResults();
      }
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
  function performSearch(query, retryCount) {
    if (!query || query.trim().length === 0) {
      hideResults();
      return;
    }

    currentSearch = query;
    if (typeof retryCount !== "number") retryCount = 0;

    // ✅ Si el índice está vacío, mostrar "Cargando..." y reintentar cuando haya datos
    const totalItems = searchIndex.centrales.length + searchIndex.cables.length + searchIndex.cierres.length + searchIndex.eventos.length;
    if (totalItems === 0) {
      if (retryCount < SEARCH_MAX_RETRIES) {
        searchResults.innerHTML = `<div class="search-no-results"><i class="fas fa-spinner fa-spin"></i><div>Cargando índice de búsqueda...</div></div>`;
        searchResults.classList.remove("hidden");
        if (isCorporativo) loadCablesCorporativo(); else { loadCentrales(); loadCables(); }
        setTimeout(() => performSearch(query, retryCount + 1), SEARCH_RETRY_DELAY_MS);
      } else {
        searchResults.innerHTML = `<div class="search-no-results"><i class="fas fa-search"></i><div>No se encontraron resultados</div></div>`;
        searchResults.classList.remove("hidden");
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

    // Añadir cables de la misma molécula (relacionados): ej. buscar SI17FH144 → mostrar también SI17FH48, etc.
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

    allResults = allResults.slice(0, maxResults);

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
      <div class="search-results-list">
        ${allResults.map(result => {
          const displayName = result.type === "cable" ? cableNameForDisplay(result.layerId, result.name) : result.name;
          return `
          <div class="search-result-item" data-type="${result.type}" data-id="${result.id}">
            <div class="search-result-icon ${result.type}">
              ${result.icon}
            </div>
            <div class="search-result-content">
              <div class="search-result-title">
                ${highlightMatch(displayName, currentSearch)}
                <span class="search-result-badge">${result.type}</span>
              </div>
              <div class="search-result-subtitle">${result.subtitle || ""}</div>
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
  function selectResult(result) {
    if (!App.map || !result.coordinates) {
      console.warn("⚠️ No se puede hacer zoom: mapa o coordenadas no disponibles");
      hideResults();
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

    // Hacer zoom al resultado
    App.map.flyTo({
      center: result.coordinates,
      zoom: result.type === "central" ? 15 : 17,
      duration: MAP_FLYTO_DURATION_MS
    });

    // Mostrar capas del cable seleccionado
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
        // GIS FTTH: mostrar todos los cables de la misma molécula (ej. SI17FH144 → SI17FH48, SI17FH144, etc.)
        const mol = result.molecula || getMoleculaFromCable(result);
        function applyCableFilter() {
          try {
            if (!App.map || !App.map.getLayer("geojson-lines")) return false;
            if (mol) {
              App.map.setFilter("geojson-lines", ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "_molecula"], mol]]);
            } else {
              App.map.setFilter("geojson-lines", ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "_layerId"], result.layerId]]);
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
      }
    }
    if (result.type === "cierre") {
      if (result.molecula && typeof App.setSelectedMoleculaForPins === "function") {
        App.setSelectedMoleculaForPins(result.molecula);
      }
      if (App.map.getLayer(LAYER_CIERRES)) {
        App.map.setLayoutProperty(LAYER_CIERRES, "visibility", "visible");
      }
      const fc = document.getElementById("filterCierres");
      if (fc) fc.checked = true;
    }
    if (result.type === "evento") {
      if (result.molecula && typeof App.setSelectedMoleculaForPins === "function") {
        App.setSelectedMoleculaForPins(result.molecula);
      }
      if (App.map.getLayer(LAYER_EVENTOS)) {
        App.map.setLayoutProperty(LAYER_EVENTOS, "visibility", "visible");
      }
      const fe = document.getElementById("filterEventos");
      if (fe) fe.checked = true;
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
     Utilidades
  ========================= */
  function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
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
