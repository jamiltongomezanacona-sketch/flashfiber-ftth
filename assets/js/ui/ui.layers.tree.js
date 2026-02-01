/* =========================================================
   FlashFiber FTTH | Árbol con expand/collapse y arranque OFF
========================================================= */

(function () {
  "use strict";

  const TREE_CONTAINER_ID = "layersTree";
  const ROOT_INDEX = "../geojson/index.json";

  const wait = setInterval(() => {
    const App = window.__FTTH_APP__;
    if (!App?.map) return;
    clearInterval(wait);
    console.log("🌳 UI Layers Tree listo");
    loadRoot();
  }, 300);

  /* =========================
     Cargar índice raíz
  ========================= */
  async function loadRoot() {
    try {
      const res = await fetch(ROOT_INDEX, { cache: "no-store" });
      const root = await res.json();
      const container = document.getElementById(TREE_CONTAINER_ID);
      container.innerHTML = "";
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
      const App = window.__FTTH_APP__;
      const map = App?.map;
      
      // Verificar si la capa ya está cargada en el mapa
      if (map && map.getLayer(node.id)) {
        // Verificar si está visible
        const visibility = map.getLayoutProperty(node.id, "visibility");
        shouldBeChecked = visibility !== "none";
      } else {
        // Si no está cargada, verificar si el archivo tiene datos
        if (node.path) {
          try {
            const layerUrl = "../geojson/" + basePath + node.path;
            const layerRes = await fetch(layerUrl, { cache: "no-store" });
            const layerData = await layerRes.json();
            
            // Habilitar solo si tiene features
            if (layerData && layerData.features && layerData.features.length > 0) {
              shouldBeChecked = true;
            }
          } catch (err) {
            console.warn("⚠️ No se pudo verificar capa:", node.path);
          }
        }
      }
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
       Cargar hijos
    ========================= */
    if (node.children?.length) {
      for (const child of node.children) {
        // ✅ Si el child es una capa directa (type: "layer"), renderizarla
        if (child.type === "layer") {
          await renderNode(child, childrenBox, basePath, false);
          continue;
        }

        // ✅ Si tiene index.json, cargar como carpeta
        if (child.index) {
          try {
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

          } catch (err) {
            console.warn("⚠️ No se pudo cargar:", basePath + child.index);
          }
        }
      }
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
