(() => {
  const KEY = "ff_cierres";

  function getCierres() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCierre(feature) {
    const data = getCierres();
    data.push(feature);
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  window.__FTTH_CIERRES__ = { getCierres, saveCierre };
})();