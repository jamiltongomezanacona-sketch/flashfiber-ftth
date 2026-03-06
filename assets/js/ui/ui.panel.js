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
  corregirRuta: document.querySelector('[data-action="corregirRuta"]'),
  cierres: document.querySelector('[data-action="cierres"]'),
  eventos: document.querySelector('[data-action="eventos"]'),
  posteria: document.querySelector('[data-action="posteria"]')
};

  // ✅ Debug: Verificar que el botón de eventos se encontró
  if (!toolButtons.eventos) {
    console.warn("⚠️ Botón de eventos no encontrado en el DOM");
  } else {
    console.log("✅ Botón de eventos encontrado:", toolButtons.eventos);
  }


  const toolState = {
  gps: false,
  medir: false,
  navegar: false,
  ruta: false,
  corregirRuta: false,
  cierres: false,
  eventos: false,
  posteria: false
};


  function apagarTool(tool) {
    if (!toolState[tool]) return;

    toolState[tool] = false;
    toolButtons[tool]?.classList.remove("active");

    try {
      if (tool === "gps") {
        App.tools.gps?.stop();
        document.getElementById("btnGPS")?.classList.remove("active");
      }
if (tool === "medir") App.tools.medicion?.stop();
if (tool === "navegar") App.tools.navegacion?.stop();
if (tool === "ruta") App.tools.rutas?.stop();
if (tool === "corregirRuta") { window.__CORREGIR_RUTA_MODE__ = false; App.tools.rutas?.stop(); }
if (tool === "cierres") App.tools.cierres?.stop();
if (tool === "eventos") App.tools.eventos?.stop();
if (tool === "posteria") App.tools.posteria?.stop();
    } catch (e) {
      console.warn("⚠️ Error apagando tool:", tool);
    }
    document.getElementById("btnFinalizarRuta")?.classList.add("hidden");
  }

  function encenderTool(tool) {
  toolState[tool] = true;
  toolButtons[tool]?.classList.add("active");

  try {

    if (tool === "gps") {
      App.tools.gps?.start();
      document.getElementById("btnGPS")?.classList.add("active");
    }
    if (tool === "medir") App.tools.medicion?.start();
    if (tool === "navegar") App.tools.navegacion?.start();
    if (tool === "ruta") App.tools.rutas?.start();
    if (tool === "corregirRuta") {
      window.__CORREGIR_RUTA_MODE__ = true;
      App.tools.rutas?.start();
    }
    if (tool === "ruta" || tool === "corregirRuta") {
      document.getElementById("btnFinalizarRuta")?.classList.remove("hidden");
    }

    // ✅ EVENTOS con espera automática (robusto)
    if (tool === "eventos") {
      let intentos = 0;

      const timer = setInterval(() => {
        intentos++;

        if (App.tools.eventos?.start) {
          clearInterval(timer);
          console.log("✅ tool.eventos detectado → encendiendo");
          App.tools.eventos.start();
          return;
        }

        if (intentos >= 30) {   // ~3 segundos
          clearInterval(timer);
          console.warn("❌ tool.eventos no cargó a tiempo");
        }
      }, 100);
    }

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

    // Montar posteria: si existe tool, encenderlo; si no, solo aviso (sin activar botón)
    if (tool === "posteria") {
      if (App.tools.posteria?.start) {
        App.tools.posteria.start();
      } else {
        toolState.posteria = false;
        toolButtons.posteria?.classList.remove("active");
        if (typeof App.ui?.notify === "function") {
          App.ui.notify("Montar posteria – Próximamente");
        } else {
          console.log("🏗️ Montar posteria – herramienta en desarrollo");
        }
      }
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

  window.addEventListener("ftth-switch-tool", (e) => {
    const tool = e.detail?.tool;
    if (!tool) return;
    Object.keys(toolState).forEach(t => apagarTool(t));
    encenderTool(tool);
    if (toolButtons[tool]) toolButtons[tool].classList.add("active");
  });

  /* ===============================
     BIND BOTONES SIDEBAR
  =============================== */

toolButtons.gps?.addEventListener("click", () => toggleTool("gps"));
toolButtons.medir?.addEventListener("click", () => toggleTool("medir"));
toolButtons.navegar?.addEventListener("click", () => toggleTool("navegar"));
toolButtons.ruta?.addEventListener("click", () => toggleTool("ruta"));
toolButtons.corregirRuta?.addEventListener("click", () => toggleTool("corregirRuta"));
toolButtons.cierres?.addEventListener("click", () => toggleTool("cierres"));
if (toolButtons.eventos) {
  toolButtons.eventos.addEventListener("click", () => toggleTool("eventos"));
}
toolButtons.posteria?.addEventListener("click", () => toggleTool("posteria"));
  /* ===============================
     BOTONES FLOTANTES (MAP HUD)
  =============================== */

  const btnGPSMap = document.getElementById("btnGPS");
  const btnMedirMap = document.getElementById("btnMedir");
  const btnBaseMap = document.getElementById("btnBaseMap");
  const btnLimpiarMapa = document.getElementById("btnLimpiarMapa");

  btnGPSMap?.addEventListener("click", () => {
    if (toolState.gps && App.tools.gps?.recenter) {
      App.tools.gps.recenter();
      btnGPSMap.classList.add("active");
      return;
    }
    toggleTool("gps");
  });
  btnMedirMap?.addEventListener("click", () => toggleTool("medir"));

  const btnFinalizarRuta = document.getElementById("btnFinalizarRuta");
  btnFinalizarRuta?.addEventListener("click", () => {
    if ((toolState.ruta || toolState.corregirRuta) && App.tools.rutas?.finish) {
      App.tools.rutas.finish();
    }
  });

  // 🔄 Reset: mapa limpio, ninguna herramienta ni operación activa (como al inicio)
  btnLimpiarMapa?.addEventListener("click", () => {
    const App = window.__FTTH_APP__;
    if (!App) return;

    // 1. Apagar todas las herramientas (GPS, Medir, Navegar, Ruta, Corregir Ruta, Cierres, Eventos, etc.)
    Object.keys(toolState).forEach((tool) => {
      if (toolState[tool]) apagarTool(tool);
    });
    document.getElementById("btnGPS")?.classList.remove("active");
    document.getElementById("btnFinalizarRuta")?.classList.add("hidden");

    // 2. Limpiar mapa: sin molécula, solo centrales visibles
    if (typeof App.setSelectedMoleculaForPins === "function") {
      App.setSelectedMoleculaForPins(null);
    }
    const runEnforce = () => {
      if (typeof App.enforceOnlyCentralesVisible === "function") {
        App.enforceOnlyCentralesVisible();
      }
    };
    if (App.map) {
      if (App.map.isStyleLoaded()) runEnforce();
      else App.map.once("styledata", runEnforce);
    } else {
      runEnforce();
    }
    const filterMolecula = document.getElementById("filterMolecula");
    if (filterMolecula) filterMolecula.value = "";
    const filterMoleculaSearch = document.getElementById("filterMoleculaSearch");
    if (filterMoleculaSearch) filterMoleculaSearch.value = "";

    // 3. Quitar pin de búsqueda (coordenadas/dirección) del mapa
    try {
      if (App.map?.getLayer("search-coordenadas-pin-layer")) App.map.removeLayer("search-coordenadas-pin-layer");
      if (App.map?.getSource("search-coordenadas-pin")) App.map.removeSource("search-coordenadas-pin");
    } catch (e) {}

    // 4. Cerrar sidebar y overlay
    if (sidebar) sidebar.classList.add("hidden");
    if (sidebarOverlay) sidebarOverlay.classList.remove("active");

    // 5. Cerrar paneles (Capas, Gestionar rutas)
    document.getElementById("layersPanel")?.classList.add("hidden");
    document.getElementById("rutasPanel")?.classList.add("hidden");

    // 6. Ocultar resultados del buscador
    document.getElementById("searchResults")?.classList.add("hidden");

    // 7. Cerrar todos los modales
    ["navModal", "routeModal", "corregirRutaModal", "editarRutaModal", "cierreModal", "eventoModal"].forEach((id) => {
      document.getElementById(id)?.classList.add("hidden");
    });
  });

/* ===============================
   MAPA BASE (CAMBIO SEGURO)
=============================== */

let modoSatelite = true;

btnBaseMap?.addEventListener("click", () => {
  if (!App.map) return;

  modoSatelite = !modoSatelite;

  const CONFIG = window.__FTTH_CONFIG__;
  const estilo = modoSatelite
    ? (CONFIG?.MAP?.STYLES?.satellite || "mapbox://styles/mapbox/satellite-streets-v12")
    : (CONFIG?.MAP?.STYLES?.streets || "mapbox://styles/mapbox/streets-v12");

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

  // Capas solo desde sidebar, con contraseña
  const CAPAS_PASSWORD = "7431";
  const btnOpenLayers = document.getElementById("btnOpenLayers");
  if (btnOpenLayers) {
    btnOpenLayers.addEventListener("click", () => {
      const input = window.prompt("Contraseña para acceder a Capas:");
      if (input === CAPAS_PASSWORD) {
        App.tools.capas?.open();
      } else if (input !== null) {
        window.alert("Contraseña incorrecta.");
      }
    });
  } else {
    console.warn("⚠️ Botón btnOpenLayers no encontrado en DOM");
  }

  // Cerrar panel
  document.getElementById("btnCloseLayers")
    ?.addEventListener("click", () => {
      App.tools.capas.close();
    });

  // GIS Corporativo: opción "Ver todos los cables" en panel Capas
  const verTodosCablesCheckbox = document.getElementById("verTodosCablesCheckbox");
  if (verTodosCablesCheckbox) {
    verTodosCablesCheckbox.addEventListener("change", () => {
      const map = App?.map;
      if (!map || !map.getLayer("CABLES_KML")) return;
      const LAYER_EVENTOS = (window.__FTTH_CONFIG__ && window.__FTTH_CONFIG__.LAYERS && window.__FTTH_CONFIG__.LAYERS.EVENTOS) || "eventos-layer";
      if (verTodosCablesCheckbox.checked) {
        map.setFilter("CABLES_KML", null);
        map.setLayoutProperty("CABLES_KML", "visibility", "visible");
        if (map.getLayer(LAYER_EVENTOS)) map.setFilter(LAYER_EVENTOS, null);
      } else {
        map.setFilter("CABLES_KML", ["==", ["get", "name"], "__none__"]);
        if (map.getLayer(LAYER_EVENTOS)) map.setFilter(LAYER_EVENTOS, null);
      }
    });
  }

});
export {};