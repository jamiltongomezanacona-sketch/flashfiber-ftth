/* =========================================================
   FlashFiber | Storage Engine
   Persistencia local de rutas
========================================================= */

(() => {
  const KEY = "ff_routes";

  function getRutas() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveRuta(feature) {
    const rutas = getRutas();
    rutas.push(feature);
    localStorage.setItem(KEY, JSON.stringify(rutas));
  }

  function clearRutas() {
    localStorage.removeItem(KEY);
  }

  window.__FTTH_STORAGE__ = {
    getRutas,
    saveRuta,
    clearRutas
  };
})();