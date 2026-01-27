/* =========================================================
   FlashFiber FTTH | mapa.styles.js
   Gestión de mapas base
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  const CONFIG = window.__CONFIG__;

  if (!App || !CONFIG) return;

  const styles = {
    dark: "mapbox://styles/mapbox/dark-v11",
    streets: "mapbox://styles/mapbox/streets-v12",
    satellite: "mapbox://styles/mapbox/satellite-streets-v12"
  };

  window.getMapStyle = function (key) {
    return styles[key] || styles.dark;
  };

})();
