/* =========================================================
   FlashFiber FTTH | mapa.controls.js
   Controles UI del mapa
   - Rotación ON / OFF (Desktop + Tablet)
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
    if (!btnRotate) return;

    let rotationEnabled = false;

    btnRotate.addEventListener("click", () => {

      rotationEnabled = !rotationEnabled;

      if (rotationEnabled) {
        // 🔓 ACTIVAR ROTACIÓN
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation();

        btnRotate.classList.add("active");
        console.log("🧭 Rotación ACTIVADA");

      } else {
        // 🔒 DESACTIVAR ROTACIÓN (FORZADO PARA TABLET)
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();

        // 🔒 RESETEO OBLIGATORIO (clave en touch)
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
