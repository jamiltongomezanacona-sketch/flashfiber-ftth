/* =========================================================
   FlashFiber FTTH | Configuración de producción (token Mapbox)
   
   INSTRUCCIONES para producción (ej. www.flasfiber.com):
   1. Copia este archivo en el servidor a: config.production.js
   2. Pega tu token de Mapbox (público, restringido por URL en mapbox.com)
   3. config.production.js está en .gitignore; súbelo solo al servidor
   
   Alternativa: inyectar en el HTML desde variables de entorno:
   window.__FTTH_MAPBOX_TOKEN__ = "pk.eyJ...";
========================================================= */

window.__FTTH_MAPBOX_TOKEN__ = "tu_token_mapbox_aquí";
