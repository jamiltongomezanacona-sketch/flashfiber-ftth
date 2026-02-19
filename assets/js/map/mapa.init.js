/* =========================================================
   FlashFiber FTTH | mapa.init.js
   Inicialización segura de Mapbox
========================================================= */

(() => {
  "use strict";

  console.log("🧪 mapa.init.js cargado");

  const App = window.__FTTH_APP__;
  const CONFIG = window.__FTTH_CONFIG__;

  if (!App || !CONFIG) {
    console.error("❌ App o FTTH_CONFIG no disponibles");
    return;
  }

  if (!window.mapboxgl) {
    console.error("❌ Mapbox GL no cargado");
    return;
  }

  // ✅ TOKEN: salida temprana para no provocar error de Mapbox ni cascada de dependencias
  var token = (CONFIG.MAPBOX_TOKEN && String(CONFIG.MAPBOX_TOKEN).trim()) || "";
  if (!token) {
    var msg = "MAPBOX_TOKEN no configurado. Dev: config.local.js. Producción: sube config.production.js (ver config.production.example.js).";
    console.warn("❌ " + msg);
    var el = document.getElementById("map");
    if (el) {
      el.innerHTML = "<div style=\"padding:2rem;text-align:center;color:#a3d5ff;font-family:Inter,sans-serif;max-width:420px;margin:2rem auto;\"><p style=\"margin-bottom:0.5rem;\">⚠️ Mapa no disponible</p><p style=\"font-size:0.9rem;opacity:0.9;\">" + msg + "</p></div>";
    }
    return;
  }
  mapboxgl.accessToken = token;

  // 🗺️ MAPA BASE – calles (estilo desde config)
  // preserveDrawingBuffer: true permite exportar el mapa a imagen/PDF (Crear diseño de mapa)
  const map = new mapboxgl.Map({
    container: "map",
    style: CONFIG.MAP.STYLES?.streets || CONFIG.MAP.STYLE_DEFAULT || "mapbox://styles/mapbox/streets-v12",
    center: [-74.088195, 4.562537], // Central Santa Inés
    zoom: 14,
    bearing: 0,
    pitch: 30,
    preserveDrawingBuffer: true
  });

  /* ===============================
     🔒 BLOQUEO INICIAL (CORRECTO)
     =============================== */

  map.dragRotate.disable();        // desktop
  map.touchZoomRotate.disableRotation();
  map.touchPitch.disable();

  // 🎛️ Controles nativos
  map.addControl(new mapboxgl.NavigationControl(), "top-right");
  map.addControl(new mapboxgl.FullscreenControl(), "top-right");
  map.addControl(
    new mapboxgl.ScaleControl({ unit: "metric" }),
    "bottom-right"
  );

  // Registrar mapa
  App.setMap(map);

  /* ===============================
     MAPA LISTO
     =============================== */
  map.on("load", () => {
    console.log("🗺️ MAPA CARGADO CORRECTAMENTE");

    // ✅ Capas de pines (cierres/eventos) se crean cuando el estilo está listo
    if (App.reloadCierres) App.reloadCierres();
    if (App.reloadEventos) App.reloadEventos();

    // 🌍 Capas FTTH (índice)
    App.layers?.loadIndex();

    // ✅ Cola de carga con map idle (evita setTimeout 500/600/900 ms arbitrarios)
    map.once("idle", () => {
      if (App.loadCentralesFijas) App.loadCentralesFijas();
      if (!window.__GEOJSON_INDEX__ && App.loadConsolidatedGeoJSONToBaseMap) {
        App.loadConsolidatedGeoJSONToBaseMap();
      }
      map.once("idle", () => {
        if (App.loadMuzuLayer) App.loadMuzuLayer();
      });
    });

    // 💾 Rutas guardadas
    try {
      const rutas = window.__FTTH_STORAGE__?.getRutas() || [];

      rutas.forEach(ruta => {
        if (window.drawSavedRoute) {
          window.drawSavedRoute(ruta);
        }
      });

      console.log("📦 Rutas cargadas:", rutas.length);
    } catch (e) {
      console.warn("⚠️ Error cargando rutas:", e);
    }

    // 🧭 CONTROLES (rotación ON / OFF)
    if (window.initMapControls) {
      window.initMapControls();
    }

    // 📋 MANTENER PRESIONADO / CLIC DERECHO: copiar coordenadas del punto en el mapa
    (function initLongPressCopyCoords() {
      const LONG_PRESS_MS = 550;
      let longPressTimer = null;
      let touchStartPoint = null;

      function showCopyCoordsPopup(lngLat) {
        const lat = lngLat.lat != null ? Number(lngLat.lat) : 0;
        const lng = lngLat.lng != null ? Number(lngLat.lng) : 0;
        const coordsText = lat.toFixed(6) + ", " + lng.toFixed(6);

        const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(lngLat)
          .setHTML(
            '<div class="pin-popup pin-popup-card" style="min-width:200px">' +
            '<div class="pin-popup-header" style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.08)">' +
            '<span style="font-size:13px;font-weight:600;color:#e2e8f0">📍 Coordenadas</span></div>' +
            '<div class="pin-popup-body" style="padding:12px">' +
            '<div style="font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:6px">' + coordsText + '</div>' +
            '<button type="button" class="pin-popup-btn pin-popup-btn-copy" data-copy-coords style="width:100%;padding:8px 12px;border-radius:8px;border:none;background:rgba(0,180,216,0.25);color:#00e5ff;font-size:12px;font-weight:600;cursor:pointer">📋 Copiar coordenadas</button>' +
            '</div></div>'
          )
          .addTo(map);

        const btn = popup.getElement().querySelector("[data-copy-coords]");
        if (btn) {
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            const text = coordsText;
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(function () {
                btn.textContent = "✓ Copiado";
                setTimeout(function () { btn.textContent = "📋 Copiar coordenadas"; }, 1500);
              }).catch(function () { fallbackCopy(text, btn); });
            } else {
              fallbackCopy(text, btn);
            }
          });
        }
        function fallbackCopy(text, button) {
          try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            button.textContent = "✓ Copiado";
            setTimeout(function () { button.textContent = "📋 Copiar coordenadas"; }, 1500);
          } catch (err) {
            alert("Coordenadas: " + text);
          }
        }
      }

      // Clic derecho (escritorio): mostrar opción copiar coordenadas
      map.on("contextmenu", function (e) {
        e.preventDefault();
        showCopyCoordsPopup(e.lngLat);
      });

      // Móvil: mantener presionado el dedo
      const canvas = map.getCanvas();
      if (!canvas) return;

      function clearLongPress() {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        touchStartPoint = null;
      }

      canvas.addEventListener("touchstart", function (e) {
        if (e.touches.length !== 1) return;
        clearLongPress();
        touchStartPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        longPressTimer = setTimeout(function () {
          longPressTimer = null;
          if (!touchStartPoint) return;
          const rect = canvas.getBoundingClientRect();
          const x = touchStartPoint.x - rect.left;
          const y = touchStartPoint.y - rect.top;
          try {
            const lngLat = map.unproject([x, y]);
            showCopyCoordsPopup(lngLat);
          } catch (err) {
            console.warn("Long-press coords:", err);
          }
          touchStartPoint = null;
          e.preventDefault();
        }, LONG_PRESS_MS);
      }, { passive: true });

      canvas.addEventListener("touchmove", function () {
        clearLongPress();
      }, { passive: true });

      canvas.addEventListener("touchend", function () {
        clearLongPress();
      }, { passive: true });

      canvas.addEventListener("touchcancel", function () {
        clearLongPress();
      }, { passive: true });
    })();
  });

})();
