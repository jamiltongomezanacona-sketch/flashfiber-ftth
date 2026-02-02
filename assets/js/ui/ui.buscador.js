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

  // Índice de búsqueda
  const searchIndex = {
    centrales: [],
    cables: [],
    cierres: []
  };

  /* =========================
     Inicialización
  ========================= */
  async function init() {
    // ✅ Cargar centrales y cables inmediatamente (no requieren Firebase ni mapa)
    await loadCentrales();
    await loadCables();
    
    // ✅ Configurar event listeners de inmediato
    setupEventListeners();
    console.log("🔍 Buscador inicializado (centrales y cables cargados)");
    
    // ✅ Cargar cierres cuando Firebase esté disponible (en segundo plano)
    waitForFirebaseAndLoadCierres();
  }

  async function waitForFirebaseAndLoadCierres(maxAttempts = 100) {
    // Esperar solo por Firebase para cargar cierres
    for (let i = 0; i < maxAttempts; i++) {
      if (window.FTTH_FIREBASE) {
        await loadCierres();
        console.log(`✅ Cierres cargados: ${searchIndex.cierres.length} cierres`);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.warn("⚠️ Firebase no disponible para cargar cierres");
    return false;
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
      const res = await fetch("../geojson/index.json", { cache: "no-store" });
      const root = await res.json();
      
      // Recorrer árbol recursivamente
      await walkTreeForCables(root, "../geojson/");
    } catch (error) {
      console.warn("⚠️ No se pudieron cargar cables:", error);
    }
  }

  async function walkTreeForCables(node, basePath) {
    if (!node) return;

    // Si es una capa de tipo "layer"
    if (node.type === "layer") {
      try {
        const url = basePath + node.path;
        const res = await fetch(url, { cache: "no-store" });
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
            }
          });
        }
      } catch (error) {
        // Ignorar errores de carga individual
      }
      return;
    }

    // Si tiene hijos, recorrerlos
    if (node.children?.length) {
      for (const child of node.children) {
        if (child.type === "layer") {
          await walkTreeForCables(child, basePath);
        } else if (child.index) {
          try {
            const url = basePath + child.index;
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json();
            const nextBase = basePath + child.index.replace("index.json", "");
            await walkTreeForCables(json, nextBase);
          } catch (error) {
            // Ignorar errores
          }
        }
      }
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
    currentSearch = query;
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
    
    // Buscar en cierres
    searchIndex.cierres.forEach(cierre => {
      const searchText = `${cierre.name} ${cierre.codigo || ""} ${cierre.central || ""} ${cierre.molecula || ""} ${cierre.tipo || ""}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        allResults.push(cierre);
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
          </div>
        `).join("")}
      </div>
    `;
    
    searchResults.innerHTML = html;
    searchResults.classList.remove("hidden");
    
    // Event listeners para items
    searchResults.querySelectorAll(".search-result-item").forEach(item => {
      item.addEventListener("click", () => {
        const type = item.dataset.type;
        const id = item.dataset.id;
        const result = allResults.find(r => r.type === type && r.id === id);
        if (result) {
          selectResult(result);
        }
      });
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
    
    // Si es un cable, asegurar que la capa esté visible
    if (result.type === "cable" && result.layerId) {
      const layer = App.map.getLayer(result.layerId);
      if (layer) {
        App.map.setLayoutProperty(result.layerId, "visibility", "visible");
      }
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
