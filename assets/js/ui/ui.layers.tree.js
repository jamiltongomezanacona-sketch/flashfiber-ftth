/* =========================================================
   FlashFiber FTTH | Árbol con expand/collapse y arranque OFF
========================================================= */

(function () {
  "use strict";

  const TREE_CONTAINER_ID = "layersTree";
  const ROOT_INDEX = "../geojson/index.json";

  // ✅ Sistema de inicialización mejorado
  async function init() {
    await waitForDependencies();
    console.log("🌳 UI Layers Tree listo");
    loadRoot();
    
    // ✅ Recargar árbol después de que las capas consolidadas se registren
    const App = window.__FTTH_APP__;
    if (App) {
      // Esperar a que se carguen las capas consolidadas
      const checkInterval = setInterval(() => {
        if (App.__ftthLayerIds && App.__ftthLayerIds.length > 0) {
          const hasConsolidated = App.__ftthLayerIds.some(id => 
            id.startsWith("geojson-") || id.startsWith("ftth-")
          );
          if (hasConsolidated) {
            clearInterval(checkInterval);
            // Recargar árbol para incluir capas consolidadas
            setTimeout(() => {
              loadRoot();
              console.log("🔄 Árbol recargado con capas consolidadas");
            }, 1000);
          }
        }
      }, 500);
      
      // Limpiar después de 10 segundos si no se encuentran capas
      setTimeout(() => clearInterval(checkInterval), 10000);
    }
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
      const res = await fetch(ROOT_INDEX, { cache: "no-store" });
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
        
        // Si la capa no existe y tiene path, intentar cargarla
        const App = window.__FTTH_APP__;
        const map = App?.map;
        if (map && !map.getLayer(node.id) && node.path) {
          console.log("🔄 Capa no encontrada, intentando cargar:", node.id);
          // Forzar recarga del árbol para cargar la capa
          if (typeof App.loadFTTHTree === "function") {
            await App.loadFTTHTree();
            // Esperar un momento y volver a intentar el toggle
            setTimeout(() => {
              if (map.getLayer(node.id)) {
                toggleLayerById(node.id, checkbox.checked);
              } else {
                console.warn("⚠️ No se pudo cargar la capa:", node.id);
                checkbox.checked = false; // Revertir checkbox si falla
              }
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

            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json();

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
          console.warn("⚠️ No se pudo cargar:", basePath + (child.index || child.path || ""), err.message);
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
      // Evitar toggles redundantes y bucles (solo aplicar si el estado cambia)
      if (current === desired) return;
      map.setLayoutProperty(layerId, "visibility", desired);
      console.log(`${visible ? "✅" : "❌"} Capa ${layerId} ${visible ? "habilitada" : "deshabilitada"}`);
      // Si se activa una capa de cable (línea), activar pines filtrados por esa molécula
      if (visible) {
        const layer = map.getLayer(layerId);
        const isCable = layer && (layer.type === "line" || layerId === "geojson-lines" || layerId === "ftth-cables");
        if (isCable) showPinsWhenCableActivated(layerId);
      }
    } else {
      console.warn("⚠️ Capa no encontrada:", layerId);
      // Intentar cargar la capa si no existe (para capas que se cargan dinámicamente)
      if (typeof App.loadFTTHTree === "function") {
        console.log("🔄 Intentando cargar capa:", layerId);
        App.loadFTTHTree();
        // Reintentar después de un breve delay
        setTimeout(() => {
          if (map.getLayer(layerId)) {
            toggleLayerById(layerId, visible);
          }
        }, 500);
      }
    }
  }

})();
