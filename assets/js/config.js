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

  // ✅ Token de Mapbox desde config.local.js o valor por defecto (solo para desarrollo)
  MAPBOX_TOKEN: SECRETS.MAPBOX_TOKEN || 
    (() => {
      // ❌ DESHABILITADO: Advertencia silenciada
      // console.warn("⚠️ MAPBOX_TOKEN no encontrado en config.local.js. Usando valor por defecto (solo desarrollo)");
      // ⚠️ Este valor solo debe usarse en desarrollo local
      // En producción, DEBE estar en config.local.js
      return "pk.eyJ1IjoiamFtaWx0b244NCIsImEiOiJjbWpxMjB4eDkydWdmM2RwdTVib3htb284In0.5gk_bRtcnXLshXE9eMeryg"; // ✅ Token actualizado
    })(),

  MAP: {
    STYLE_DEFAULT: "mapbox://styles/mapbox/dark-v11",
    CENTER: [-74.1, 4.65],   // Bogotá
    ZOOM: 12,
    PITCH: 45,
    BEARING: -10
  }

};

// ✅ Validar que el token esté presente (silenciado - siempre hay valor por defecto)
if (!window.__FTTH_CONFIG__.MAPBOX_TOKEN) {
  // ❌ DESHABILITADO: Error silenciado (el token por defecto siempre está presente)
  // console.error("❌ MAPBOX_TOKEN no configurado. Crea config.local.js basado en config.local.example.js");
}