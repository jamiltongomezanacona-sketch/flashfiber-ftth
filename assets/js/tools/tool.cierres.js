/* =========================================================
   FlashFiber FTTH | tool.cierres.js
   Cierres FTTH - Crear / Editar / Eliminar (Firebase Sync)
   ✔ Inicializa sin depender de Firebase
   ✔ Reintenta conexión Firebase automáticamente
   ✔ Reconstruye capas al cambiar estilo Mapbox
   ✔ Click estable móvil / desktop
========================================================= */

(function () {
  "use strict";

  const log = window.__FTTH_LOG__;

  // ✅ Sistema de inicialización mejorado
  async function init() {
    await waitForDependencies();
    initializeTool();
  }

  async function waitForDependencies(maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      const App = window.__FTTH_APP__;
      if (App?.map) {
        if (log) log("log", "✅ tool.cierres: Dependencias disponibles después de", i + 1, "intentos");
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (log) log("warn", "⚠️ tool.cierres: App.map no disponible después de esperar", maxAttempts, "intentos");
    if (log) log("warn", "💡 Reintentando en 2 segundos...");
    
    // ✅ Retry después de 2 segundos (igual que eventos)
    setTimeout(async () => {
      const App = window.__FTTH_APP__;
      if (App?.map) {
        if (log) log("log", "✅ tool.cierres: Dependencias disponibles en retry");
        initializeTool();
      } else {
        console.error("❌ tool.cierres: Dependencias aún no disponibles después del retry");
      }
    }, 2000);
    
    return false;
  }

  function initializeTool() {
    const App = window.__FTTH_APP__;
    if (!App || !App.map) {
      console.error("❌ tool.cierres: App o App.map no disponible");
      return;
    }

    if (!App.tools) App.tools = {};
    if (!App.data) App.data = { cierres: [] };

    let active = false;
    let selectedLngLat = null;
    let blockNextClick = false;
    let handlerClickLayer = null, handlerClickFallback = null, handlerMouseEnter = null, handlerMouseLeave = null;

    const modal      = document.getElementById("cierreModal");
    const btnSave    = document.getElementById("btnSaveCierre");
    const btnCancel  = document.getElementById("btnCancelCierre");
    const btnClose   = document.getElementById("closeCierreModal");
    const btnDelete  = document.getElementById("btnDeleteCierre");

    const selectTipo = document.getElementById("cierreTipo");
    const selectCentral  = document.getElementById("cierreCentral");
    const selectMolecula = document.getElementById("cierreMolecula");
    const inputCodigo = document.getElementById("cierreCodigo");
    const camposDinamicos = document.getElementById("cierreCamposDinamicos");

    /* ===============================
       Prefijos por central (compartido: utils/centrales.js)
    =============================== */
    const CENTRAL_PREFIX = (window.__FTTH_CENTRALES__ && window.__FTTH_CENTRALES__.CENTRAL_PREFIX) || {};
    const generarMoleculas = (window.__FTTH_CENTRALES__ && window.__FTTH_CENTRALES__.generarMoleculas) || (function () { return []; });

    /* ===============================
       Generar código automáticamente
    =============================== */
    function generarCodigo() {
      if (!inputCodigo) return;
      const tipo = selectTipo?.value || "";
      const central = selectCentral?.value || "";
      const molecula = selectMolecula?.value || "";

      if (!tipo || !central || !molecula) {
        inputCodigo.value = "";
        return;
      }

      if (tipo === "E1") {
        const sufijo = document.getElementById("cierreSufijoE1")?.value || "";
        inputCodigo.value = sufijo ? `${tipo}${molecula}-${sufijo}` : "";
        return;
      }
      if (tipo === "E2") {
        const submolecula = document.getElementById("cierreSubmolecula")?.value || "";
        const numero = document.getElementById("cierreNumeroE2")?.value || "";
        inputCodigo.value = submolecula && numero ? `${tipo}${molecula}-${submolecula}${numero}` : "";
        return;
      }
      if (tipo === "NAP") {
        inputCodigo.value = "";
        return;
      }
      inputCodigo.value = "";
    }

    /* ===============================
       Actualizar campos dinámicos según tipo
    =============================== */
    function actualizarCamposDinamicos() {
      if (!camposDinamicos) return;
      const tipo = selectTipo?.value || "";
      camposDinamicos.innerHTML = "";

      if (tipo === "E1") {
        // E1: Solo necesita sufijo (1-10)
        camposDinamicos.innerHTML = `
          <label>🔢 Sufijo</label>
          <select id="cierreSufijoE1">
            <option value="">Seleccione Sufijo</option>
            ${Array.from({ length: 10 }, (_, i) => 
              `<option value="${i + 1}">${i + 1}</option>`
            ).join("")}
          </select>
        `;
        
        const selectSufijo = document.getElementById("cierreSufijoE1");
        selectSufijo?.addEventListener("change", generarCodigo);
      } else if (tipo === "E2") {
        // E2: Submolécula (A hasta P) + Número
        const letrasSubmolecula = Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i)); // A..P
        camposDinamicos.innerHTML = `
          <label>🔤 Submolécula</label>
          <select id="cierreSubmolecula">
            <option value="">Seleccione Submolécula</option>
            ${letrasSubmolecula.map(l => `<option value="${l}">${l}</option>`).join("")}
          </select>
          <label>🔢 Número</label>
          <select id="cierreNumeroE2">
            <option value="">Seleccione Número</option>
            ${Array.from({ length: 10 }, (_, i) => 
              `<option value="${i + 1}">${i + 1}</option>`
            ).join("")}
          </select>
        `;
        
        const selectSubmolecula = document.getElementById("cierreSubmolecula");
        const selectNumero = document.getElementById("cierreNumeroE2");
        selectSubmolecula?.addEventListener("change", generarCodigo);
        selectNumero?.addEventListener("change", generarCodigo);
      }
    }

    // Cambio de tipo
    selectTipo?.addEventListener("change", () => {
      const tipo = selectTipo.value;
      
      // Resetear campos
      selectCentral.value = "";
      selectMolecula.innerHTML = `<option value="">Seleccione Molécula</option>`;
      selectMolecula.disabled = true;
      inputCodigo.value = "";
      
      // Habilitar central si hay tipo seleccionado
      if (tipo) {
        selectCentral.disabled = false;
      } else {
        selectCentral.disabled = true;
        camposDinamicos.innerHTML = "";
      }
      
      actualizarCamposDinamicos();
    });

    // Cambio de central
    selectCentral?.addEventListener("change", () => {
      if (!selectMolecula) return;
      const central = selectCentral.value;
      selectMolecula.innerHTML = `<option value="">Seleccione Molécula</option>`;
      if (inputCodigo) inputCodigo.value = "";

      const prefijo = CENTRAL_PREFIX[central];
      if (!prefijo) {
        selectMolecula.disabled = true;
        return;
      }

      const moleculas = generarMoleculas(prefijo);
      moleculas.forEach(mol => {
        const opt = document.createElement("option");
        opt.value = mol;
        opt.textContent = mol;
        selectMolecula.appendChild(opt);
      });

      selectMolecula.disabled = false;
    });

    // Cambio de molécula
    selectMolecula?.addEventListener("change", generarCodigo);

    /* ===============================
       Map Layer - Estilo Google Maps (IDs desde config)
    =============================== */
    const CONFIG = window.__FTTH_CONFIG__ || {};
    const SOURCE_ID = "cierres-src";
    const LAYER_ID  = CONFIG.LAYERS?.CIERRES || "cierres-layer";
    const ICON_SIZE = 40; // Tamaño base del icono

    /* ===============================
       Colores por tipo de cierre (E1 gris, E2 naranja)
    =============================== */
    function getColorByTipo(tipo) {
      const t = (tipo || "").toUpperCase();
      if (t === "E2") return "#FF8C00"; // Naranja para E2
      return "#9E9E9E"; // Gris para E1, E0 y resto
    }

    /* ===============================
       Generar icono SVG estilo eventos (pin con círculo)
    =============================== */
    function createPinIconSVG(color, label = "") {
      const size = ICON_SIZE;
      const pinWidth = size * 0.6;
      const pinHeight = size * 0.8;
      const labelText = label.substring(0, 2).toUpperCase() || "🔒";
      
      // Emoji o texto según el tipo
      let displayText = "🔒"; // Emoji de candado por defecto
      if (label && label.length <= 2) {
        displayText = label.toUpperCase();
      } else if (label && label.length > 2) {
        displayText = label.substring(0, 2).toUpperCase();
      }

      const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-cierre-${color.replace('#', '')}">
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
                filter="url(#shadow-cierre-${color.replace('#', '')})"/>
          <!-- Label circle -->
          <circle cx="${size/2}" cy="${size*0.4}" r="${size*0.25}" 
                  fill="#fff" stroke="${color}" stroke-width="2"/>
          <!-- Text/Emoji -->
          <text x="${size/2}" y="${size*0.48}" 
                font-size="${size*0.25}" 
                text-anchor="middle" 
                dominant-baseline="middle"
                font-family="Arial, sans-serif"
                font-weight="bold">${displayText}</text>
        </svg>
      `;
      
      return svg;
    }

    /* ===============================
       Convertir SVG a Image para Mapbox
       (Usa el mismo estilo que eventos: pin con círculo)
    =============================== */
    function createPinIcon(color, label = "") {
      return new Promise((resolve, reject) => {
        try {
          const svg = createPinIconSVG(color, label);
          const img = new Image();
          const svgBlob = new Blob([svg], { type: "image/svg+xml" });
          const url = URL.createObjectURL(svgBlob);

          img.onload = () => {
            resolve(img);
            URL.revokeObjectURL(url);
          };
          
          img.onerror = (err) => {
            if (log) log("warn", "⚠️ Error cargando icono SVG de cierre:", err);
            URL.revokeObjectURL(url);
            reject(new Error(`Error creando imagen desde SVG: ${err}`));
          };
          
          img.src = url;
        } catch (err) {
          reject(new Error(`Error en createPinIcon: ${err.message}`));
        }
      });
    }

    /* ===============================
       Cargar iconos en Mapbox
    =============================== */
    const loadedIcons = new Set();
    const loadingIcons = new Map(); // Iconos en proceso de carga
    
    // ✅ Cargar iconos de forma síncrona (EXACTAMENTE igual que eventos)
    function loadCierreIconSync(tipo, label = "") {
      const color = getColorByTipo(tipo);
      const iconId = `cierre-${tipo}-${label || 'default'}`;
      
      if (!App || !App.map) return iconId;
      if (App.map.hasImage(iconId)) {
        return iconId;
      }

      const svg = createPinIconSVG(color, label);
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
        if (log) log("warn", "⚠️ Error cargando icono de cierre:", iconId);
        URL.revokeObjectURL(url);
      };
      img.src = url;
      
      return iconId;
    }
    
    function loadIconForTipo(tipo, label = "") {
      const iconId = `cierre-${tipo}-${label || 'default'}`;
      if (!App || !App.map) return iconId;
      if (App.map.hasImage(iconId)) return iconId;
      if (!App.map.isStyleLoaded()) return iconId;
      loadCierreIconSync(tipo, label);
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
        if (log) log("warn", "⚠️ tool.cierres: addSource falló (¿estilo no cargado?), reintentando en load:", err.message);
        App.map.once("load", () => initLayer());
        return;
      }
      
      // ✅ Pre-cargar icono por defecto en gris (igual que eventos)
      loadCierreIconSync("E1", "");

      try {
        const beforeId = (typeof App.getBeforeIdForDataLayers === "function" && App.getBeforeIdForDataLayers(App.map)) || undefined;
        App.map.addLayer({
          id: LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          layout: {
            visibility: "none",
            "icon-image": [
              "coalesce",
              ["get", "iconId"],
              "cierre-E1-default"
            ],
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10, 0.6,
              15, 1.0,
              20, 1.4
            ],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-anchor": "bottom",
            "icon-pitch-alignment": "viewport"
          }
        }, beforeId);
      } catch (err) {
        if (log) log("warn", "⚠️ tool.cierres: addLayer falló, reintentando en load:", err.message);
        App.map.once("load", () => initLayer());
        return;
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
      function showCierrePopup(f, lngLat) {
        if (!f || !lngLat) return;
        const id = f.id ?? f.properties?.id;
        const idStr = id != null ? String(id) : null;
        let p = {};

        if (idStr && App.data.cierres && Array.isArray(App.data.cierres)) {
          const full = App.data.cierres.find(fe =>
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
        const nombrePin = escapeHtml(p.codigo || "Cierre");
        const notasFull = p.notas ? escapeHtml(String(p.notas)) : "—";
        const lat = lngLat.lat != null ? Number(lngLat.lat) : (p.lat != null ? Number(p.lat) : null);
        const lng = lngLat.lng != null ? Number(lngLat.lng) : (p.lng != null ? Number(p.lng) : null);
        const coordsText = (lat != null && lng != null) ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "—";

        const html = `
  <div class="popup pin-popup pin-popup-card" role="dialog" aria-label="Propiedades del cierre">
    <div class="pin-popup-header">
      <div class="pin-popup-header-icon cierre">🔒</div>
      <h3 class="pin-popup-title">${nombrePin}</h3>
    </div>
    <div class="pin-popup-body">
      <div class="pin-popup-row"><span class="pin-popup-label">Coordenadas</span><span class="pin-popup-value pin-popup-coords">${coordsText}</span></div>
      <div class="pin-popup-row"><span class="pin-popup-label">Fecha de creación</span><span class="pin-popup-value">${escapeHtml(fecha)}</span></div>
      <div class="pin-popup-row"><span class="pin-popup-label">Creado por</span><span class="pin-popup-value">${creadoPor}</span></div>
      <div class="pin-popup-row pin-popup-row-notes"><span class="pin-popup-label">Notas</span><div class="pin-popup-notes-scroll"><span class="pin-popup-value">${notasFull}</span></div></div>
    </div>
    <div class="pin-popup-actions">
      <button type="button" data-pin-action="copy-coords" class="pin-popup-btn pin-popup-btn-copy" aria-label="Copiar coordenadas">📋 Copiar coordenadas</button>
      <button type="button" data-pin-action="edit" class="pin-popup-btn pin-popup-btn-edit" aria-label="Editar cierre">✏️ Editar</button>
      <button type="button" data-pin-action="delete" class="pin-popup-btn pin-popup-btn-delete" aria-label="Eliminar cierre">🗑️ Eliminar</button>
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
              abrirEdicionCierre(p);
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
              if (!confirm("¿Eliminar este cierre?")) return;
              try {
                const FB = window.FTTH_FIREBASE;
                const id = p.id || idStr;
                if (FB?.eliminarCierre && id) {
                  await FB.eliminarCierre(id);
                  closeSheet();
                  if (log) log("log", "✅ Cierre eliminado:", id);
                } else {
                  alert("❌ No se pudo eliminar el cierre");
                }
              } catch (err) {
                console.error("❌ Error eliminando cierre:", err);
                alert("❌ Error al eliminar el cierre");
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
            abrirEdicionCierre(p);
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
            if (!confirm("¿Eliminar este cierre?")) return;
            try {
              const FB = window.FTTH_FIREBASE;
              const id = p.id || idStr;
              if (FB?.eliminarCierre && id) {
                await FB.eliminarCierre(id);
                popup.remove();
                if (log) log("log", "✅ Cierre eliminado:", id);
              } else {
                alert("❌ No se pudo eliminar el cierre");
              }
            } catch (err) {
              console.error("❌ Error eliminando cierre:", err);
              alert("❌ Error al eliminar el cierre");
            }
          });
        }
      }

      // Desregistrar listeners previos (evita duplicados tras style.load)
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
        showCierrePopup(f, e.lngLat);
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
          if (hits.length) showCierrePopup(hits[0], e.lngLat);
        }, 0);
      };
      handlerMouseEnter = function () {
        if (App && App.map && !App.tools.medicion?.isActive()) App.map.getCanvas().style.cursor = "pointer";
      };
      handlerMouseLeave = function () {
        if (App && App.map && !App.tools.medicion?.isActive()) App.map.getCanvas().style.cursor = "";
      };

      App.map.on("click", LAYER_ID, handlerClickLayer);
      App.map.on("click", handlerClickFallback);
      App.map.on("mouseenter", LAYER_ID, handlerMouseEnter);
      App.map.on("mouseleave", LAYER_ID, handlerMouseLeave);

      if (log) log("log", "✅ Capa cierres creada (estilo Google Maps)");
    }

    var _refreshCierresTimeout = null;
    var SETDATA_THROTTLE_MS = 400;
    function refreshLayer() {
      if (!App || !App.map) return;
      if (_refreshCierresTimeout) return;
      _refreshCierresTimeout = setTimeout(function () {
        _refreshCierresTimeout = null;
        const source = App.map.getSource(SOURCE_ID);
        if (!source) {
          initLayer();
          return;
        }
        source.setData({
          type: "FeatureCollection",
          features: App.data.cierres || []
        });
        if (!App.map.getLayer(LAYER_ID)) initLayer();
      }, SETDATA_THROTTLE_MS);
    }

    function addCierreToMap(cierre) {
      if (!cierre?.lng || !cierre?.lat) {
        if (window.ErrorHandler) window.ErrorHandler.handle(new Error("Cierre sin coordenadas"), "addCierreToMap", { codigo: cierre?.codigo, id: cierre?.id });
        else if (log) log("warn", "⚠️ Cierre sin coordenadas:", cierre.codigo || cierre.id);
        return;
      }

      const lng = Number(cierre.lng);
      const lat = Number(cierre.lat);
      const validators = window.__FTTH_VALIDATORS__;
      if (validators?.coordenadas) {
        const res = validators.coordenadas(lng, lat);
        if (!res.valid) {
          if (window.ErrorHandler) window.ErrorHandler.handle(new Error(res.error), "addCierreToMap", { codigo: cierre?.codigo });
          else if (log) log("warn", "⚠️ Coordenadas inválidas:", res.error);
          return;
        }
      } else if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        if (log) log("warn", "⚠️ Coordenadas inválidas:", cierre.codigo || cierre.id, lng, lat);
        return;
      }

      // ✅ Asegurar que el icono esté cargado (EXACTAMENTE igual que eventos)
      const label = cierre.codigo || cierre.molecula || "";
      const tipo = cierre.tipo || "E1";
      const labelShort = label.substring(0, 2).toUpperCase() || "";
      const iconId = `cierre-${tipo}-${labelShort || 'default'}`;
      
      if (log) log("log", "🎨 Cargando icono para cierre:", cierre.codigo, "iconId:", iconId);
      loadCierreIconSync(tipo, labelShort);

      const index = App.data.cierres.findIndex(c => c.id === cierre.id);

      const feature = {
        id: cierre.id,
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          ...cierre,
          iconId: iconId // ✅ Agregar iconId a propiedades
        }
      };

      if (index >= 0) {
        App.data.cierres[index] = feature;
        if (log) log("log", "🔄 Cierre actualizado en mapa:", cierre.codigo);
      } else {
        App.data.cierres.push(feature);
        if (log) log("log", "✅ Cierre agregado al mapa:", cierre.codigo, "Total cierres:", App.data.cierres.length);
      }

      refreshLayer();
    }

    function removeCierreFromMap(id) {
      App.data.cierres = App.data.cierres.filter(c => c.id !== id);
      refreshLayer();
    }

    /* ===============================
       Firebase Sync (con sistema de inicialización)
    =============================== */
    let unsubscribeCierres = null;
    
    async function initFirebaseSync() {
      // ✅ Usar initializer si está disponible
      if (window.__FTTH_INITIALIZER__) {
        window.__FTTH_INITIALIZER__.onReady(() => {
          setupFirebaseListener();
        });
      } else {
        // ✅ Fallback: esperar con Promise
        await waitForFirebase();
        setupFirebaseListener();
      }
    }

    function setupFirebaseListener() {
      const FB = window.FTTH_FIREBASE;
      if (!FB?.escucharCierres) {
        if (log) log("warn", "⚠️ Firebase cierres no disponible");
        return;
      }

      if (log) log("log", "✅ Firebase cierres conectado");
      unsubscribeCierres = FB.escucharCierres((cierre) => {
        if (log) log("log", "🔔 Cierre recibido de Firebase:", cierre.codigo || cierre.id, cierre);
        if (cierre._deleted) {
          // Si el cierre fue eliminado, removerlo del mapa
          removeCierreFromMap(cierre.id);
        } else {
          // Agregar o actualizar cierre en el mapa
          if (log) log("log", "📍 Agregando cierre al mapa:", cierre.codigo, "Coords:", cierre.lng, cierre.lat);
          addCierreToMap(cierre);
        }
      });
    }

    async function waitForFirebase(maxAttempts = 50) {
      for (let i = 0; i < maxAttempts; i++) {
        const FB = window.FTTH_FIREBASE;
        if (FB?.escucharCierres) {
          if (log) log("log", "✅ Firebase cierres disponible después de", i + 1, "intentos");
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (log) log("warn", "⚠️ Firebase cierres no disponible después de esperar", maxAttempts, "intentos");
      return false;
    }

    // Inicializar listener (con retry automático)
    initFirebaseSync();

    // ✅ Crear capa cuando el estilo del mapa esté cargado (evita fallo si se ejecuta antes de "load")
    function runInitLayerWhenReady() {
      if (!App || !App.map) return;
      if (App.map.isStyleLoaded()) initLayer();
      else App.map.once("load", () => initLayer());
    }
    runInitLayerWhenReady();

    // ✅ Refrescar capa cuando el buscador selecciona un cierre (asegura que se vea a la primera)
    window.addEventListener("ftth-refresh-cierres", () => {
      if (typeof refreshLayer === "function") refreshLayer();
    });

    // ✅ Retry si falla la primera vez (los módulos pueden cargarse después)
    setTimeout(() => {
      const FB = window.FTTH_FIREBASE;
      if (!unsubscribeCierres && FB?.escucharCierres) {
        if (log) log("log", "🔄 Reintentando conexión Firebase cierres...");
        setupFirebaseListener();
      }
    }, 2000);

    /* ===============================
       Modal helpers
    =============================== */
    function openModal() {
      modal?.classList.remove("hidden");
      // Resetear campos para nueva creación (igual que eventos)
      if (!modal.dataset.editId) {
        if (selectTipo) selectTipo.value = "";
        if (selectCentral) {
          selectCentral.value = "";
          selectCentral.disabled = true;
        }
        if (selectMolecula) {
          selectMolecula.innerHTML = `<option value="">Seleccione Molécula</option>`;
          selectMolecula.disabled = true;
        }
        if (inputCodigo) inputCodigo.value = "";
        if (camposDinamicos) camposDinamicos.innerHTML = "";
        const notas = document.getElementById("cierreNotas");
        if (notas) notas.value = "";
      }
    }

    function closeModal() {
      modal?.classList.add("hidden");
      modal.dataset.editId = "";
      selectedLngLat = null;
      blockNextClick = true;
      
      // Limpiar todos los campos
      if (selectTipo) selectTipo.value = "";
      if (selectCentral) {
        selectCentral.value = "";
        selectCentral.disabled = true;
      }
      if (selectMolecula) {
        selectMolecula.innerHTML = `<option value="">Seleccione Molécula</option>`;
        selectMolecula.disabled = true;
      }
      if (inputCodigo) inputCodigo.value = "";
      if (camposDinamicos) camposDinamicos.innerHTML = "";
      const notas = document.getElementById("cierreNotas");
      if (notas) notas.value = "";
    }

    btnCancel?.addEventListener("click", closeModal);
    btnClose?.addEventListener("click", closeModal);

    function abrirEdicionCierre(cierre) {
      // Establecer tipo primero
      if (selectTipo) selectTipo.value = cierre.tipo || "";
      selectTipo?.dispatchEvent(new Event("change"));
      
      // Establecer central y disparar evento para cargar moléculas
      if (selectCentral) {
        selectCentral.value = cierre.central || "";
        selectCentral.disabled = false;
        selectCentral.dispatchEvent(new Event("change"));
      }
      
      // Esperar un momento para que se carguen las moléculas
      setTimeout(() => {
        if (selectMolecula) {
          selectMolecula.value = cierre.molecula || "";
          selectMolecula.dispatchEvent(new Event("change"));
        }
        
        // Parsear código para rellenar campos dinámicos si es necesario
        const codigo = cierre.codigo || "";
        if (codigo && cierre.tipo === "E1") {
          // E1SI01-1 -> extraer sufijo "1"
          const match = codigo.match(/-(\d+)$/);
          if (match) {
            const sufijo = match[1];
            const selectSufijo = document.getElementById("cierreSufijoE1");
            if (selectSufijo) selectSufijo.value = sufijo;
          }
        } else if (codigo && cierre.tipo === "E2") {
          // E2SI03-A1 -> extraer submolecula "A".."P" y número
          const match = codigo.match(/-([A-P])(\d+)$/);
          if (match) {
            const submolecula = match[1];
            const numero = match[2];
            const selectSubmolecula = document.getElementById("cierreSubmolecula");
            const selectNumero = document.getElementById("cierreNumeroE2");
            if (selectSubmolecula) selectSubmolecula.value = submolecula;
            if (selectNumero) selectNumero.value = numero;
          }
        }
        
        // Generar código actualizado
        generarCodigo();
      }, 100);
      
      // Establecer notas
      const notas = document.getElementById("cierreNotas");
      if (notas) notas.value = cierre.notas || "";

      modal.dataset.editId = cierre.id || "";
      openModal();
    }

    /* ===============================
       Tool control
    =============================== */
    function start() {
      if (active) return;
      active = true;

      blockNextClick = false;
      selectedLngLat = null;

      App.map.getCanvas().style.cursor = "crosshair";
      
      // ✅ Asegurar que el listener se agregue correctamente (igual que eventos)
      App.map.off("click", handleMapClick); // Remover si existe para evitar duplicados
      App.map.on("click", handleMapClick);

      if (log) log("log", "📦 Montar Cierre ACTIVADO");
      if (log) log("log", "✅ Listener de click registrado, active:", active);
      
      // ✅ Test: verificar que el listener está registrado
      const listeners = App.map._listeners?.click || [];
      if (log) log("log", "🔍 Listeners de click registrados:", listeners.length);
    }

    function stop() {
      active = false;
      App.map.off("click", handleMapClick);
      App.map.getCanvas().style.cursor = "";
      closeModal();
      
      // ✅ Limpiar listener de Firebase si existe
      if (unsubscribeCierres && typeof unsubscribeCierres === "function") {
        unsubscribeCierres();
        unsubscribeCierres = null;
      }
    }

    function handleMapClick(e) {
      if (!active) return;

      if (blockNextClick) {
        blockNextClick = false;
        return;
      }

      // ✅ Si el click fue en un cierre existente, no crear nuevo (el popup se maneja en el listener de la capa)
      const BLOCK_LAYERS = [LAYER_ID].filter(id => App.map.getLayer(id));
      if (BLOCK_LAYERS.length) {
        const hits = App.map.queryRenderedFeatures(e.point, { layers: BLOCK_LAYERS });
        if (hits.length && !active) {
          // Si no está activo, el popup se abrirá desde el listener de la capa
          return;
        }
        // Si está activo, permitir crear cierre incluso si hay uno cerca
      }

      selectedLngLat = e.lngLat;
      modal.dataset.editId = ""; // creación nueva
      openModal();
    }

    /* ===============================
       Guardar cierre
    =============================== */
    btnSave?.addEventListener("click", async (e) => {
      e.stopPropagation();

      const user = window.FTTH_CORE?.auth?.currentUser;
      const createdBy = user?.email || user?.displayName || user?.uid || "";

      const editId = modal.dataset.editId;
      let lng = selectedLngLat?.lng;
      let lat = selectedLngLat?.lat;
      if (editId && (lng == null || lat == null)) {
        const existing = App.data?.cierres?.find(c => c.id === editId);
        if (existing?.geometry?.coordinates) {
          lng = existing.geometry.coordinates[0];
          lat = existing.geometry.coordinates[1];
        } else if (existing?.properties?.lng != null && existing?.properties?.lat != null) {
          lng = existing.properties.lng;
          lat = existing.properties.lat;
        }
      }

      const cierre = {
        codigo: document.getElementById("cierreCodigo").value.trim(),
        tipo: document.getElementById("cierreTipo").value,
        central: document.getElementById("cierreCentral").value.trim(),
        molecula: document.getElementById("cierreMolecula").value.trim(),
        notas: document.getElementById("cierreNotas").value.trim(),
        lng: lng,
        lat: lat,
        createdAt: new Date().toISOString(),
        createdBy
      };

      if (!cierre.codigo || !cierre.central || !cierre.molecula) {
        alert("⚠️ Complete todos los campos obligatorios");
        return;
      }

      if (cierre.lng == null || cierre.lat == null) {
        alert("⚠️ Faltan coordenadas. En creación, haga clic en el mapa; en edición, el cierre debe tener posición.");
        return;
      }

      const validators = window.__FTTH_VALIDATORS__;
      if (validators?.coordenadas) {
        const res = validators.coordenadas(Number(cierre.lng), Number(cierre.lat));
        if (!res.valid) {
          alert("⚠️ " + (res.error || "Coordenadas inválidas"));
          return;
        }
      }

      try {
        const FB = window.FTTH_FIREBASE;
        if (!FB?.guardarCierre) {
          alert("❌ Supabase no está listo. Recargue la página e inicie sesión de nuevo.");
          return;
        }
        if (editId) await FB.actualizarCierre(editId, cierre);
        else await FB.guardarCierre(cierre);

        closeModal();
      } catch (err) {
        if (window.ErrorHandler) {
          window.ErrorHandler.handle(err, "guardarCierre", { editId: editId || null });
          alert("❌ " + (window.ErrorHandler.getUserMessage(err) || "Error guardando cierre"));
        } else {
          console.error(err);
          alert("❌ Error guardando cierre");
        }
      }
    });

    btnDelete?.addEventListener("click", async () => {
      const id = modal.dataset.editId;
      if (!id) return;

      const codigo = window.prompt("Código para eliminar:");
      const esperado = (window.__FTTH_CONFIG__ && window.__FTTH_CONFIG__.DELETE_PIN) || "7431";
      if (codigo !== esperado) {
        alert("Código incorrecto");
        return;
      }
      if (!confirm("¿Eliminar este cierre?")) return;

      try {
        const FB = window.FTTH_FIREBASE;
        await FB?.eliminarCierre?.(id);
        removeCierreFromMap(id);
        closeModal();
      } catch (err) {
        console.error(err);
        alert("❌ Error eliminando cierre");
      }
    });

    /* ===============================
       Rebuild on style change
    =============================== */
    if (App.map) {
      App.map.on("style.load", () => {
        // ✅ Limpiar iconos cargados al cambiar estilo
        loadedIcons.clear();
        initLayer();
        refreshLayer();
      });
    }

    /* ===============================
       Exponer recarga global para cambios de estilo
    =============================== */
    if (!App.reloadCierres) {
      App.reloadCierres = function () {
        if (log) log("log", "🔄 Recargando capa CIERRES");
        initLayer();
        refreshLayer();
      };
    }

    runInitLayerWhenReady();

    /* ===============================
       Register tool
    =============================== */
    App.tools.cierres = { start, stop };

    if (log) log("log", "🚀 tool.cierres listo (estable)");
  }

  // ✅ Auto-inicializar
  // ✅ Inicializar cuando el DOM esté listo (igual que eventos)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
export {};