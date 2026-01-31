/* =========================================================
   FlashFiber FTTH | mapa.controls.js
   Control de rotación ON / OFF
   ✔ Desktop
   ✔ Tablet
   ✔ Celular
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

    // 🔒 Estado inicial SEGURO (campo)
    map.dragRotate.disable();
    map.touchZoomRotate.disable();
    map.touchPitch.disable();

    btnRotate.addEventListener("click", () => {

      rotationEnabled = !rotationEnabled;

      if (rotationEnabled) {
        // 🔓 ACTIVAR ROTACIÓN (tablet + celular REAL)
        map.dragRotate.enable();
        map.touchZoomRotate.enable();
        map.touchPitch.enable();

        btnRotate.classList.add("active");
        console.log("🧭 Rotación ACTIVADA");

      } else {
        // 🔒 DESACTIVAR ROTACIÓN (tablet + celular REAL)
        map.dragRotate.disable();
        map.touchZoomRotate.disable();
        map.touchPitch.disable();

        // 🔄 Reset completo (OBLIGATORIO)
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
