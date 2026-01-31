/* =========================================================
   FlashFiber FTTH | mapa.controls.js
   Rotación ON / OFF – ESTABLE TOUCH
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App) return;

  window.initMapControls = function () {

    const map = App.map;
    if (!map) return;

    const btnRotate = document.getElementById("btnRotate");
    if (!btnRotate) return;

    let enabled = false;

    // Estado inicial seguro
    map.dragRotate.disable();
    map.touchZoomRotate.disable();
    map.touchPitch.disable();

    btnRotate.addEventListener("click", () => {

      enabled = !enabled;

      if (enabled) {
        // 🔓 ACTIVAR
        map.dragRotate.enable();
        map.touchZoomRotate.enable();
        map.touchPitch.enable();

        map.easeTo({
          pitch: 35,
          duration: 200
        });

        btnRotate.classList.add("active");
        console.log("🧭 Rotación ACTIVADA (touch)");

      } else {
        // 🔒 DESACTIVAR
        map.dragRotate.disable();
        map.touchZoomRotate.disable();
        map.touchPitch.disable();

        map.easeTo({
          bearing: 0,
          pitch: 0,
          duration: 300
        });

        btnRotate.classList.remove("active");
        console.log("🧭 Rotación DESACTIVADA");
      }
    });
  };
})();
