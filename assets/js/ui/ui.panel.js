/* =========================================================
   FlashFiber FTTH | ui.panel.js
   Sidebar Overlay + Unified Tool Controller (FINAL)
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App) {
    console.error("❌ App no disponible en ui.panel.js");
    return;
  }

  console.log("✅ ui.panel.js listo");

  /* ===============================
     SIDEBAR OVERLAY
  =============================== */

  const sidebar = document.getElementById("sidebar");
  const btnSidebar = document.getElementById("btnSidebar");
  const sidebarOverlay = document.querySelector(".sidebar-overlay");

  if (!sidebar || !btnSidebar) {
    console.warn("⚠️ Sidebar overlay no encontrada en DOM");
    return;
  }

  function toggleSidebar() {
    const isHidden = sidebar.classList.contains("hidden");
    sidebar.classList.toggle("hidden");
    
    // Toggle overlay
    if (sidebarOverlay) {
      if (isHidden) {
        sidebarOverlay.classList.add("active");
      } else {
        sidebarOverlay.classList.remove("active");
      }
    }
  }

  btnSidebar.addEventListener("click", toggleSidebar);
  
  // Cerrar sidebar al hacer click en overlay
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      if (!sidebar.classList.contains("hidden")) {
        toggleSidebar();
      }
    });
  }

  /* ===============================
     TOOL CONTROLLER CENTRAL
  =============================== */

  const toolButtons = {
  gps: document.querySelector('[data-action="gps"]'),
  medir: document.querySelector('[data-action="medir"]'),
  navegar: document.querySelector('[data-action="navegar"]'),
  ruta: document.querySelector('[data-action="ruta"]'),
  cierres: document.querySelector('[data-action="cierres"]'),
  eventos: document.querySelector('[data-action="eventos"]')   // 🚨 NUEVO
};


  const toolState = {
  gps: false,
  medir: false,
  navegar: false,
  ruta: false,
  cierres: false,
  eventos: false   // 🚨 NUEVO
};


  function apagarTool(tool) {
    if (!toolState[tool]) return;

    toolState[tool] = false;
    toolButtons[tool]?.classList.remove("active");

    try {
      if (tool === "gps") App.tools.gps?.stop();
if (tool === "medir") App.tools.medicion?.stop();
if (tool === "navegar") App.tools.navegacion?.stop();
if (tool === "ruta") App.tools.rutas?.stop();
if (tool === "cierres") App.tools.cierres?.stop();
if (tool === "eventos") App.tools.eventos?.stop();   // 🚨
    } catch (e) {
      console.warn("⚠️ Error apagando tool:", tool);
    }
  }

  function encenderTool(tool) {
  toolState[tool] = true;
  toolButtons[tool]?.classList.add("active");

  try {

    if (tool === "gps") App.tools.gps?.start();
    if (tool === "medir") App.tools.medicion?.start();
    if (tool === "navegar") App.tools.navegacion?.start();
    if (tool === "ruta") App.tools.rutas?.start();
    if (tool === "eventos") App.tools.eventos?.start();

    // ✅ CIERRES con espera automática (robusto)
    if (tool === "cierres") {
      let intentos = 0;

      const timer = setInterval(() => {
        intentos++;

        if (App.tools.cierres?.start) {
          clearInterval(timer);
          console.log("✅ tool.cierres detectado → encendiendo");
          App.tools.cierres.start();
          return;
        }

        if (intentos >= 30) {   // ~3 segundos
          clearInterval(timer);
          console.warn("❌ tool.cierres no cargó a tiempo");
        }
      }, 100);
    }

  } catch (e) {
    console.warn("⚠️ Error encendiendo tool:", tool, e);
  }
}

  function toggleTool(tool) {
    const estabaActivo = toolState[tool];

    // 🔴 Apagar todas primero
    Object.keys(toolState).forEach(t => apagarTool(t));

    // 🟢 Encender si estaba apagado
    if (!estabaActivo) {
      encenderTool(tool);
    }
  }

  /* ===============================
     BIND BOTONES SIDEBAR
  =============================== */

