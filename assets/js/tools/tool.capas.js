/* =========================================================
   FlashFiber FTTH | tool.capas.js
   Panel Capas - Árbol dinámico desde index.json (FASE 2)
========================================================= */

(() => {
  "use strict";

  const INDEX_URL = "../geojson/FTTH/index.json";

  function init() {
    const App = window.__FTTH_APP__;
    if (!App) return;

    App.tools = App.tools || {};

    const panel = document.getElementById("layersPanel");
    const tree  = document.getElementById("layersTree");

    if (!panel || !tree) {
      console.warn("❌ Panel capas no encontrado");
      return;
    }

    console.log("🌳 Cargando índice FTTH...");

    let dataCache = null;

    /* ============================
       Render árbol
    ============================ */

    function renderNodo(nodo, container, nivel = 0) {
      const row = document.createElement("div");
      row.style.paddingLeft = (nivel * 18) + "px";
      row.style.marginBottom = "6px";
      row.style.userSelect = "none";
      row.style.cursor = "pointer";

      const isFolder = nodo.type === "folder" || nodo.children;
      const icon = isFolder ? "📂" : "☐";

      row.textContent = `${icon} ${nodo.label || nodo.nombre}`;
      container.appendChild(row);
    }

    function renderTree(indexData) {
      tree.innerHTML = "";

      // Nodo raíz
      renderNodo({ label: indexData.label }, tree, 0);

      // Hijos (centrales)
      indexData.children?.forEach(child => {
        renderNodo(child, tree, 1);
      });
    }

    /* ============================
       Cargar index.json
    ============================ */

    async function loadIndex() {
      if (dataCache) return dataCache;

      try {
        const resp = await fetch(INDEX_URL);
        if (!resp.ok) throw new Error("No se pudo leer index.json");

        const json = await resp.json();
        dataCache = json;

        console.log("✅ Índice FTTH cargado:", json);
        return json;

      } catch (err) {
        console.error("❌ Error cargando índice:", err);
        alert("❌ No se pudo cargar el índice FTTH");
        return null;
      }
    }

    /* ============================
       API pública
    ============================ */

    async function open() {
      panel.classList.remove("hidden");

      if (!tree.hasChildNodes()) {
        const indexData = await loadIndex();
        if (indexData) {
          renderTree(indexData);
        }
      }
    }

    function close() {
      panel.classList.add("hidden");
    }

    App.tools.capas = { open, close };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();