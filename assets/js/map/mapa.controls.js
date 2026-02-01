/* =========================================================
   FlashFiber FTTH | mapa.controls.js
   Rotación ON / OFF (zoom siempre activo)
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App) return;

  window.initMapControls = function () {
    if (!App || !App.map) return;
    const map = App.map;

    const btnRotate = document.getElementById("btnRotate");
    if (!btnRotate) return;

    let rotationEnabled = false;

    btnRotate.addEventListener("click", () => {
      rotationEnabled = !rotationEnabled;

      if (rotationEnabled) {
        // 🔓 GIRAR ACTIVADO
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation(); // 👈 solo rotación
        map.touchPitch.enable();

        map.easeTo({ pitch: 30, duration: 200 });

        btnRotate.classList.add("active");
        console.log("🧭 Giro ACTIVADO");

      } else {
        // 🔒 PLANO (SIN GIRAR, CON ZOOM)
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation(); // 👈 zoom sigue vivo
        map.touchPitch.disable();

        map.easeTo({
          bearing: 0,
          pitch: 0,
          duration: 300
        });

        btnRotate.classList.remove("active");
        console.log("🧭 Giro DESACTIVADO");
      }
    });
  };
})();
