/* =========================================================
   FlashFiber FTTH | mapa.controls.js
   Controles UI del mapa
   - Rotación ON / OFF
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App) return;

  window.initMapControls = function () {

    const map = App.map;
    if (!map) return;

    /* ===============================
       ROTACIÓN MAPA (OPCIONABLE)
    =============================== */

    const btnRotate = document.getElementById("btnRotate");
    if (btnRotate) {

      let rotationEnabled = false;

      btnRotate.addEventListener("click", () => {

        rotationEnabled = !rotationEnabled;

        if (rotationEnabled) {
          // 🔓 Activar rotación
          map.dragRotate.enable();
          map.touchZoomRotate.enableRotation();
          btnRotate.classList.add("active");
          console.log("🧭 Rotación ACTIVADA");
        } else {
          // 🔒 Desactivar rotación
          map.dragRotate.disable();
          map.touchZoomRotate.disableRotation();
          map.easeTo({ bearing: 0 });
          btnRotate.classList.remove("active");
          console.log("🧭 Rotación DESACTIVADA");
        }

      });
    }

  };

})();
