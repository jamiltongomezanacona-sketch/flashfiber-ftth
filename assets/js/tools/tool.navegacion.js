/* =========================================================
   FlashFiber FTTH | tool.navegacion.js
   Modal moderno Waze / Google
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App) return;

  // ✅ Asegurar contenedor de herramientas
  App.tools = App.tools || {};

  let active = false;
  let clickHandler = null; 
  let destino = null;
  let markerDestino = null;

  const modal = document.getElementById("navModal");
  const coordText = document.getElementById("navCoordText");
  const btnCopy = document.getElementById("btnNavCopy");
  const btnWaze = document.getElementById("btnNavWaze");
  const btnGoogle = document.getElementById("btnNavGoogle");
  const btnCancel = document.getElementById("btnNavCancel");

  function start() {
    if (!App.map || active) return;
    active = true;

    // ✅ Apagar medición si está activa (evita conflicto de click)
    try {
      App.tools.medicion?.stop();
    } catch (e) {}

    App.map.getCanvas().style.cursor = "crosshair";

    clickHandler = e => {
  destino = e.lngLat;
  
  // 📍 Crear / mover pin
  if (markerDestino) {
    markerDestino.setLngLat(destino);
  } else {
    markerDestino = new mapboxgl.Marker({
        color: "#00e5ff"
      })
      .setLngLat(destino)
      .addTo(App.map);
  }
  
  abrirModal();
};

    // ✅ Asegurar que no queden handlers duplicados
    App.map.off("click", clickHandler);
    App.map.on("click", clickHandler);

    console.log("🧭 Navegación activa");
  }

  function stop() {
  if (!active) return;

  App.map.getCanvas().style.cursor = "";
  App.map.off("click", clickHandler);
  clickHandler = null;
  active = false;
  destino = null;

  // 🧹 Eliminar pin
  if (markerDestino) {
    markerDestino.remove();
    markerDestino = null;
  }

  cerrarModal();
}

  function abrirModal() {
    if (!modal) return;
    if (coordText && destino) {
      const lat = typeof destino.lat === "number" ? destino.lat.toFixed(6) : destino.lat;
      const lng = typeof destino.lng === "number" ? destino.lng.toFixed(6) : destino.lng;
      coordText.textContent = `${lat}, ${lng}`;
    }
    if (btnCopy) btnCopy.textContent = "📋 Copiar coordenada";
    modal.classList.remove("hidden");
  }

  function cerrarModal() {
    if (!modal) return;
    modal.classList.add("hidden");
  }

  function abrirWaze() {
    if (!destino) {
      alert("📍 Seleccione un destino en el mapa");
      return;
    }

    const url = `https://waze.com/ul?ll=${destino.lat},${destino.lng}&navigate=yes`;
    window.open(url, "_blank");
    cerrarModal();
  }

  function abrirGoogle() {
    if (!destino) {
      alert("📍 Seleccione un destino en el mapa");
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}`;
    window.open(url, "_blank");
    cerrarModal();
  }

  function copiarCoordenada() {
    if (!destino) {
      alert("📍 Seleccione un destino en el mapa");
      return;
    }
    const lat = typeof destino.lat === "number" ? destino.lat.toFixed(6) : destino.lat;
    const lng = typeof destino.lng === "number" ? destino.lng.toFixed(6) : destino.lng;
    const texto = `${lat}, ${lng}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(() => {
        if (btnCopy) {
          btnCopy.textContent = "✓ Copiado";
          setTimeout(() => { if (btnCopy) btnCopy.textContent = "📋 Copiar coordenada"; }, 2000);
        }
      }).catch(() => fallbackCopiar(texto));
    } else {
      fallbackCopiar(texto);
    }
  }

  function fallbackCopiar(texto) {
    const input = document.createElement("input");
    input.value = texto;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand("copy");
      if (btnCopy) {
        btnCopy.textContent = "✓ Copiado";
        setTimeout(() => { if (btnCopy) btnCopy.textContent = "📋 Copiar coordenada"; }, 2000);
      }
    } catch (e) {}
    document.body.removeChild(input);
  }

  btnCopy?.addEventListener("click", copiarCoordenada);
  btnWaze?.addEventListener("click", abrirWaze);
  btnGoogle?.addEventListener("click", abrirGoogle);
  btnCancel?.addEventListener("click", cerrarModal);

  // ✅ Registro seguro
  App.tools.navegacion = { start, stop };

  console.log("✅ tool.navegacion registrado correctamente");

})();