/* =========================================================
   FlashFiber FTTH | config.js
   Configuración central del sistema
========================================================= */

// ✅ Obtener credenciales desde archivo local (config.local.js) o usar valores por defecto
// El archivo config.local.js NO se versiona (está en .gitignore)
const SECRETS = window.__FTTH_SECRETS__ || {};

window.__FTTH_CONFIG__ = {

  APP_NAME: "Flash Fiber FTTH",
  VERSION: "1.0.0",

  // Token de Mapbox: desde config.local.js; fallback para desarrollo (en producción usar config.local.js)
  MAPBOX_TOKEN: SECRETS.MAPBOX_TOKEN || "pk.eyJ1IjoiamFtaWx0b244NCIsImEiOiJjbWpxMjB4eDkydWdmM2RwdTVib3htb284In0.5gk_bRtcnXLshXE9eMeryg",

  DEBUG: !!SECRETS.DEBUG,

  MAP: {
    STYLE_DEFAULT: "mapbox://styles/mapbox/dark-v11",
    // Estilos disponibles para el botón de base (panel)
    STYLES: {
      dark: "mapbox://styles/mapbox/dark-v11",
      streets: "mapbox://styles/mapbox/streets-v12",
      satellite: "mapbox://styles/mapbox/satellite-streets-v12"
    },
    CENTER: [-74.1, 4.65],   // Bogotá
    ZOOM: 12,
    PITCH: 45,
    BEARING: -10
  },

  // IDs de capas del mapa (buscador, tools, layers)
  LAYERS: {
    CENTRALES: "CORPORATIVO_CENTRALES_ETB",
    CIERRES: "cierres-layer",
    EVENTOS: "eventos-layer"
  },

  // Buscador: debounce, reintentos, resultados máximos
  SEARCH: {
    DEBOUNCE_MS: 300,
    RETRY_DELAY_MS: 600,
    MAX_RETRIES: 3,
    MAX_RESULTS: 20
  },

  // Duración del flyTo al seleccionar resultado (ms)
  MAP_FLYTO_DURATION_MS: 1500,

  // Código para permitir eliminar pines (cierres/eventos). Override en config.local.js con __FTTH_SECRETS__.DELETE_PIN
  DELETE_PIN: SECRETS.DELETE_PIN || "7431"
};

// Aviso solo si no hay token ni fallback (no debería ocurrir)
if (!window.__FTTH_CONFIG__.MAPBOX_TOKEN) {
  console.warn("⚠️ MAPBOX_TOKEN no configurado. Crea config.local.js desde config.local.example.js.");
}

// Helper de log: solo escribe en consola si CONFIG.DEBUG (útil para reducir ruido en producción)
window.__FTTH_LOG__ = function (level, ...args) {
  if (window.__FTTH_CONFIG__?.DEBUG) {
    var fn = typeof console !== "undefined" && console[level];
    if (fn) fn.apply(console, args);
  }
};