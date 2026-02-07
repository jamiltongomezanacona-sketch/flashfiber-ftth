/* =========================================================
   FlashFiber FTTH | Árbol con expand/collapse y arranque OFF
========================================================= */

(function () {
  "use strict";

  const TREE_CONTAINER_ID = "layersTree";
  const ROOT_INDEX = (typeof window !== "undefined" && window.__GEOJSON_INDEX__) || "../geojson/index.json";

  // ✅ Sistema de inicialización mejorado
  async function init() {
    await waitForDependencies();
    console.log("🌳 UI Layers Tree listo");
    loadRoot();

    // Recargar árbol cuando las capas consolidadas estén listas (evento en lugar de setInterval)
    function onConsolidatedLayersReady() {
      setTimeout(() => {
        loadRoot();
        console.log("🔄 Árbol recargado con capas consolidadas");
      }, 400);
    }
    window.addEventListener("ftth-consolidated-layers-ready", onConsolidatedLayersReady, { once: false });

    // Fallback: si el evento no llega en 10 s, recargar una vez por si ya hay capas
    setTimeout(() => {
      const App = window.__FTTH_APP__;
      if (App?.__ftthLayerIds?.length && App.__ftthLayerIds.some(id => id.startsWith("geojson-") || id.startsWith("ftth-"))) {
        loadRoot();
      }
    }, 10000);
  }

  async function waitForDependencies(maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      const App = window.__FTTH_APP__;
      if (App?.map) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.warn("⚠️ ui.layers.tree: App.map no disponible después de esperar");
    return false;
  }

  // ✅ Auto-inicializar
  init();

  /* =========================
     Cargar índice raíz
  ========================= */
  async function loadRoot() {
    try {
      const res = await fetch(ROOT_INDEX, { cache: "default" });
      const root = await res.json();
      const container = document.getElementById(TREE_CONTAINER_ID);
      container.innerHTML = "";
      
      // ✅ Agregar capas consolidadas al árbol
      const App = window.__FTTH_APP__;
      if (App && App.__ftthLayerIds && App.__ftthLayerIds.length > 0) {
        // Crear nodo para capas consolidadas
        const consolidatedNode = {
          label: "📦 Capas Consolidadas",
          type: "folder",
          children: []
        };
        
        // Agregar capas consolidadas como hijos
        App.__ftthLayerIds.forEach(layerId => {
          if (layerId.startsWith("geojson-") || layerId.startsWith("ftth-")) {
            const layerName = layerId === "geojson-lines" ? "🧵 Cables (Consolidado)" :
                             layerId === "ftth-cables" ? "🧵 Cables FTTH" :
                             layerId === "ftth-puntos" ? "📍 Puntos FTTH" :
                             layerId === "geojson-points" ? "📍 Puntos (Consolidado)" :
                             layerId;
            
            consolidatedNode.children.push({
              type: "layer",
              id: layerId,
              label: layerName
            });
          }
        });
        
        // Si hay capas consolidadas, agregarlas al root
        if (consolidatedNode.children.length > 0) {
          if (!root.children) {
            root.children = [];
          }
          root.children.unshift(consolidatedNode); // Agregar al inicio
          console.log(`✅ Agregadas ${consolidatedNode.children.length} capas consolidadas al árbol`);
        }
      }
      
      await renderNode(root, container, "", true);   // 👈 raíz cerrada
    } catch (err) {
      console.error("❌ Error cargando árbol raíz", err);
    }
  }

  /* =========================
     Render nodo
  ========================= */
  async function renderNode(node, parentEl, basePath, collapsed = true) {
    const row = document.createElement("div");
    row.className = "tree-row";

    // ▶ Flecha
    const toggle = document.createElement("span");
    toggle.className = "tree-toggle";
    toggle.textContent = collapsed ? "▶" : "▼";

    // ☑ Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    
    // ✅ Si es una capa (type: "layer"), verificar si está cargada y habilitada
    let shouldBeChecked = false;
    if (node.type === "layer" && node.id) {
      checkbox.dataset.layerId = node.id; // Para toggleChildren sin disparar "change"
      const App = window.__FTTH_APP__;
      const map = App?.map;
      if (map && map.getLayer(node.id)) {
        const visibility = map.getLayoutProperty(node.id, "visibility");
        shouldBeChecked = visibility !== "none";
      }
    }
    
    checkbox.checked = shouldBeChecked;

    // 🏷️ Label: capas de cable (FTTH_...) siempre nombre corto ej. SI22FH144_1
    const label = document.createElement("span");
    let displayLabel = node.label;
    const id = node.id || "";
    const isFullCableId = id && id.includes("_") && (id.startsWith("FTTH_") || id.split("_").length >= 4);
    if (isFullCableId) {
      const parts = id.split("_");
      displayLabel = parts.length >= 2 ? parts.slice(-2).join("_") : id;
    } else if (!displayLabel || displayLabel === node.id) {
      if (id && id.includes("_")) {
        const parts = id.split("_");
        displayLabel = parts.length >= 2 ? parts.slice(-2).join("_") : id;
      } else {
        displayLabel = id || "Nodo";
      }
    }
    // CUNI: CU06_CUO6FH144 → CU06FH144
    if (displayLabel && /^CU\d+_CUO?\d+FH/i.test(displayLabel)) {
      const m = displayLabel.match(/^(CU\d+)_(CUO?\d+FH\d+.*)$/i);
      if (m) displayLabel = m[2].replace(/^CUO(\d)/i, "CU0$1");
    }
    // Holanda: HO01_HO01FH144 → HO01FH144
    if (displayLabel && /^HO\d+_HO\d+FH/i.test(displayLabel)) {
      const m = displayLabel.match(/^(HO\d+)_(HO\d+FH\d+.*)$/i);
      if (m) displayLabel = m[2];
    }
    // Bachue: BA05_BAO5FH144 → BA05FH144, BA02_BA02FH144 → BA02FH144
    if (displayLabel && /^BA\d+_BAO?\d+FH/i.test(displayLabel)) {
      const m = displayLabel.match(/^(BA\d+)_(BAO?\d+FH\d+.*)$/i);
      if (m) displayLabel = m[2].replace(/^BAO(\d)/i, "BA0$1");
    }
    // Fontibón: FO05_FO05FH144 → FO05FH144
    if (displayLabel && /^FO\d+_FO\d+FH/i.test(displayLabel)) {
      const m = displayLabel.match(/^(FO\d+)_(FO\d+FH\d+.*)$/i);
      if (m) displayLabel = m[2];
    }
    // Chico: CO02_CO04FH144 → CO04FH144
    if (displayLabel && /^CO\d+_CO\d+FH/i.test(displayLabel)) {
      const m = displayLabel.match(/^(CO\d+)_(CO\d+FH\d+.*)$/i);
      if (m) displayLabel = m[2];
    }
    // Suba: SU01_SU01FH144 → SU01FH144
    if (displayLabel && /^SU\d+_SU\d+FH/i.test(displayLabel)) {
      const m = displayLabel.match(/^(SU\d+)_(SU\d+FH\d+.*)$/i);
      if (m) displayLabel = m[2];
    }
    // Toberín: TO01_TO01FH144 → TO01FH144
    if (displayLabel && /^TO\d+_TO\d+FH/i.test(displayLabel)) {
      const m = displayLabel.match(/^(TO\d+)_(TO\d+FH\d+.*)$/i);
      if (m) displayLabel = m[2];
    }
    // Guaymaral: GU01_GU01FH144 → GU01FH144
    if (displayLabel && /^GU\d+_GU\d+FH/i.test(displayLabel)) {
      const m = displayLabel.match(/^(GU\d+)_(GU\d+FH\d+.*)$/i);
      if (m) displayLabel = m[2];
    }
    // Sufijo con guión para UI (ej. SI22FH144_1 → SI22FH144-1)
    if (displayLabel && /SI\d+FH\d+_\d+$/i.test(displayLabel)) {
      displayLabel = displayLabel.replace(/_(\d+)$/, "-$1");
    }
    label.textContent = displayLabel || "Nodo";

    // 📦 Contenedor hijos
    const childrenBox = document.createElement("div");
    childrenBox.className = "tree-children";
    childrenBox.style.display = collapsed ? "none" : "block";

    row.appendChild(toggle);
    row.appendChild(checkbox);
    row.appendChild(label);
    parentEl.appendChild(row);
    parentEl.appendChild(childrenBox);

    /* =========================
       Expand / Collapse
    ========================= */
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();   // 🔥 evita interferencias
      const isOpen = childrenBox.style.display === "block";
      childrenBox.style.display = isOpen ? "none" : "block";
      toggle.textContent = isOpen ? "▶" : "▼";
    });


    /* =========================
       Toggle capas
    ========================= */
    checkbox.addEventListener("change", async () => {
      const nodeLabel = label.textContent.trim();
      
      // ✅ Si es una molécula (SI01, SI02, etc.) y se está activando
      const isMolecula = /^SI\d+$/.test(nodeLabel);
      
      if (isMolecula) {
        const App = window.__FTTH_APP__;
        if (checkbox.checked) {
          const deactivated = deactivateOtherMoleculas(nodeLabel);
          if (deactivated > 0) {
            console.log(`🔵 Molécula ${nodeLabel} activada; ${deactivated} hermana(s) desactivada(s)`);
          }
          // Mostrar pines (cierres/eventos) de esta molécula en el mapa
          if (typeof App?.setSelectedMoleculaForPins === "function") {
            App.setSelectedMoleculaForPins(nodeLabel);
          }
        } else {
          if (App?.map) {
            deactivateMoleculaLayers(nodeLabel, App.map);
          }
          // Ocultar pines si se desmarca la molécula
          if (typeof App?.setSelectedMoleculaForPins === "function") {
            App.setSelectedMoleculaForPins(null);
          }
        }
      }
      
      // ✅ Si es una capa individual, usar su ID directamente
      if (node.type === "layer" && node.id) {
        toggleLayerById(node.id, checkbox.checked);
        
        // Si la capa no existe: en FTTH usar filter en geojson-lines; en Corporativo cargar árbol
        const App = window.__FTTH_APP__;
        const map = App?.map;
        if (map && !map.getLayer(node.id) && node.path) {
          if (!window.__GEOJSON_INDEX__ && map.getLayer("geojson-lines")) {
            toggleLayerById(node.id, checkbox.checked);
            return;
          }
          console.log("🔄 Capa no encontrada, intentando cargar:", node.id);
          if (typeof App.loadFTTHTree === "function") {
            await App.loadFTTHTree();
            setTimeout(() => {
              if (map.getLayer(node.id)) toggleLayerById(node.id, checkbox.checked);
              else if (!window.__GEOJSON_INDEX__ && map.getLayer("geojson-lines")) toggleLayerById(node.id, checkbox.checked);
              else { console.warn("⚠️ No se pudo cargar la capa:", node.id); checkbox.checked = false; }
            }, 1000);
          }
        }
      } else {
        // Si es una carpeta, propagar a hijos y buscar por label
        toggleChildren(childrenBox, checkbox.checked);
        toggleLayers(nodeLabel, checkbox.checked);
      }
    });

    /* =========================
       Cargar hijos (OPTIMIZADO: en paralelo)
    ========================= */
    if (node.children?.length) {
      // ✅ Cargar todos los hijos en paralelo para mejor rendimiento
      const childPromises = node.children.map(async (child) => {
        try {
          // ✅ Si el child es una capa directa (type: "layer"), renderizarla
          if (child.type === "layer") {
            await renderNode(child, childrenBox, basePath, false);
            return;
          }

          // ✅ Si tiene index.json, cargar como carpeta
          if (child.index) {
            const nextPath = basePath + child.index;
            const url = "../geojson/" + nextPath;

            const res = await fetch(url, { cache: "default" });
            if (!res.ok) {
              // 404 u otro error: no parsear (evitar "Unexpected token" al parsear HTML como JSON)
              return;
            }
            let json;
            try {
              json = await res.json();
            } catch (e) {
              return;
            }

            const childNode = {
              label: child.label || json.label || "Carpeta",
              children: json.children || []
            };

            await renderNode(
              childNode,
              childrenBox,
              basePath + child.index.replace("index.json", ""),
              true // 👈 todos los hijos cerrados
            );
          }
        } catch (err) {
          // No saturar consola con 404 de índices opcionales
          if (err.message && !err.message.includes("JSON") && !err.message.includes("404")) {
            console.warn("⚠️ No se pudo cargar:", basePath + (child.index || child.path || ""), err.message);
          }
        }
      });
      
      // ✅ Esperar a que todos los hijos se carguen en paralelo
      await Promise.allSettled(childPromises);
    } else {
      // Si no tiene hijos, ocultar flecha
      toggle.style.visibility = "hidden";
    }
  }

  /* =========================
     Desactivar otras moléculas (estilo ArcGIS/Google Earth)
     Solo desactiva hermanas del mismo nivel
  ========================= */
  function deactivateOtherMoleculas(activeMolecula) {
    const App = window.__FTTH_APP__;
    if (!App?.map) return 0;
    
    const map = App.map;
    const treeContainer = document.getElementById(TREE_CONTAINER_ID);
    if (!treeContainer) return 0;
    
    let parentContainer = null;
    const allRows = treeContainer.querySelectorAll(".tree-row");
    allRows.forEach(row => {
      const rowLabel = row.querySelector("span:not(.tree-toggle)");
      if (rowLabel && rowLabel.textContent.trim() === activeMolecula) {
        let parent = row.parentElement;
        while (parent && parent !== treeContainer) {
          if (parent.classList.contains("tree-children")) {
            parentContainer = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }
    });
    
    if (!parentContainer) return 0;
    
    const siblingRows = parentContainer.querySelectorAll(".tree-row");
    let deactivatedCount = 0;
    
    siblingRows.forEach(row => {
      const rowLabel = row.querySelector("span:not(.tree-toggle)");
      if (!rowLabel) return;
      
      const labelText = rowLabel.textContent.trim();
      const isMolecula = /^SI\d+$/.test(labelText);
      
      if (isMolecula && labelText !== activeMolecula) {
        const cb = row.querySelector("input[type=checkbox]");
        if (cb && cb.checked) {
          deactivatedCount++;
          cb.checked = false;
          deactivateMoleculaLayers(labelText, map);
          const childrenBox = row.nextElementSibling;
          if (childrenBox && childrenBox.classList.contains("tree-children")) {
            toggleChildren(childrenBox, false);
          }
        }
      }
    });
    
    return deactivatedCount;
  }
  
  /* =========================
     Desactivar todas las capas de una molécula
     (NO desactiva centrales - siempre visibles)
  ========================= */
  function deactivateMoleculaLayers(moleculaLabel, map) {
    if (!map) return;
    
    // Buscar todas las capas que pertenecen a esta molécula
    const allLayers = map.getStyle().layers || [];
    let deactivatedCount = 0;
    
    allLayers.forEach(layer => {
      const layerId = layer.id;
      
      // ✅ NO desactivar centrales - siempre deben estar visibles
      if (layerId.includes("CENTRALES") || layerId.includes("CORPORATIVO")) {
        return;
      }
      
      // Si el ID contiene la molécula (ej: FTTH_SANTA_INES_SI01_...)
      if (layerId.includes(`_${moleculaLabel}_`) || 
          layerId.endsWith(`_${moleculaLabel}`) ||
          layerId.startsWith(`${moleculaLabel}_`)) {
        const visibility = map.getLayoutProperty(layerId, "visibility");
        if (visibility !== "none") {
          map.setLayoutProperty(layerId, "visibility", "none");
          deactivatedCount++;
        }
      }
    });
    
    // Sin log por molécula; el resumen se hace en deactivateOtherMoleculas
  }

  /* =========================
     Propagar selección a hijos (sin disparar "change" en cascada)
  ========================= */
  function toggleChildren(container, state) {
    const rows = container.querySelectorAll(".tree-row");
    rows.forEach(row => {
      const cb = row.querySelector("input[type=checkbox]");
      if (!cb) return;
      cb.checked = state;
      const layerId = cb.dataset.layerId;
      if (layerId) {
        toggleLayerById(layerId, state);
      } else {
        const childBox = row.nextElementSibling;
        if (childBox && childBox.classList.contains("tree-children")) {
          toggleChildren(childBox, state);
        }
      }
    });
  }

  /* =========================
     Control real de capas
     (NO afecta centrales - siempre visibles)
  ========================= */
  function toggleLayers(label, visible) {
    const App = window.__FTTH_APP__;
    if (!App) return;
    const map = App.map;
    if (!map) return;

    const key = (label || "").toUpperCase();
    const ids = App.__ftthLayerIds || [];

    ids.forEach(id => {
      if (!map.getLayer(id)) return;
      
      // ✅ NO afectar centrales - siempre deben estar visibles
      if (id.includes("CENTRALES") || id.includes("CORPORATIVO")) {
        return;
      }

      if (key === "GEOJSON" || id.toUpperCase().includes(key)) {
        map.setLayoutProperty(
          id,
          "visibility",
          visible ? "visible" : "none"
        );
      }
    });
  }

  /* =========================
     Extraer molécula del id de capa de cable (ej. FTTH_SANTA_INES_SI17_SI17FH144_1 → SI17)
  ========================= */
  function extractMoleculaFromCableLayerId(layerId) {
    if (!layerId || typeof layerId !== "string") return null;
    if (layerId === "geojson-lines" || layerId === "ftth-cables") return null;
    const parts = layerId.split("_");
    const match = parts.find(function (p) { return /^[A-Z]{2}\d+$/.test(p); });
    return match || null;
  }

  /* =========================
     Al activar un cable: activar pines filtrados por la molécula de ese cable
     (solo se muestran pines que corresponden al cable, ej. SI17FH144 → molecula SI17)
  ========================= */
  function showPinsWhenCableActivated(layerIdOrMolecula, moleculaFromSearch) {
    const App = window.__FTTH_APP__;
    const CONFIG = window.__FTTH_CONFIG__ || {};
    if (!App?.map) return;
    const map = App.map;
    const molecula = moleculaFromSearch != null ? moleculaFromSearch : extractMoleculaFromCableLayerId(layerIdOrMolecula);
    if (typeof App.setSelectedMoleculaForPins === "function") {
      App.setSelectedMoleculaForPins(molecula);
    }
    const LAYER_CENTRALES = CONFIG.LAYERS?.CENTRALES || "CORPORATIVO_CENTRALES_ETB";
    const LAYER_CIERRES = CONFIG.LAYERS?.CIERRES || "cierres-layer";
    const LAYER_EVENTOS = CONFIG.LAYERS?.EVENTOS || "eventos-layer";
    [LAYER_CENTRALES, LAYER_CIERRES, LAYER_EVENTOS].forEach(function (id) {
      if (map.getLayer(id)) {
        try {
          map.setLayoutProperty(id, "visibility", "visible");
        } catch (e) {}
      }
    });
    const fc = document.getElementById("filterCentrales");
    const fci = document.getElementById("filterCierres");
    const fe = document.getElementById("filterEventos");
    if (fc) fc.checked = true;
    if (fci) fci.checked = true;
    if (fe) fe.checked = true;
  }

  if (window.__FTTH_APP__) {
    window.__FTTH_APP__.showPinsWhenCableActivated = showPinsWhenCableActivated;
  }

  /* =========================
     Toggle capa por ID directo
  ========================= */
  function toggleLayerById(layerId, visible) {
    const App = window.__FTTH_APP__;
    if (!App) return;
    const map = App.map;
    if (!map || !layerId) return;

    // Esperar a que el mapa esté listo si no lo está
    if (!map.isStyleLoaded()) {
      map.once("style.load", () => {
        setTimeout(() => toggleLayerById(layerId, visible), 100);
      });
      return;
    }

    if (map.getLayer(layerId)) {
      const current = map.getLayoutProperty(layerId, "visibility");
      const desired = visible ? "visible" : "none";
      if (current === desired) return;
      map.setLayoutProperty(layerId, "visibility", desired);
      console.log(`${visible ? "✅" : "❌"} Capa ${layerId} ${visible ? "habilitada" : "deshabilitada"}`);
      if (visible) {
        const layer = map.getLayer(layerId);
        const isCable = layer && (layer.type === "line" || layerId === "geojson-lines" || layerId === "ftth-cables");
        if (isCable) showPinsWhenCableActivated(layerId);
      }
    } else if (!window.__GEOJSON_INDEX__ && map.getLayer("geojson-lines")) {
      // GIS FTTH: una capa geojson-lines, filtrar por _layerId (mantener geometry-type)
      if (visible) {
        map.setFilter("geojson-lines", ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "_layerId"], layerId]]);
        map.setLayoutProperty("geojson-lines", "visibility", "visible");
        showPinsWhenCableActivated(layerId);
      } else {
        map.setFilter("geojson-lines", ["all", ["==", ["geometry-type"], "LineString"], ["==", ["get", "_layerId"], "__none__"]]);
      }
      console.log(`${visible ? "✅" : "❌"} Cable ${layerId} (filter en geojson-lines) ${visible ? "visible" : "oculto"}`);
    } else {
      console.warn("⚠️ Capa no encontrada:", layerId);
      if (typeof App.loadFTTHTree === "function") {
        console.log("🔄 Intentando cargar capa:", layerId);
        App.loadFTTHTree();
        setTimeout(() => {
          if (map.getLayer(layerId)) toggleLayerById(layerId, visible);
        }, 500);
      }
    }
  }

})();
