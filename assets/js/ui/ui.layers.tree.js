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
    checkbox.checked = false;     // 🔴 Arranque desactivado

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
    checkbox.addEventListener("change", () => {
      toggleChildren(childrenBox, checkbox.checked);
      toggleLayers(label.textContent, checkbox.checked);
    });

    /* =========================
       Cargar hijos
    ========================= */
    if (node.children?.length) {
      for (const child of node.children) {
        if (!child.index) continue;

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

})();
