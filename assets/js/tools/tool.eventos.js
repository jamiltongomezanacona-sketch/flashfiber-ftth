/* =========================================================
   FlashFiber FTTH | tool.eventos.js
   EVENTOS OPERATIVOS - Crear / Editar / Eliminar (Firebase Sync)
   - Pensado para vandalismo/corte + empalme provisional
   - Igual o mejor que tool.cierres.js
========================================================= */

(function () {
  "use strict";

  const log = window.__FTTH_LOG__;

  // ✅ Sistema de inicialización mejorado (sin setInterval)
  async function init() {
    // Esperar a que App y Firebase estén disponibles
    await waitForDependencies();
    
    // Inicializar tool
    initializeTool();
  }

  async function waitForDependencies(maxAttempts = 80) {
    const isCorporativo = !!window.__GEOJSON_INDEX__;
    for (let i = 0; i < maxAttempts; i++) {
      const App = window.__FTTH_APP__;
      const FB = window.FTTH_FIREBASE;

      if (App?.map && FB?.guardarEvento && FB?.escucharEventos) {
        if (isCorporativo && !FB?.escucharEventosCorp) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        if (log) log("log", "✅ tool.eventos: Dependencias disponibles después de", i + 1, "intentos");
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (log) log("warn", "⚠️ tool.eventos: Dependencias no disponibles después de esperar", maxAttempts, "intentos");
    if (log) log("warn", "💡 Reintentando en 2 segundos...");
    
    setTimeout(() => {
      const App = window.__FTTH_APP__;
      const FB = window.FTTH_FIREBASE;
      const ok = App?.map && FB?.guardarEvento && FB?.escucharEventos && (!isCorporativo || FB?.escucharEventosCorp);
      if (ok) {
        if (log) log("log", "✅ tool.eventos: Dependencias disponibles en retry");
        initializeTool();
      } else {
        console.error("❌ tool.eventos: Dependencias aún no disponibles después del retry");
      }
    }, 2000);
    
    return false;
  }

  function initializeTool() {
    const App = window.__FTTH_APP__;
    const FB = window.FTTH_FIREBASE;

    const isCorporativo = !!window.__GEOJSON_INDEX__;
    const listenerOk = isCorporativo ? FB?.escucharEventosCorp : FB?.escucharEventos;
    if (!App?.map || !FB?.guardarEvento || !listenerOk) {
      console.error("❌ tool.eventos: Dependencias no disponibles (mapa, guardar, listener)");
      return;
    }

    if (!App.tools) App.tools = {};
    if (!App.data) App.data = {};
    if (!App.data.eventos) App.data.eventos = [];

    let active = false;
    let selectedLngLat = null;
    let blockNextClick = false;
    let handlerClickLayer = null, handlerClickFallback = null, handlerMouseEnter = null, handlerMouseLeave = null;

    /* ===============================
       Modal refs
    =============================== */
    const modal = document.getElementById("eventoModal");
    const btnSave   = document.getElementById("btnSaveEvento");
    const btnDelete = document.getElementById("btnDeleteEvento");
    const btnClose  = document.getElementById("closeEventoModal");

    const elTipo    = document.getElementById("eventoTipo");
    const elAccion  = document.getElementById("eventoAccion");
    const elEstado  = document.getElementById("eventoEstado");
    const elTecnico = document.getElementById("eventoTecnico");
    const elNotas   = document.getElementById("eventoNotas");

    // 🏢 Central / 🧬 Molécula (FTTH) — en Corporativo no existen
    const elCentralEvento  = document.getElementById("eventoCentral");
    const elMoleculaEvento = document.getElementById("eventoMolecula");
    // 🧵 CABLES (solo GIS Corporativo) — buscador funcional como el general
    const elEventoCable = document.getElementById("eventoCable");
    const elEventoCableResults = document.getElementById("eventoCableResults");
    const isCorporativoEvento = !!elEventoCable;
    let cableNamesList = [];
    let eventoCableSearchTimeout = null;

    if (!modal || !btnSave || !btnClose || !elTipo || !elAccion || !elEstado) {
      console.error("❌ Modal de eventos no encontrado. Revisa el HTML (eventoModal y campos).");
      return;
    }

    /* ===============================
       Map Layer (IDs desde config)
    =============================== */
    const CONFIG = window.__FTTH_CONFIG__ || {};
    const SOURCE_ID = "eventos-src";
    const LAYER_ID  = CONFIG.LAYERS?.EVENTOS || "eventos-layer";
    const ICON_SIZE = 40;

    function colorByEstado(estado) {
      if (estado === "CRITICO") return "#e53935";
      if (estado === "PROVISIONAL") return "#fbc02d";
      if (estado === "RESUELTO") return "#43a047";
      return "#9e9e9e";
    }

    // ✅ Crear icono pin estilo Google Maps para eventos
    function createEventoPinIconSVG(color, estado = "") {
      const size = ICON_SIZE;
      const pinWidth = size * 0.6;
      const pinHeight = size * 0.8;
      const label = estado.substring(0, 2).toUpperCase() || "EV";
      
      // Emoji según estado
      let emoji = "🚨";
      if (estado === "CRITICO") emoji = "🔴";
      else if (estado === "PROVISIONAL") emoji = "🟡";
      else if (estado === "RESUELTO") emoji = "🟢";

      const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-${color.replace('#', '')}">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
            </filter>
          </defs>
          <!-- Pin body -->
          <path d="M ${size/2} ${size*0.15} 
                   Q ${size*0.2} ${size*0.15} ${size*0.2} ${size*0.4}
                   L ${size*0.2} ${size*0.7}
                   Q ${size*0.2} ${size*0.85} ${size*0.35} ${size*0.85}
                   L ${size*0.5} ${size}
                   L ${size*0.65} ${size*0.85}
                   Q ${size*0.8} ${size*0.85} ${size*0.8} ${size*0.7}
                   L ${size*0.8} ${size*0.4}
                   Q ${size*0.8} ${size*0.15} ${size*0.5} ${size*0.15}
                   Z" 
                fill="${color}" 
                stroke="#000" 
                stroke-width="1.5"
                filter="url(#shadow-${color.replace('#', '')})"/>
          <!-- Label circle -->
          <circle cx="${size/2}" cy="${size*0.4}" r="${size*0.25}" 
                  fill="#fff" stroke="${color}" stroke-width="2"/>
          <!-- Emoji/Text -->
          <text x="${size/2}" y="${size*0.48}" 
                font-size="${size*0.25}" 
                text-anchor="middle" 
                dominant-baseline="middle"
                font-family="Arial, sans-serif"
                font-weight="bold">${emoji}</text>
        </svg>
      `;
      return svg;
    }

    // ✅ Cargar iconos de forma síncrona
    function loadEventoIconSync(estado) {
      const color = colorByEstado(estado);
      const iconId = `evento-${estado.toLowerCase() || "default"}`;
      
      if (App.map.hasImage(iconId)) {
        return iconId;
      }

      const svg = createEventoPinIconSVG(color, estado);
      const img = new Image();
      const svgBlob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        if (!App.map.hasImage(iconId)) {
          App.map.addImage(iconId, img);
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        if (log) log("warn", "⚠️ Error cargando icono de evento:", iconId);
        URL.revokeObjectURL(url);
      };
      img.src = url;
      
      return iconId;
    }

    let popupShownThisClick = false;

    function initLayer() {
      if (!App || !App.map) return;
      try {
        if (App.map.getSource(SOURCE_ID)) return;
      } catch (_) {
        return;
      }

      try {
        App.map.addSource(SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          promoteId: "id"
        });
      } catch (err) {
        if (log) log("warn", "⚠️ tool.eventos: addSource falló (¿estilo no cargado?), reintentando en load:", err.message);
        App.map.once("load", () => initLayer());
        return;
      }

      loadEventoIconSync("CRITICO");
      loadEventoIconSync("PROVISIONAL");
      loadEventoIconSync("RESUELTO");
      loadEventoIconSync("");

      try {
        const beforeId = (typeof App.getBeforeIdForDataLayers === "function" && App.getBeforeIdForDataLayers(App.map)) || undefined;
        App.map.addLayer({
          id: LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          layout: {
            visibility: "none",
            "icon-image": [
              "match",
              ["get", "estado"],
              "CRITICO", "evento-critico",
              "PROVISIONAL", "evento-provisional",
              "RESUELTO", "evento-resuelto",
              "evento-default"
            ],
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10, 0.54,
              15, 0.9,
              20, 1.26
            ],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-anchor": "bottom",
            "icon-pitch-alignment": "viewport"
          }
        }, beforeId);
      } catch (err) {
        if (log) log("warn", "⚠️ tool.eventos: addLayer falló, reintentando en load:", err.message);
        App.map.once("load", () => initLayer());
        return;
      }

      // En GIS Corporativo la capa de eventos debe verse siempre (como en FTTH cuando hay molécula)
      if (isCorporativoEvento && App.map.getLayer(LAYER_ID)) {
        App.map.setLayoutProperty(LAYER_ID, "visibility", "visible");
      }

      // Escapar HTML para evitar rupturas y XSS en el popup
      function escapeHtml(str) {
        if (str == null) return "";
        const s = String(str);
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      }

      function isMobile() {
        return typeof window !== "undefined" && window.innerWidth <= 767;
      }

      function closePinBottomSheet() {
        const overlay = document.getElementById("pinBottomSheetOverlay");
        const contentEl = document.getElementById("pinBottomSheetContent");
        if (overlay) {
          overlay.classList.add("hidden");
          overlay.setAttribute("aria-hidden", "true");
        }
        if (contentEl) contentEl.innerHTML = "";
      }

      // Función única para mostrar popup (Nombre, Fecha creación, Creado por, Editar)
      function showEventoPopup(f, lngLat) {
        if (!f || !lngLat) return;
        const id = f.id ?? f.properties?.id;
        const idStr = id != null ? String(id) : null;
        let p = {};

        if (idStr && App.data.eventos && Array.isArray(App.data.eventos)) {
          const full = App.data.eventos.find(fe =>
            String(fe.id) === idStr || (fe.properties && String(fe.properties.id) === idStr)
          );
          if (full) {
            if (full.properties && typeof full.properties === "object") {
              p = { ...full.properties };
            } else {
              const { type, geometry, ...rest } = full;
              p = { ...rest };
            }
          }
        }
        if (Object.keys(p).length === 0) p = { ...(f.properties || {}) };

        if (p.lng == null && p.lat == null && lngLat) {
          p.lng = lngLat.lng;
          p.lat = lngLat.lat;
        }

        const fecha = p.createdAt ? new Date(p.createdAt).toLocaleString() : "Sin fecha";
        const creadoPor = escapeHtml(String(p.createdBy || p.creadoPor || "—"));
        const nombrePin = escapeHtml(p.tipo || p.nombre || "Evento");
        const notasFull = p.notas ? escapeHtml(String(p.notas)) : "—";
        const lat = lngLat.lat != null ? Number(lngLat.lat) : (p.lat != null ? Number(p.lat) : null);
        const lng = lngLat.lng != null ? Number(lngLat.lng) : (p.lng != null ? Number(p.lng) : null);
        const coordsText = (lat != null && lng != null) ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "—";
        const centralKey = p.central || "";
        const distCentral = (window.__FTTH_CENTRALES__ && window.__FTTH_CENTRALES__.distanciaDesdeCentral && lng != null && lat != null)
          ? window.__FTTH_CENTRALES__.distanciaDesdeCentral(lng, lat, centralKey)
          : "—";

        const html = `
  <div class="popup pin-popup pin-popup-card" role="dialog" aria-label="Propiedades del evento">
    <div class="pin-popup-header">
      <div class="pin-popup-header-icon evento">🚨</div>
      <h3 class="pin-popup-title">${nombrePin}</h3>
    </div>
    <div class="pin-popup-body">
      <div class="pin-popup-row"><span class="pin-popup-label">Distancia desde central</span><span class="pin-popup-value">${escapeHtml(distCentral)}</span></div>
      <div class="pin-popup-row"><span class="pin-popup-label">Coordenadas</span><span class="pin-popup-value pin-popup-coords">${coordsText}</span></div>
      <div class="pin-popup-row"><span class="pin-popup-label">Fecha de creación</span><span class="pin-popup-value">${escapeHtml(fecha)}</span></div>
      <div class="pin-popup-row"><span class="pin-popup-label">Creado por</span><span class="pin-popup-value">${creadoPor}</span></div>
      <div class="pin-popup-row pin-popup-row-notes"><span class="pin-popup-label">Notas</span><div class="pin-popup-notes-scroll"><span class="pin-popup-value">${notasFull}</span></div></div>
    </div>
    <div class="pin-popup-actions">
      <button type="button" data-pin-action="copy-coords" class="pin-popup-btn pin-popup-btn-copy" aria-label="Copiar coordenadas">📋 Copiar coordenadas</button>
      <button type="button" data-pin-action="edit" class="pin-popup-btn pin-popup-btn-edit" aria-label="Editar evento">✏️ Editar</button>
      <button type="button" data-pin-action="delete" class="pin-popup-btn pin-popup-btn-delete" aria-label="Eliminar evento">🗑️ Eliminar</button>
    </div>
  </div>
`;

        const wrap = document.createElement("div");
        wrap.innerHTML = html.trim();
        const content = wrap.firstElementChild;

        function fallbackCopy(text, btn) {
          try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            btn.textContent = "✓ Copiado";
            setTimeout(() => { btn.textContent = "📋 Copiar coordenadas"; }, (window.__FTTH_CONFIG__?.DEBOUNCE?.COPY_BUTTON_RESET_MS) ?? 1500);
          } catch (err) {
            alert("Coordenadas: " + text);
          }
        }

        const overlay = document.getElementById("pinBottomSheetOverlay");
        const useBottomSheet = isMobile() && overlay;

        if (useBottomSheet) {
          closePinBottomSheet();
          const contentEl = document.getElementById("pinBottomSheetContent");
          if (contentEl) contentEl.appendChild(content);
          overlay.classList.remove("hidden");
          overlay.setAttribute("aria-hidden", "false");

          function closeSheet() {
            closePinBottomSheet();
          }
          overlay.addEventListener("click", function onOverlayClick(e) {
            if (e.target === overlay) {
              closeSheet();
              overlay.removeEventListener("click", onOverlayClick);
            }
          });
          const closeBtn = overlay.querySelector(".pin-bottomsheet-close");
          if (closeBtn) closeBtn.addEventListener("click", function () { closeSheet(); });

          const btnCopyCoords = content.querySelector('[data-pin-action="copy-coords"]');
          const btnEdit = content.querySelector('[data-pin-action="edit"]');
          const btnDelete = content.querySelector('[data-pin-action="delete"]');
          if (btnCopyCoords && coordsText !== "—") {
            btnCopyCoords.addEventListener("click", function (e) {
              e.preventDefault();
              e.stopPropagation();
              const text = coordsText;
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                  btnCopyCoords.textContent = "✓ Copiado";
                  setTimeout(() => { btnCopyCoords.textContent = "📋 Copiar coordenadas"; }, (window.__FTTH_CONFIG__?.DEBOUNCE?.COPY_BUTTON_RESET_MS) ?? 1500);
                }).catch(() => { fallbackCopy(text, btnCopyCoords); });
              } else {
                fallbackCopy(text, btnCopyCoords);
              }
            });
          }
          if (btnEdit) {
            btnEdit.addEventListener("click", function (e) {
              e.preventDefault();
              e.stopPropagation();
              closeSheet();
              abrirEdicionEvento(p);
            });
          }
          if (btnDelete) {
            btnDelete.addEventListener("click", async function (e) {
              e.preventDefault();
              e.stopPropagation();
              const codigo = window.prompt("Código para eliminar:");
              const esperado = (window.__FTTH_CONFIG__ && window.__FTTH_CONFIG__.DELETE_PIN) || "7431";
              if (codigo !== esperado) {
                alert("Código incorrecto");
                return;
              }
              if (!confirm("¿Estás seguro de eliminar este evento?")) return;
              try {
                const FB = window.FTTH_FIREBASE;
                const eliminar = isCorporativoEvento ? FB?.eliminarEventoCorp : FB?.eliminarEvento;
                if (eliminar && p.id) {
                  await eliminar(p.id);
                  closeSheet();
                  if (log) log("log", "✅ Evento eliminado:", p.id);
                } else {
                  alert("❌ No se pudo eliminar el evento");
                }
              } catch (err) {
                console.error("❌ Error eliminando evento:", err);
                alert("❌ Error al eliminar el evento");
              }
            });
          }
          return;
        }

        const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat(lngLat)
          .setDOMContent(content)
          .addTo(App.map);

        const btnCopyCoords = content.querySelector('[data-pin-action="copy-coords"]');
        const btnEdit = content.querySelector('[data-pin-action="edit"]');
        const btnDelete = content.querySelector('[data-pin-action="delete"]');
        if (btnCopyCoords && coordsText !== "—") {
          btnCopyCoords.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            const text = coordsText;
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(() => {
                btnCopyCoords.textContent = "✓ Copiado";
                setTimeout(() => { btnCopyCoords.textContent = "📋 Copiar coordenadas"; }, (window.__FTTH_CONFIG__?.DEBOUNCE?.COPY_BUTTON_RESET_MS) ?? 1500);
              }).catch(() => { fallbackCopy(text, btnCopyCoords); });
            } else {
              fallbackCopy(text, btnCopyCoords);
            }
          });
        }
        if (btnEdit) {
          btnEdit.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            popup.remove();
            abrirEdicionEvento(p);
          });
        }
        if (btnDelete) {
          btnDelete.addEventListener("click", async function (e) {
            e.preventDefault();
            e.stopPropagation();
            const codigo = window.prompt("Código para eliminar:");
            const esperado = (window.__FTTH_CONFIG__ && window.__FTTH_CONFIG__.DELETE_PIN) || "7431";
            if (codigo !== esperado) {
              alert("Código incorrecto");
              return;
            }
            if (!confirm("¿Estás seguro de eliminar este evento?")) return;
            try {
              const FB = window.FTTH_FIREBASE;
              const eliminar = isCorporativoEvento ? FB?.eliminarEventoCorp : FB?.eliminarEvento;
              if (eliminar && p.id) {
                await eliminar(p.id);
                popup.remove();
                if (log) log("log", "✅ Evento eliminado:", p.id);
              } else {
                alert("❌ No se pudo eliminar el evento");
              }
            } catch (err) {
              console.error("❌ Error eliminando evento:", err);
              alert("❌ Error al eliminar el evento");
            }
          });
        }
      }

      if (handlerClickLayer && App.map) {
        App.map.off("click", LAYER_ID, handlerClickLayer);
        App.map.off("click", handlerClickFallback);
        App.map.off("mouseenter", LAYER_ID, handlerMouseEnter);
        App.map.off("mouseleave", LAYER_ID, handlerMouseLeave);
      }

      handlerClickLayer = function (e) {
        if (App.tools?.medicion?.isActive?.()) return;
        const f = e.features?.[0];
        if (!f) return;
        if (active) blockNextClick = true;
        showEventoPopup(f, e.lngLat);
        popupShownThisClick = true;
      };
      handlerClickFallback = function (e) {
        popupShownThisClick = false;
        if (App.tools?.medicion?.isActive?.()) return;
        if (active) return;
        if (!App.map.getLayer(LAYER_ID)) return;
        setTimeout(() => {
          if (popupShownThisClick) return;
          const hits = App.map.queryRenderedFeatures(e.point, { layers: [LAYER_ID] });
          if (hits.length) showEventoPopup(hits[0], e.lngLat);
        }, 0);
      };
      handlerMouseEnter = function () {
        if (!App.tools.medicion?.isActive()) App.map.getCanvas().style.cursor = "pointer";
      };
      handlerMouseLeave = function () {
        if (!App.tools.medicion?.isActive()) App.map.getCanvas().style.cursor = "";
      };

      App.map.on("click", LAYER_ID, handlerClickLayer);
      App.map.on("click", handlerClickFallback);
      App.map.on("mouseenter", LAYER_ID, handlerMouseEnter);
      App.map.on("mouseleave", LAYER_ID, handlerMouseLeave);

      if (log) log("log", "✅ Capa eventos creada");
    }

    /* ===============================
       Render eventos (throttle setData para mejor render)
    =============================== */
    var _refreshEventosTimeout = null;
    var SETDATA_THROTTLE_MS = 400;
    function refreshLayer() {
      if (!App?.map) return;
      if (_refreshEventosTimeout) return;
      _refreshEventosTimeout = setTimeout(function () {
        _refreshEventosTimeout = null;
        let source = null;
        try {
          source = App.map.getSource(SOURCE_ID);
        } catch (_) {}
        if (!source) {
          initLayer();
          try { source = App.map.getSource(SOURCE_ID); } catch (_) { return; }
        }
        if (source) {
          source.setData({
            type: "FeatureCollection",
            features: App.data.eventos || []
          });
          window.dispatchEvent(new CustomEvent("ftth-eventos-layer-refreshed"));
        }
      }, SETDATA_THROTTLE_MS);
    }

    function addEventoToMap(evt) {
      if (!evt?.lng || !evt?.lat) return;

      const lng = Number(evt.lng);
      const lat = Number(evt.lat);
      const validators = window.__FTTH_VALIDATORS__;
      if (validators?.coordenadas) {
        const res = validators.coordenadas(lng, lat);
        if (!res.valid) {
          if (window.ErrorHandler) window.ErrorHandler.handle(new Error(res.error), "addEventoToMap", { id: evt?.id });
          return;
        }
      } else if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      // ✅ Asegurar que el icono esté cargado
      const estado = evt.estado || "";
      loadEventoIconSync(estado);

      const index = App.data.eventos.findIndex(f => f.id === evt.id);

      const feature = {
        id: evt.id,
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: evt
      };

      if (index >= 0) App.data.eventos[index] = feature;
      else App.data.eventos.push(feature);

      refreshLayer();
    }

    function removeEventoFromMap(id) {
      App.data.eventos = App.data.eventos.filter(f => f.id !== id);
      refreshLayer();
    }

    /* ===============================
       Firebase Sync
    =============================== */

    // 👉 Exponer recarga global para cambios de estilo
    App.reloadEventos = function () {
      if (log) log("log", "🔄 Recargando capa EVENTOS");

      // Volver a crear source + layer si fueron destruidos
      initLayer();

      // Volver a pintar datos en el mapa
      refreshLayer();
    };

    // Crear capa cuando el estilo del mapa esté cargado
    function runInitLayerWhenReady() {
      if (!App || !App.map) return;
      if (App.map.isStyleLoaded()) {
        initLayer();
        refreshLayer();
      } else {
        App.map.once("load", () => {
          initLayer();
          refreshLayer();
        });
      }
    }
    runInitLayerWhenReady();

    // ✅ Refrescar capa cuando el buscador selecciona un evento (asegura que se vea a la primera)
    window.addEventListener("ftth-refresh-eventos", () => {
      if (typeof refreshLayer === "function") refreshLayer();
    });

    // ✅ Escuchar cambios desde Firebase (guardar referencia para cleanup)
    let unsubscribeEventos = null;
    
    function setupEventosListener() {
      const FB = window.FTTH_FIREBASE;
      const escuchar = isCorporativoEvento ? FB?.escucharEventosCorp : FB?.escucharEventos;
      if (!escuchar) {
        if (log) log("warn", "⚠️ Listener de eventos no disponible aún");
        return false;
      }

      if (unsubscribeEventos) {
        unsubscribeEventos();
        unsubscribeEventos = null;
      }

      unsubscribeEventos = escuchar((evt) => {
        if (evt._deleted) {
          removeEventoFromMap(evt.id);
        } else {
          addEventoToMap(evt);
        }
      });
      if (log) log("log", isCorporativoEvento ? "✅ Listener eventos corporativo activo" : "✅ Listener de eventos Firebase activo");
      return true;
    }
    
    // Intentar configurar listener
    if (!setupEventosListener()) {
      // Si falla, reintentar después de 2 segundos
      setTimeout(() => {
        if (!unsubscribeEventos) {
          setupEventosListener();
        }
      }, 2000);
    }

    /* ===============================
       Modal helpers
    =============================== */
    async function loadCableNames() {
      if (cableNamesList.length > 0) return;
      try {
        const res = await fetch("../geojson/CABLES/cables.geojson", { cache: "default" });
        const geojson = await res.json();
        if (geojson.features && geojson.features.length) {
          cableNamesList = geojson.features
            .map(f => f.properties?.name)
            .filter(Boolean);
        }
      } catch (e) {
        if (log) log("warn", "⚠️ No se pudieron cargar cables para evento:", e);
      }
    }

    function showCableResults(query) {
      if (!elEventoCableResults) return;
      const q = (query || "").trim().toLowerCase();
      const list = q
        ? cableNamesList.filter(n => n.toLowerCase().includes(q))
        : cableNamesList.slice(0, 25);
      const max = 25;
      const toShow = list.slice(0, max);
      elEventoCableResults.innerHTML = "";
      elEventoCableResults.classList.remove("hidden");
      if (toShow.length === 0) {
        elEventoCableResults.innerHTML = '<div class="evento-cable-no-results">Sin coincidencias</div>';
        return;
      }
      toShow.forEach(name => {
        const item = document.createElement("div");
        item.className = "evento-cable-item";
        item.setAttribute("role", "option");
        item.textContent = name;
        item.dataset.cableName = name;
        item.addEventListener("click", () => {
          if (elEventoCable) {
            elEventoCable.value = name;
            elEventoCable.dataset.cableSelected = "1";
          }
          elEventoCableResults.classList.add("hidden");
          elEventoCableResults.innerHTML = "";
        });
        elEventoCableResults.appendChild(item);
      });
    }

    function hideCableResults() {
      if (elEventoCableResults) {
        elEventoCableResults.classList.add("hidden");
        elEventoCableResults.innerHTML = "";
      }
    }

    function openModal() {
      modal?.classList.remove("hidden");
      const editId = modal.dataset.editId;
      if (btnDelete) btnDelete.style.display = editId ? "inline-block" : "none";
      if (isCorporativoEvento) {
        loadCableNames();
        hideCableResults();
      }
    }

    function closeModal() {
      modal?.classList.add("hidden");
      modal.dataset.editId = "";
      selectedLngLat = null;
      blockNextClick = true;

      // limpiar inputs (para próxima vez)
      if (elTipo) elTipo.value = "";
      if (elAccion) elAccion.value = "";
      if (elEstado) elEstado.value = "PROVISIONAL";
      if (elTecnico) elTecnico.value = "";
      if (elNotas) elNotas.value = "";

      if (elCentralEvento) elCentralEvento.value = "";
      if (elMoleculaEvento) {
        elMoleculaEvento.innerHTML = `<option value="">Seleccione Molécula</option>`;
        elMoleculaEvento.disabled = true;
      }
      if (elEventoCable) {
        elEventoCable.value = "";
        delete elEventoCable.dataset.cableSelected;
      }
      hideCableResults();

    }

    btnClose?.addEventListener("click", closeModal);

    const btnCrearCierre = document.getElementById("btnCrearCierreDesdeEvento");
    btnCrearCierre?.addEventListener("click", () => {
      closeModal();
      window.dispatchEvent(new CustomEvent("ftth-switch-tool", { detail: { tool: "cierres" } }));
    });

    function abrirEdicionEvento(evt) {
      // llenar campos
      elTipo.value = evt.tipo || "";
      elAccion.value = evt.accion || "";
      elEstado.value = evt.estado || "PROVISIONAL";
      elTecnico.value = evt.tecnico || "";
      elNotas.value = evt.notas || "";

      if (elCentralEvento) {
        elCentralEvento.value = evt.central || "";
        elCentralEvento.dispatchEvent(new Event("change"));
      }
      if (elMoleculaEvento) elMoleculaEvento.value = evt.molecula || "";
      if (elEventoCable) elEventoCable.value = evt.cable || "";

      // set edit id
      modal.dataset.editId = evt.id || "";
      // al editar NO cambiamos coordenadas (las deja como estaban)
      selectedLngLat = { lng: Number(evt.lng), lat: Number(evt.lat) };

      openModal();
    }

    /* ===============================
       Central → Moléculas (compartido: utils/centrales.js)
    =============================== */
    const CENTRAL_PREFIX = (window.__FTTH_CENTRALES__ && window.__FTTH_CENTRALES__.CENTRAL_PREFIX) || {};
    const generarMoleculas = (window.__FTTH_CENTRALES__ && window.__FTTH_CENTRALES__.generarMoleculas) || (function () { return []; });

    function onDocumentClickCloseCableResults(e) {
      if (!elEventoCableResults || elEventoCableResults.classList.contains("hidden")) return;
      if (elEventoCable.contains(e.target) || elEventoCableResults.contains(e.target)) return;
      hideCableResults();
    }

    if (isCorporativoEvento && elEventoCable) {
      elEventoCable.addEventListener("input", () => {
        clearTimeout(eventoCableSearchTimeout);
        eventoCableSearchTimeout = setTimeout(() => {
          showCableResults(elEventoCable.value);
        }, 200);
      });
      elEventoCable.addEventListener("focus", () => {
        if (cableNamesList.length === 0) loadCableNames().then(() => showCableResults(elEventoCable.value));
        else showCableResults(elEventoCable.value);
      });
    }

    if (elCentralEvento && !isCorporativoEvento) {
      elCentralEvento.addEventListener("change", () => {
        if (!elMoleculaEvento) return;
        const central = elCentralEvento.value;
        elMoleculaEvento.innerHTML = `<option value="">Seleccione Molécula</option>`;

        const prefijo = CENTRAL_PREFIX[central];
        if (!prefijo) {
          elMoleculaEvento.disabled = true;
          return;
        }

        const moleculas = generarMoleculas(prefijo) || [];

        moleculas.forEach(mol => {
          const opt = document.createElement("option");
          opt.value = mol;
          opt.textContent = mol;
          elMoleculaEvento.appendChild(opt);
        });

        elMoleculaEvento.disabled = false;
      });
    }

    /* ===============================
       Tool control
    =============================== */
    function start() {
      if (active) return;
      active = true;

      App.map.getCanvas().style.cursor = "crosshair";
      App.map.on("click", handleMapClick);
      if (isCorporativoEvento && elEventoCable) {
        document.addEventListener("click", onDocumentClickCloseCableResults);
      }

      if (log) log("log", "🚨 Montar Evento ACTIVADO");
    }

    function stop() {
      active = false;
      App.map.off("click", handleMapClick);
      App.map.getCanvas().style.cursor = "";
      if (isCorporativoEvento && elEventoCable) {
        document.removeEventListener("click", onDocumentClickCloseCableResults);
      }
      closeModal();
      
      // ✅ Limpiar listener de Firebase si existe
      if (unsubscribeEventos && typeof unsubscribeEventos === "function") {
        unsubscribeEventos();
        unsubscribeEventos = null;
      }
      
      if (log) log("log", "🛑 Montar Evento DESACTIVADO");
    }

    function handleMapClick(e) {
      if (!active) return;

      if (blockNextClick) {
        blockNextClick = false;
        return;
      }

      selectedLngLat = e.lngLat;
      modal.dataset.editId = ""; // creación nueva

      // defaults rápidos (operación)
      if (elEstado) elEstado.value = "PROVISIONAL";

      if (elCentralEvento) elCentralEvento.value = "";
      if (elMoleculaEvento) {
        elMoleculaEvento.innerHTML = `<option value="">Seleccione Molécula</option>`;
        elMoleculaEvento.disabled = true;
      }
      if (elEventoCable) {
        elEventoCable.value = "";
        delete elEventoCable.dataset.cableSelected;
      }
      hideCableResults();

      openModal();
    }

    /* ===============================
       Validaciones
    =============================== */
    function validar(evt) {
      if (!evt.tipo) return "⚠️ Selecciona el Tipo (Vandalismo / Corte / etc.)";
      if (!evt.accion) return "⚠️ Selecciona la Acción (Empalme provisional / etc.)";
      if (!evt.estado) return "⚠️ Selecciona el Estado";
      if (!evt.tecnico) return "⚠️ Escribe el nombre del técnico";
      if (!selectedLngLat?.lng || !selectedLngLat?.lat) return "⚠️ Selecciona un punto en el mapa";
      if (isCorporativoEvento && !(elEventoCable?.value || "").trim()) return "⚠️ Indica el CABLES (busca y selecciona un cable)";
      if (!isCorporativoEvento && !(evt.central || "").trim()) return "⚠️ Selecciona Central";
      return "";
    }

/* ===============================
   Guardar evento
=============================== */
btnSave?.addEventListener("click", async (e) => {
  e.stopPropagation();
  
  const user = window.FTTH_CORE?.auth?.currentUser;
  const createdBy = user?.email || user?.displayName || user?.uid || "";

  const evento = {
    tipo: (elTipo.value || "").trim(),
    accion: (elAccion.value || "").trim(),
    estado: (elEstado.value || "").trim(),
    tecnico: (elTecnico.value || "").trim(),
    notas: (elNotas.value || "").trim(),
    central: (elCentralEvento?.value || "").trim(),
    molecula: (elMoleculaEvento?.value || "").trim(),
    lng: selectedLngLat?.lng,
    lat: selectedLngLat?.lat,
    createdAt: new Date().toISOString(),
    createdBy
  };
  if (isCorporativoEvento && elEventoCable) {
    evento.cable = (elEventoCable.value || "").trim();
  }

  const msg = validar(evento);
  if (msg) return alert(msg);

  const validators = window.__FTTH_VALIDATORS__;
  if (validators?.coordenadas && evento.lng != null && evento.lat != null) {
    const res = validators.coordenadas(Number(evento.lng), Number(evento.lat));
    if (!res.valid) {
      alert("⚠️ " + (res.error || "Coordenadas inválidas"));
      return;
    }
  }

  try {
    const editId = modal.dataset.editId;
    let eventoId = editId;
    const guardar = isCorporativoEvento ? FB.guardarEventoCorp : FB.guardarEvento;
    const actualizar = isCorporativoEvento ? FB.actualizarEventoCorp : FB.actualizarEvento;

    /* =========================
       1️⃣ Guardar evento base (FTTH → eventos | Corp → eventos_corporativo)
    ========================= */
    if (editId) {
      const update = { ...evento };
      delete update.createdAt;
      update.updatedAt = new Date().toISOString();
      if (!actualizar) throw new Error("actualizarEvento no disponible");
      await actualizar(editId, update);
      eventoId = editId;
    } else {
      if (!guardar) throw new Error("guardarEvento no disponible");
      eventoId = await guardar(evento);
    }
    
    if (!eventoId) {
      throw new Error("No se pudo obtener eventoId");
    }

    // ✅ Agregar/actualizar evento en el mapa inmediatamente después de guardarlo
    const eventoCompleto = {
      id: eventoId,
      ...evento
    };
    addEventoToMap(eventoCompleto);
    
    if (log) log("log", "✅ Evento agregado al mapa:", eventoId);
    
    closeModal();
  } catch (err) {
    if (window.ErrorHandler) {
      window.ErrorHandler.handle(err, "guardarEvento");
      alert("❌ " + (window.ErrorHandler.getUserMessage(err) || "Error guardando evento"));
    } else {
      console.error("❌ Error guardando evento:", err);
      alert("❌ Error guardando evento");
    }
  }
});
    /* ===============================
       Eliminar evento
    =============================== */
    btnDelete?.addEventListener("click", async () => {
      const id = modal.dataset.editId;
      if (!id) return;

      const codigo = window.prompt("Código para eliminar:");
      const esperado = (window.__FTTH_CONFIG__ && window.__FTTH_CONFIG__.DELETE_PIN) || "7431";
      if (codigo !== esperado) {
        alert("Código incorrecto");
        return;
      }
      if (!confirm("¿Eliminar este evento?")) return;

      try {
        const eliminar = isCorporativoEvento ? FB.eliminarEventoCorp : FB.eliminarEvento;
        if (eliminar) {
          await eliminar(id);
        } else {
          if (log) log("warn", "⚠️ eliminarEvento no disponible");
        }

        removeEventoFromMap(id);
        closeModal();
      } catch (err) {
        console.error(err);
        alert("❌ Error eliminando evento");
      }
    });

    /* ===============================
       Registrar tool
    =============================== */
    App.tools.eventos = { start, stop };

    if (log) log("log", "🚀 tool.eventos listo (PRO)");
  }

  // ✅ Inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
export {};