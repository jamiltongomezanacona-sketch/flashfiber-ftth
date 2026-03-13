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

  // Token: config.local.js (dev) o config.production.js / __FTTH_MAPBOX_TOKEN__ (Vercel build)
  MAPBOX_TOKEN: SECRETS.MAPBOX_TOKEN || window.__FTTH_MAPBOX_TOKEN__ || "",

  DEBUG: !!SECRETS.DEBUG,

  // Tiempos de debounce/throttle (ms) centralizados
  DEBOUNCE: {
    RESIZE_MAP_MS: 150,   // estilo del mapa recargado → resize
    COPY_BUTTON_RESET_MS: 1500  // texto "Copiar coordenada" vuelve al original
  },

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

  // Buscador: debounce, reintentos, resultados máximos, geocodificación Bogotá
  SEARCH: {
    DEBOUNCE_MS: 300,
    RETRY_DELAY_MS: 600,
    MAX_RETRIES: 3,
    MAX_RESULTS: 20,
    // Búsqueda de direcciones en Bogotá (Mapbox Geocoding)
    GEOCODE_BOGOTA_BBOX: [-74.35, 4.46, -73.99, 4.83],
    GEOCODE_LIMIT: 5
  },

  // Duración del flyTo al seleccionar resultado (ms). Corta para no bloquear el mapa al mover.
  MAP_FLYTO_DURATION_MS: 800,

  // Código para permitir eliminar pines (cierres/eventos). Override en config.local.js con __FTTH_SECRETS__.DELETE_PIN
  DELETE_PIN: SECRETS.DELETE_PIN || "7431",

  // Clave de acceso al Mapa de eventos (FTTH + Corporativo). Override con __FTTH_SECRETS__.MAPA_EVENTOS_PIN
  MAPA_EVENTOS_PIN: SECRETS.MAPA_EVENTOS_PIN || "7431",

  // Recordar última pantalla de trabajo (localStorage)
  LAST_WORK: {
    KEY_PATH: "ftth_last_work_path",
    KEY_MAP_VIEW: "ftth_map_view"
  }
};

// Aviso solo si no hay token
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

// Recordar última ruta al salir / al cargar (mapa, config, reflectometría, etc.)
(function () {
  var KEY = window.__FTTH_CONFIG__?.LAST_WORK?.KEY_PATH || "ftth_last_work_path";
  var WORK_RE = /mapa-ftth|mapa-corporativo|configuracion|reflectometria|mapa-eventos|pages\/home/i;
  function savePath() {
    try {
      var p = location.pathname + (location.search || "");
      if (!WORK_RE.test(p) || /index\.html?$/i.test(p)) return;
      if (p.indexOf("file:") === 0) return;
      localStorage.setItem(KEY, p.charAt(0) === "/" ? p : "/" + p);
    } catch (e) {}
  }
  window.addEventListener("beforeunload", savePath);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", savePath);
  else savePath();
})();

/** Tras login: redirigir a la última pantalla donde trabajó el usuario, o home */
window.__FTTH_REDIRECT_AFTER_LOGIN__ = function () {
  var KEY = window.__FTTH_CONFIG__?.LAST_WORK?.KEY_PATH || "ftth_last_work_path";
  var fallback = "pages/home.html";
  try {
    var s = localStorage.getItem(KEY);
    if (!s) return fallback;
    if (!/mapa-ftth|mapa-corporativo|configuracion|reflectometria|mapa-eventos|home/i.test(s)) return fallback;
    if (s.charAt(0) === "/") return s;
    return s.indexOf("pages/") === 0 ? s : fallback;
  } catch (e) {
    return fallback;
  }
};