toolButtons.gps?.addEventListener("click", () => toggleTool("gps"));
toolButtons.medir?.addEventListener("click", () => toggleTool("medir"));
toolButtons.navegar?.addEventListener("click", () => toggleTool("navegar"));
toolButtons.ruta?.addEventListener("click", () => toggleTool("ruta"));
toolButtons.cierres?.addEventListener("click", () => toggleTool("cierres"));
toolButtons.eventos?.addEventListener("click", () => toggleTool("eventos"));  // 🚨
  /* ===============================
     BOTONES FLOTANTES (MAP HUD)
  =============================== */

  const btnGPSMap = document.getElementById("btnGPS");
  const btnMedirMap = document.getElementById("btnMedir");
  const btnCapasMap = document.getElementById("btnCapas");
  const btnBaseMap = document.getElementById("btnBaseMap");
  const btnFinishRuta = document.getElementById("btnFinishRuta");

  btnGPSMap?.addEventListener("click", () => toggleTool("gps"));
  btnMedirMap?.addEventListener("click", () => toggleTool("medir"));

  // ✔️ Finalizar ruta manualmente (móvil)
  btnFinishRuta?.addEventListener("click", () => {
    App.tools.rutas?.finish();
  });

/* ===============================
   MAPA BASE (CAMBIO SEGURO)
=============================== */

let modoSatelite = true;

btnBaseMap?.addEventListener("click", () => {
  if (!App.map) return;

  modoSatelite = !modoSatelite;

  const estilo = modoSatelite
    ? "mapbox://styles/mapbox/satellite-streets-v12"
    : "mapbox://styles/mapbox/streets-v12";

  console.log("🎨 Cambiando estilo:", estilo);

  App.map.setStyle(estilo);
  btnBaseMap.classList.toggle("active", !modoSatelite);

  // ⏳ Esperar a que el mapa quede totalmente estable
  App.map.once("idle", () => {
    console.log("✅ Estilo estable → restaurando capas y datos");

    // ✅ CARGAR TODO EL GEOJSON CONSOLIDADO EN EL MAPA BASE
    if (App.loadConsolidatedGeoJSONToBaseMap) {
      App.loadConsolidatedGeoJSONToBaseMap();
    }

    // 🗺️ Capas FTTH (GeoJSON base)
    App.layers?.reload?.();

    // 🛣️ Rutas guardadas
    const rutas = window.__FTTH_STORAGE__?.getRutas?.() || [];
    rutas.forEach(feature => {
      window.drawSavedRoute?.(feature);
    });

    // 📍 Cierres
    App.tools.cierres?.renderAll?.();

    // 📌 Eventos
    App.tools.eventos?.renderAll?.();
  });
});

  /* ===============================
     🗺️ PANEL CAPAS (CON FALLBACK)
  =============================== */

  const layersPanel = document.getElementById("layersPanel");

  if (!App.tools.capas) {
    console.warn("⚠️ tool.capas no detectado → usando fallback");

    App.tools.capas = {
      open() {
        if (!layersPanel) {
          console.warn("❌ Panel capas no existe");
          return;
        }
        layersPanel.classList.remove("hidden");
      },
      close() {
        layersPanel?.classList.add("hidden");
      }
    };
  }

  // Abrir desde botón HUD
  btnCapasMap?.addEventListener("click", () => {
    console.log("🔘 Botón Capas (HUD) clickeado");
    App.tools.capas?.open();
  });

  // Abrir desde sidebar
  const btnOpenLayers = document.getElementById("btnOpenLayers");
  if (btnOpenLayers) {
    btnOpenLayers.addEventListener("click", () => {
      console.log("🔘 Botón Capas (Sidebar) clickeado");
      App.tools.capas?.open();
    });
  } else {
    console.warn("⚠️ Botón btnOpenLayers no encontrado en DOM");
  }

  // Cerrar panel
  document.getElementById("btnCloseLayers")
    ?.addEventListener("click", () => {
      App.tools.capas.close();
    });

});