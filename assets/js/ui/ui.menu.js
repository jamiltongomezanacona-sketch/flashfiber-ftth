/* =========================================================
   FlashFiber FTTH | UI MENU
   Control de botones flotantes
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const wait = setInterval(() => {
    const App = window.__FTTH_APP__;
    if (!App?.map) return;

    clearInterval(wait);
    console.log("✅ ui.menu.js cargado");

    const btnCapas = document.getElementById("btnOpenLayers") || document.getElementById("btnCapas");

    if (!btnCapas) {
      console.warn("⚠️ Botón Capas (btnOpenLayers/btnCapas) no encontrado en DOM");
      return;
    }

    btnCapas.addEventListener("click", toggleFTTHLayers);

    /* =========================
       TOGGLE CAPAS FTTH
    ========================= */
    function toggleFTTHLayers() {
      const App = window.__FTTH_APP__;
      const map = App.map;

      /* =========================
         1️⃣ Cargar FTTH si aún no está cargado
      ========================= */
      if (!App.__ftthLoaded) {
        console.log("📂 Cargando árbol FTTH...");
        if (typeof App.loadFTTHTree === "function") {
          App.loadFTTHTree();
          App.__ftthLoaded = true;
        } else {
          console.warn("⚠️ App.loadFTTHTree no está definido");
        }
        return;
      }

      /* =========================
         2️⃣ Toggle de capas FTTH reales
      ========================= */
      const layers = map.getStyle().layers || [];
      
      // ✅ Buscar capas FTTH individuales (FTTH_*) y consolidadas (geojson-*, ftth-*)
      const ftthLayers = layers
        .map(l => l.id)
        .filter(id => 
          id.startsWith("FTTH_") || 
          id.startsWith("geojson-") || 
          id.startsWith("ftth-")
        );

      if (!ftthLayers.length) {
        console.warn("⚠️ No hay capas FTTH creadas todavía");
        console.log("🔍 Capas disponibles:", layers.map(l => l.id).join(", "));
        return;
      }
      
      console.log(`✅ Encontradas ${ftthLayers.length} capas FTTH:`, ftthLayers.join(", "));

      ftthLayers.forEach(id => {
        if (!map.getLayer(id)) return;

        const visible =
          map.getLayoutProperty(id, "visibility") !== "none";

        map.setLayoutProperty(
          id,
          "visibility",
          visible ? "none" : "visible"
        );

        // GIS FTTH: al ACTIVAR capas, mostrar TODOS los cables (quitar filtro por _layerId)
        if (id === "geojson-lines" && !visible) {
          try {
            map.setFilter("geojson-lines", ["==", ["geometry-type"], "LineString"]);
            if (App) App.__cablesExplicitlyVisible = true;
            console.log("🧵 geojson-lines: filtro quitado → se muestran todos los cables");
          } catch (e) {
            console.warn("⚠️ No se pudo quitar filtro geojson-lines:", e);
          }
        }
        if (id === "geojson-lines" && visible) {
          if (App) App.__cablesExplicitlyVisible = false;
        }
      });

      console.log("🗺️ Toggle FTTH:", ftthLayers.length, "capas");
    }

  }, 300);
});
