/* =========================================================
   FlashFiber FTTH | mapa.controls.js
   Controles UI del mapa
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;

  if (!App) return;

  window.initMapControls = function () {

    const buttons = document.querySelectorAll("[data-basemap]");
    if (!buttons.length) return;

    let current = "dark";

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {

        if (!App.map) return;

        const style = btn.dataset.basemap;
        if (style === current) return;

        const center = App.map.getCenter();
        const zoom = App.map.getZoom();
        const bearing = App.map.getBearing();
        const pitch = App.map.getPitch();

        App.map.setStyle(getMapStyle(style));

        App.map.once("style.load", () => {
          App.map.setCenter(center);
          App.map.setZoom(zoom);
          App.map.setBearing(bearing);
          App.map.setPitch(pitch);
        });

        document.querySelectorAll("[data-basemap]")
          .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");
        current = style;

      });
    });

  };

})();
