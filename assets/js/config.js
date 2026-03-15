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
  // Feedback "¡Copiar coordenada" → "✓ Copiado" (ms). Usado en mapa.init, tool.cierres, tool.eventos, tool.navegacion.
  UI_COPY_FEEDBACK_MS: 1500,

  // Render: defer setData a siguiente frame para reducir jank (requestAnimationFrame)
  RENDER_DEFER_SETDATA_FRAME: true,
  // Máximo de peticiones de imagen en paralelo (Mapbox). Menor = menos tirones, carga más escalonada. 8 por defecto.
  RENDER_MAX_PARALLEL_IMAGE_REQUESTS: 8,
  // Simplificar geometrías del consolidado cuando hay muchos features (requiere Turf en página). null = no simplificar.
  RENDER_SIMPLIFY_WHEN_FEATURES_ABOVE: 3000,
  // Tolerancia en grados para turf.simplify (~0.00005 ≈ 5 m). Solo si RENDER_SIMPLIFY_WHEN_FEATURES_ABOVE está activo.
  RENDER_SIMPLIFY_TOLERANCE: 0.00005,

  // Delays (ms) para carga de capas y estilo del mapa (evita números mágicos)
  MAP_TIMING: {
    RETRY_LOAD_MS: 100,
    RETRY_AFTER_STYLE_MS: 50,
    ENFORCE_VISIBILITY_MS: 150,
    APPLY_FALLBACK_MS: 400,
    APPLY_FALLBACK2_MS: 1200,
    ICON_LOAD_TIMEOUT_MS: 2000,
    CENTRALES_RETRY_MS: 500,
    CENTRALES_AFTER_STYLE_MS: 200,
    CENTRALES_ERROR_RETRY_MS: 1000,
    ENFORCE_AFTER_LOAD_MS: 2800,
    ENFORCE_AFTER_STYLE_LOAD_MS: 1500,
    LAYER_MISSING_RETRY_MS: 3500,
    ZOOM_RETRY_MS: 100,
    ZOOM_SANTA_INES_MS: 500
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

  // IDs de capas del mapa (buscador, tools, layers) — usar constantes para evitar typos
  LAYERS: {
    CENTRALES: "CORPORATIVO_CENTRALES_ETB",
    CIERRES: "cierres-layer",
    EVENTOS: "eventos-layer",
    NOTAS: "notas-layer",
    GEOJSON_CONSOLIDADO_SOURCE: "geojson-consolidado",
    GEOJSON_LINES: "geojson-lines",
    GEOJSON_POINTS: "geojson-points",
    GEOJSON_POLYGONS: "geojson-polygons",
    GEOJSON_POLYGONS_OUTLINE: "geojson-polygons-outline",
    FTTH_CABLES: "ftth-cables",
    FTTH_PUNTOS: "ftth-puntos"
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

// El aviso de MAPBOX_TOKEN se muestra solo al abrir una pantalla con mapa (mapa.init.js, mapa-eventos.js),
// así la pantalla de login carga sin mensajes ni demoras.

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
    } catch (e) {
      if (window.__FTTH_CONFIG__?.DEBUG) console.debug("[config] persistPath", e?.message);
    }
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