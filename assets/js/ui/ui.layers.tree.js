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
    // OPTIMIZADO: Solo verificar en el mapa, no hacer fetch innecesario
    let shouldBeChecked = false;
    if (node.type === "layer" && node.id) {
      const App = window.__FTTH_APP__;
      const map = App?.map;
      
      // Verificar si la capa ya está cargada en el mapa
      if (map && map.getLayer(node.id)) {
        // Verificar si está visible
        const visibility = map.getLayoutProperty(node.id, "visibility");
        shouldBeChecked = visibility !== "none";
      }
      // ❌ REMOVIDO: No hacer fetch para verificar si tiene datos
      // Esto causa lentitud innecesaria. La capa se verificará cuando se intente activar.
    }
    
    checkbox.checked = shouldBeChecked;

    // 🏷️ Label
    const label = document.createElement("span");
    label.textContent = node.label || "Nodo";

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
        toggleLayers(label.textContent, checkbox.checked);
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
     Propagar selección a hijos
  ========================= */
  function toggleChildren(container, state) {
    const boxes = container.querySelectorAll("input[type=checkbox]");
    boxes.forEach(cb => {
      cb.checked = state;
      cb.dispatchEvent(new Event("change"));
    });
  }

  /* =========================
     Control real de capas
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
      map.setLayoutProperty(
        layerId,
        "visibility",
        visible ? "visible" : "none"
      );
      console.log(`${visible ? "✅" : "❌"} Capa ${layerId} ${visible ? "habilitada" : "deshabilitada"}`);
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
