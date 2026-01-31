/* =========================================================
   FlashFiber FTTH | mapa.controls.js
   Rotación ON / OFF (SOLUCIÓN REAL touch)
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

    let rotationEnabled = false;

    // 🔒 Estado inicial SEGURO
    map.dragRotate.disable();
    map.touchZoomRotate.disable();
    map.touchPitch.disable();

    btnRotate.addEventListener("click", () => {

      rotationEnabled = !rotationEnabled;

      if (rotationEnabled) {
        // 🔓 ACTIVAR ROTACIÓN (touch real)
        map.dragRotate.enable();
        map.touchZoomRotate.enable();
        map.touchPitch.enable();

        // ⚠️ Pitch mínimo necesario para que gire
        map.easeTo({
          pitch: 30,
          duration: 200
        });

        btnRotate.classList.add("active");
        console.log("🧭 Rotación ACTIVADA");

      } else {
        // 🔒 DESACTIVAR ROTACIÓN
        map.dragRotate.disable();
        map.touchZoomRotate.disable();
        map.touchPitch.disable();

        // 🔄 Reset TOTAL
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
