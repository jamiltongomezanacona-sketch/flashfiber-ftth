/* =========================================================
   FlashFiber FTTH | app.js
========================================================= */

(() => {
  "use strict";

  const CONFIG = window.__FTTH_CONFIG__;
  if (!CONFIG) {
    console.error("❌ FTTH_CONFIG no cargado");
    return;
  }

  const App = {
    CONFIG,
    map: null,
    ready: false,
    tools: {},

    // =========================
    // DATA GLOBAL (persistencia)
    // =========================
    data: {
      eventos: [],   // 👈 aquí vivirán los eventos
      rutas: [],
      cierres: []
    },

    log(msg) {
      console.log("🧠 FTTH:", msg);
    },

    setMap(mapInstance) {
      this.map = mapInstance;
      this.ready = true;
      this.log("Mapa registrado en App");

      // 🔄 Cuando cambia el estilo del mapa
      this.map.on("style.load", () => {
        this.log("🎨 Estilo recargado → resize + capas");
        this.map.resize();          // 🔧 CLAVE
        this.reloadAllLayers?.();
      });

    },

    // =========================
    // Recarga global de capas
    // =========================
    reloadAllLayers() {
      this.log("🔄 Recargando capas...");

      this.reloadEventos?.();
      // luego agregaremos:
      // this.reloadRutas?.();
      // this.reloadCierres?.();
    }
  };

  window.__FTTH_APP__ = App;
})();

// ✅ Sistema de inicialización robusto (reemplaza setInterval)
// El initializer se carga automáticamente y configura los alias
if (typeof window !== "undefined" && window.__FTTH_INITIALIZER__) {
  window.__FTTH_INITIALIZER__.onReady(() => {
    console.log("✅ App: Sistema inicializado correctamente");
  });
}


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("📱 PWA activa"))
      .catch(err => console.error("❌ Error SW", err));
  });
}
