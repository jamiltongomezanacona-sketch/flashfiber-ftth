/* =========================================================
   FlashFiber FTTH | mapa.init.js
   Inicialización segura de Mapbox
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  const CONFIG = window.__FTTH_CONFIG__;
  const log = window.__FTTH_LOG__;

  if (log) log("log", "🧪 mapa.init.js cargado");

  if (!App || !CONFIG) {
    console.error("❌ App o FTTH_CONFIG no disponibles");
    return;
  }

  if (!window.mapboxgl) {
    console.error("❌ Mapbox GL no cargado");
    return;
  }

  // En producción no usar token por defecto en código; debe venir de variables de entorno.
  var token = (CONFIG.MAPBOX_TOKEN && String(CONFIG.MAPBOX_TOKEN).trim()) || "";
  if (!token) {
    if (log) log("warn", "❌ MAPBOX_TOKEN no configurado. En producción usa variables de entorno (ej. Vercel). En desarrollo: config.local.js.");
    var el = document.getElementById("map");
    if (el) el.innerHTML = "<div style=\"padding:2rem;text-align:center;color:#a3d5ff;font-family:Inter,sans-serif;\">" +
      "<p><strong>⚠️ Configuración requerida</strong></p>" +
      "<p style=\"font-size:0.9rem;margin-top:0.5rem;\">MAPBOX_TOKEN no está definido. En producción configura la variable de entorno (ej. Vercel: Environment Variables → MAPBOX_TOKEN → Redeploy). En desarrollo crea <strong>config.local.js</strong> desde config.local.example.js.</p>" +
      "</div>";
    return;
  }
  mapboxgl.accessToken = token;
  // ✅ Menos peticiones de imagen en paralelo = menos tirones al cargar sprites/tiles (mejor renderizado)
  const maxImg = CONFIG.RENDER_MAX_PARALLEL_IMAGE_REQUESTS;
  if (typeof mapboxgl.setMaxParallelImageRequests === "function" && typeof maxImg === "number" && maxImg > 0) {
    mapboxgl.setMaxParallelImageRequests(Math.min(32, maxImg));
  }

  // 🗺️ MAPA BASE – calles (estilo desde config)
  // preserveDrawingBuffer: true necesario para getCanvas().toDataURL() en "Crear diseño de mapa" (PNG/PDF).
  // Coste: más uso de GPU/memoria. Alternativa futura: mapa secundario oculto solo para export, o export vía servidor.
  var MAP_VIEW_KEY = CONFIG.LAST_WORK?.KEY_MAP_VIEW || "ftth_map_view";
  var mapOpts = {
    container: "map",
    style: CONFIG.MAP.STYLES?.streets || CONFIG.MAP.STYLE_DEFAULT || "mapbox://styles/mapbox/streets-v12",
    center: [-74.088195, 4.562537],
    zoom: 14,
    bearing: 0,
    pitch: 30,
    preserveDrawingBuffer: true
  };
  try {
    var saved = JSON.parse(localStorage.getItem(MAP_VIEW_KEY));
    if (saved && Array.isArray(saved.center) && saved.center.length === 2 &&
        typeof saved.center[0] === "number" && typeof saved.center[1] === "number") {
      mapOpts.center = saved.center;
      if (typeof saved.zoom === "number" && saved.zoom >= 0 && saved.zoom <= 22) mapOpts.zoom = saved.zoom;
      if (typeof saved.bearing === "number") mapOpts.bearing = saved.bearing;
      if (typeof saved.pitch === "number") mapOpts.pitch = saved.pitch;
    }
  } catch (e) {
    if (CONFIG?.DEBUG && log) log("log", "[mapa.init] localStorage vista mapa", e?.message);
  }
  const map = new mapboxgl.Map(mapOpts);

  // Si el estilo falla (token inválido, red, etc.) puede aparecer "Style is not done loading"
  map.on("error", function (e) {
    var msg = (e && e.error && e.error.message) ? String(e.error.message) : "";
    if (msg && (msg.indexOf("style") !== -1 || e.error && e.error.status === 401)) {
      if (log) log("warn", "⚠️ Error de estilo del mapa (revisa MAPBOX_TOKEN):", msg);
      if (log) log("warn", "Si persiste 'Style is not done loading', verifica en https://account.mapbox.com/ que el token sea válido y tenga permiso 'styles:read'.");
    }
  });

  // Guardar vista al mover/zoom (debounce para no escribir en cada frame)
  var _saveViewT = null;
  function persistMapView() {
    try {
      var c = map.getCenter();
      localStorage.setItem(MAP_VIEW_KEY, JSON.stringify({
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch()
      }));
    } catch (e) {
      if (CONFIG?.DEBUG && log) log("log", "[mapa.init] persistMapView", e?.message);
    }
  }
  map.on("moveend", function () {
    if (_saveViewT) clearTimeout(_saveViewT);
    _saveViewT = setTimeout(persistMapView, 400);
  });

  /* 🔒 BLOQUEO INICIAL (CORRECTO) */
  map.dragRotate.disable();        // desktop
  map.touchZoomRotate.disableRotation();
  map.touchPitch.disable();

  /* En celular y tablet: giro habilitado por defecto (sin botón) */
  if (window.matchMedia("(max-width: 1023px)").matches) {
    map.touchZoomRotate.enableRotation();
    map.touchPitch.enable();
  }

  // 🎛️ Controles nativos
  map.addControl(new mapboxgl.NavigationControl(), "top-right");
  map.addControl(new mapboxgl.FullscreenControl(), "top-right");
  map.addControl(
    new mapboxgl.ScaleControl({ unit: "metric" }),
    "bottom-right"
  );

  // Registrar mapa
  App.setMap(map);

  // ✅ SOLUCIÓN DEFINITIVA: envolver addSource/addLayer para que NUNCA se ejecuten hasta que el estilo esté listo
  (function patchMapAddSourceAndLayer() {
    var m = map;
    var origAddSource = m.addSource.bind(m);
    var origAddLayer = m.addLayer.bind(m);

    m.addSource = function (id, spec) {
      function doAdd() {
        if (!m.isStyleLoaded()) {
          m.once("load", doAdd);
          m.once("style.load", doAdd);
          return;
        }
        try {
          if (!m.getSource(id)) origAddSource(id, spec);
        } catch (e) {
          if (e && /style is not done loading/i.test(String(e.message))) {
            m.once("style.load", function () { m.once("idle", doAdd); });
            return;
          }
          throw e;
        }
      }
      doAdd();
    };

    m.addLayer = function (layerSpec, beforeId) {
      function doAdd() {
        if (!m.isStyleLoaded()) {
          m.once("load", doAdd);
          m.once("style.load", doAdd);
          return;
        }
        try {
          origAddLayer(layerSpec, beforeId);
        } catch (e) {
          if (e && /style is not done loading/i.test(String(e.message))) {
            m.once("style.load", function () { m.once("idle", doAdd); });
            return;
          }
          throw e;
        }
      }
      doAdd();
    };
  })();

  // ✅ Helper para código que prefiera encolar lógica: ejecuta fn cuando el estilo está cargado y estable (idle)
  App.whenStyleReady = function (fn) {
    var m = App.map;
    if (!m) return;
    function run() {
      if (!m.isStyleLoaded()) {
        m.once("load", run);
        m.once("style.load", run);
        return;
      }
      m.once("idle", fn);
    }
    run();
  };

  // ✅ Un solo flyTo a la vez: cancela animación anterior para no solapar (B.2 buenas prácticas)
  App.flyToQueued = function (options) {
    if (!App.map) return;
    App.map.stop();
    App.map.flyTo(options);
  };
  try {
    window.dispatchEvent(new CustomEvent("ftth-map-ready"));
  } catch (e) {
    if (CONFIG?.DEBUG && log) log("log", "[mapa.init] ftth-map-ready", e?.message);
  }

  /* ===============================
     MAPA LISTO
     =============================== */
  map.on("load", () => {
    if (log) log("log", "🗺️ MAPA CARGADO CORRECTAMENTE");

    // ✅ Todas las capas se crean en idle para evitar "Style is not done loading"
    map.once("idle", () => {
      if (!map.isStyleLoaded()) return;
      if (App.reloadCierres) App.reloadCierres();
      if (App.reloadEventos) App.reloadEventos();
      if (App.reloadFTTH) App.reloadFTTH();
      App.layers?.loadIndex();
      if (App.loadCentralesFijas) App.loadCentralesFijas();
      if (!window.__GEOJSON_INDEX__ && App.loadConsolidatedGeoJSONToBaseMap) {
        App.loadConsolidatedGeoJSONToBaseMap();
      }
    });

    // 💾 Rutas guardadas
    try {
      const rutas = window.__FTTH_STORAGE__?.getRutas() || [];

      rutas.forEach(ruta => {
        if (window.drawSavedRoute) {
          window.drawSavedRoute(ruta);
        }
      });

      if (log) log("log", "📦 Rutas cargadas:", rutas.length);
    } catch (e) {
      if (log) log("warn", "⚠️ Error cargando rutas:", e);
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
        const latLng = { lat: lat, lng: lng };

        const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(lngLat)
          .setHTML(
            '<div class="pin-popup pin-popup-card longpress-nav-popup" style="min-width:220px">' +
            '<div class="pin-popup-header" style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.08)">' +
            '<span style="font-size:13px;font-weight:600;color:#e2e8f0">📍 Coordenadas</span></div>' +
            '<div class="pin-popup-body" style="padding:12px">' +
            '<div style="font-size:12px;color:rgba(255,255,255,0.7);margin-bottom:10px;word-break:break-all">' + coordsText + '</div>' +
            '<div style="display:flex;flex-direction:column;gap:8px">' +
            '<button type="button" class="pin-popup-btn" data-copy-coords style="width:100%;padding:10px 12px;border-radius:8px;border:none;background:rgba(92,107,192,0.4);color:#fff;font-size:12px;font-weight:600;cursor:pointer">📋 Copiar coordenada</button>' +
            '<button type="button" class="pin-popup-btn" data-nav-google style="width:100%;padding:10px 12px;border-radius:8px;border:none;background:rgba(52,168,83,0.5);color:#fff;font-size:12px;font-weight:600;cursor:pointer">🌍 Google Maps</button>' +
            '<button type="button" class="pin-popup-btn" data-nav-waze style="width:100%;padding:10px 12px;border-radius:8px;border:none;background:rgba(0,229,255,0.35);color:#003;font-size:12px;font-weight:600;cursor:pointer">🚗 Waze</button>' +
            '</div></div></div>'
          )
          .addTo(map);

        var el = popup.getElement();
        var btnCopy = el.querySelector("[data-copy-coords]");
        if (btnCopy) {
          btnCopy.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var text = coordsText;
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(function () {
                btnCopy.textContent = "✓ Copiado";
                setTimeout(function () { btnCopy.textContent = "📋 Copiar coordenada"; }, CONFIG.UI_COPY_FEEDBACK_MS ?? 1500);
              }).catch(function () { fallbackCopy(text, btnCopy); });
            } else {
              fallbackCopy(text, btnCopy);
            }
          });
        }
        var btnGoogle = el.querySelector("[data-nav-google]");
        if (btnGoogle) {
          btnGoogle.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.open("https://www.google.com/maps/dir/?api=1&destination=" + lat + "," + lng, "_blank");
            popup.remove();
          });
        }
        var btnWaze = el.querySelector("[data-nav-waze]");
        if (btnWaze) {
          btnWaze.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.open("https://waze.com/ul?ll=" + lat + "," + lng + "&navigate=yes", "_blank");
            popup.remove();
          });
        }
        function fallbackCopy(text, button) {
          try {
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            button.textContent = "✓ Copiado";
            setTimeout(function () { button.textContent = "📋 Copiar coordenada"; }, CONFIG.UI_COPY_FEEDBACK_MS ?? 1500);
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
            if (log) log("warn", "Long-press coords:", err);
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
export {};
