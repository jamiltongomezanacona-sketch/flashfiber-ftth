/* =========================================================
   FlashFiber FTTH | Buscador Moderno Multifuncional
   Busca en: Centrales, Cables, Cierres
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
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

  // Índice de búsqueda (centrales, cables, cierres y eventos desde Firebase)
  const searchIndex = {
    centrales: [],
    cables: [],
    cierres: [],
    eventos: []
  };

  const LAYER_CIERRES = "cierres-layer";
  const LAYER_EVENTOS = "eventos-layer";

  /* =========================
     Inicialización
  ========================= */
  async function init() {
    // ✅ Configurar event listeners de inmediato (antes de cargar datos)
    setupEventListeners();
    
    // ✅ Cargar centrales inmediatamente (rápido)
    loadCentrales().then(() => {
      console.log(`✅ Centrales cargadas: ${searchIndex.centrales.length}`);
    });
    
    // ✅ Cargar cables en paralelo (puede tardar más)
    loadCables().then(() => {
      console.log(`✅ Cables cargados: ${searchIndex.cables.length}`);
    });
    
    console.log("🔍 Buscador inicializado - cargando datos en segundo plano");
    
    // ✅ Cargar cierres y eventos cuando Firebase esté disponible (en segundo plano)
    waitForFirebaseAndLoadCierres();
    waitForFirebaseAndLoadEventos();
    setupFilterToggles();
    setupMoleculaFilter();
    if (App) App.setSelectedMoleculaForPins = setSelectedMoleculaForPins;
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
     Filtros: mostrar/ocultar pines Cierres y Eventos
     Por defecto mapa limpio (pines ocultos hasta que se seleccione molécula en Capas)
  ========================= */
  function setupFilterToggles() {
    const filterCierres = document.getElementById("filterCierres");
    const filterEventos = document.getElementById("filterEventos");
    if (!filterCierres || !filterEventos) return;

    // Por defecto mostrar cierres y eventos cuando haya molécula seleccionada
    filterCierres.checked = true;
    filterEventos.checked = true;

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
    }

    filterCierres.addEventListener("change", applyPinsVisibility);
    filterEventos.addEventListener("change", applyPinsVisibility);
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
  }


  /* =========================
     Filtro por molécula (pines Cierres y Eventos)
  ========================= */
  async function setupMoleculaFilter() {
    const select = document.getElementById("filterMolecula");
    if (!select) return;

    try {
      const res = await fetch("../geojson/FTTH/SANTA_INES/index.json", { cache: "no-store" });
      const json = await res.json();
      const moleculas = (json.children || [])
        .filter(c => c.label && /^SI\d+$/.test(c.label))
        .map(c => c.label)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      moleculas.forEach(mol => {
        const opt = document.createElement("option");
        opt.value = mol;
        opt.textContent = mol;
        select.appendChild(opt);
      });
    } catch (e) {
      console.warn("⚠️ No se pudo cargar lista de moléculas:", e);
    }

    select.addEventListener("change", () => {
      const value = select.value || "";
      setSelectedMoleculaForPins(value || null);
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
      const res = await fetch("../geojson/CORPORATIVO/centrales-etb.geojson", { cache: "no-store" });
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
     Cargar cables desde árbol GeoJSON
  ========================= */
  async function loadCables() {
    try {
      console.log("🔍 Iniciando carga de cables para buscador...");
      const res = await fetch("../geojson/index.json", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const root = await res.json();
      
      // Recorrer árbol recursivamente
      await walkTreeForCables(root, "../geojson/");
      
      console.log(`✅ Cables cargados en buscador: ${searchIndex.cables.length} cables encontrados`);
    } catch (error) {
      console.error("❌ Error cargando cables para buscador:", error);
    }
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
        
        const res = await fetch(url, { cache: "no-store" });
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
                  name: codigo,
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
                
                const res = await fetch(url, { cache: "no-store" });
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
              layerId: LAYER_EVENTOS
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
      }, 300);
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
  }

  /* =========================
     Realizar búsqueda
  ========================= */
  function performSearch(query) {
    if (!query || query.trim().length === 0) {
      hideResults();
      return;
    }
    
    currentSearch = query;
    
    // ✅ Verificar si hay datos cargados
    const totalItems = searchIndex.centrales.length + searchIndex.cables.length + searchIndex.cierres.length + searchIndex.eventos.length;
    if (totalItems === 0) {
      console.warn("⚠️ Índice de búsqueda vacío, intentando recargar...");
      // Intentar recargar en segundo plano
      loadCentrales();
      loadCables();
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
    
    // Limitar a 20 resultados
    allResults = allResults.slice(0, 20);
    
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
        ${allResults.map(result => `
          <div class="search-result-item" data-type="${result.type}" data-id="${result.id}">
            <div class="search-result-icon ${result.type}">
              ${result.icon}
            </div>
            <div class="search-result-content">
              <div class="search-result-title">
                ${highlightMatch(result.name, currentSearch)}
                <span class="search-result-badge">${result.type}</span>
              </div>
              <div class="search-result-subtitle">${result.subtitle || ""}</div>
            </div>
            <button type="button" class="search-result-btn-seleccionar" title="Seleccionar y ubicar en el mapa">Seleccionar</button>
          </div>
        `).join("")}
      </div>
    `;
    
    searchResults.innerHTML = html;
    searchResults.classList.remove("hidden");
    
    // Clic en la fila o en el botón "Seleccionar"
    searchResults.addEventListener("click", (e) => {
      const btn = e.target.closest(".search-result-btn-seleccionar");
      const row = e.target.closest(".search-result-item");
      if (!row) return;
      const type = row.dataset.type;
      const id = row.dataset.id;
      const result = allResults.find(r => r.type === type && r.id === id);
      if (!result) return;
      if (btn) e.stopPropagation();
      selectResult(result);
    });
  }

  /* =========================
     Seleccionar resultado
  ========================= */
  function selectResult(result) {
    if (!App.map || !result.coordinates) {
      console.warn("⚠️ No se puede hacer zoom: mapa o coordenadas no disponibles");
      return;
    }
    
    // Hacer zoom al resultado
    App.map.flyTo({
      center: result.coordinates,
      zoom: result.type === "central" ? 15 : 17,
      duration: 1500
    });
    
    // Asegurar que la capa del resultado esté visible (cable, cierre o evento)
    if (result.type === "cable" && result.layerId) {
      if (App.map.getLayer(result.layerId)) {
        App.map.setLayoutProperty(result.layerId, "visibility", "visible");
      }
    }
    if (result.type === "cierre") {
      if (App.map.getLayer(LAYER_CIERRES)) {
        App.map.setLayoutProperty(LAYER_CIERRES, "visibility", "visible");
      }
      const fc = document.getElementById("filterCierres");
      if (fc) fc.checked = true;
    }
    if (result.type === "evento") {
      if (App.map.getLayer(LAYER_EVENTOS)) {
        App.map.setLayoutProperty(LAYER_EVENTOS, "visibility", "visible");
      }
      const fe = document.getElementById("filterEventos");
      if (fe) fe.checked = true;
    }
    
    // Cerrar resultados
    hideResults();
    searchInput.blur();
    
    console.log(`🎯 Zoom a ${result.type}: ${result.name}`);
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
