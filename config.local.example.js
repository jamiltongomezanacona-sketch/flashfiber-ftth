/* =========================================================
   FlashFiber FTTH | Configuración Local (NO VERSIONAR)
   
   INSTRUCCIONES:
   1. Copia este archivo a: config.local.js
   2. Completa con tus credenciales reales
   3. El archivo config.local.js NO se sube a git (está en .gitignore)
========================================================= */

window.__FTTH_SECRETS__ = {
  // 🔑 Token de Mapbox (obligatorio; sin él el mapa no cargará)
  MAPBOX_TOKEN: "tu_token_mapbox_aquí",

  // true = mostrar logs de depuración (__FTTH_LOG__("log", ...)); false = silenciar en producción
  DEBUG: true,

  // Código para permitir eliminar pines (cierres/eventos). Por defecto "7431"
  // DELETE_PIN: "7431",

  // Supabase se configura con variables de entorno (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  // o en producción con supabase-env.js generado en el build. Ver docs/MIGRACION_FIREBASE_A_SUPABASE.md
};
