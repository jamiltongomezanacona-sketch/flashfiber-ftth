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

  // ✅ Sistema de inicialización mejorado
  async function init() {
    await waitForDependencies();
    initializeTool();
  }

  async function waitForDependencies(maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      const App = window.__FTTH_APP__;
      if (App?.map) {
        console.log("✅ tool.cierres: Dependencias disponibles después de", i + 1, "intentos");
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.warn("⚠️ tool.cierres: App.map no disponible después de esperar", maxAttempts, "intentos");
    console.warn("💡 Reintentando en 2 segundos...");
    
    // ✅ Retry después de 2 segundos (igual que eventos)
    setTimeout(async () => {
      const App = window.__FTTH_APP__;
      if (App?.map) {
        console.log("✅ tool.cierres: Dependencias disponibles en retry");
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
        // E2: Submolécula (A, B, C) + Número
        camposDinamicos.innerHTML = `
          <label>🔤 Submolécula</label>
          <select id="cierreSubmolecula">
            <option value="">Seleccione Submolécula</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
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
       Map Layer - Estilo Google Maps
    =============================== */
    const SOURCE_ID = "cierres-src";
    const LAYER_ID  = "cierres-layer";
    const ICON_SIZE = 40; // Tamaño base del icono

    /* ===============================
       Colores por tipo de cierre
    =============================== */
    function getColorByTipo(tipo) {
      // ✅ Todos los cierres en gris
      return "#9E9E9E"; // Gris para todos los tipos
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
            console.warn("⚠️ Error cargando icono SVG de cierre:", err);
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
        console.warn(`⚠️ Error cargando icono de cierre: ${iconId}`);
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
          data: { type: "FeatureCollection", features: [] }
        });
      } catch (err) {
        console.warn("⚠️ tool.cierres: addSource falló (¿estilo no cargado?), reintentando en load:", err.message);
        App.map.once("load", () => initLayer());
        return;
      }
      
      // ✅ Pre-cargar icono por defecto en gris (igual que eventos)
      loadCierreIconSync("E1", "");

      try {
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
        });
      } catch (err) {
        console.warn("⚠️ tool.cierres: addLayer falló, reintentando en load:", err.message);
        App.map.once("load", () => initLayer());
        return;
      }

      // Escapar HTML para evitar rupturas y XSS en el popup
      function escapeHtml(str) {
        if (str == null) return "";
        const s = String(str);
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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
        const fechaActualizado = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : null;
        const creadoPor = escapeHtml(String(p.createdBy || p.creadoPor || "—"));
        const nombrePin = escapeHtml(p.codigo || "Cierre");

        let tipoBadge = "";
        if (p.tipo === "E1") {
          tipoBadge = '<span style="background:#2196F3;padding:2px 6px;border-radius:4px;font-size:11px">E1 - Derivación</span>';
        } else if (p.tipo === "E2") {
          tipoBadge = '<span style="background:#FF9800;padding:2px 6px;border-radius:4px;font-size:11px">E2 - Splitter</span>';
        } else if (p.tipo === "NAP") {
          tipoBadge = '<span style="background:#4CAF50;padding:2px 6px;border-radius:4px;font-size:11px">NAP</span>';
        } else {
          tipoBadge = escapeHtml(p.tipo || "N/A");
        }

        const todasPropsHtml = Object.keys(p)
          .filter(k => !["iconId", "label", "geometry", "type"].includes(k))
          .map(key => {
            let value = p[key];
            if (value === null || value === undefined) value = "N/A";
            if (typeof value === "object") value = JSON.stringify(value);
            if (key === "lng" || key === "lat") value = Number(value).toFixed(6);
            return `<div style="margin:2px 0"><b>${escapeHtml(key.charAt(0).toUpperCase() + key.slice(1))}:</b> ${escapeHtml(String(value))}</div>`;
          }).join("") || "<div style='opacity:0.6'>No hay propiedades adicionales</div>";

        const html = `
  <div class="popup pin-popup" style="min-width:280px;max-width:380px;font-size:14px;line-height:1.5;color:#fff">
    <div style="background:linear-gradient(135deg,rgba(0,229,255,0.25),rgba(0,180,216,0.15));border-radius:10px;padding:14px;margin-bottom:12px;border:2px solid #00e5ff;box-shadow:0 2px 8px rgba(0,229,255,0.2)">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#00e5ff;margin-bottom:8px;font-weight:700">Propiedades del pin</div>
      <div style="font-size:18px;font-weight:bold;margin-bottom:10px;color:#fff">🔒 ${nombrePin}</div>
      <div style="font-size:14px;margin:6px 0;color:#e0e0e0"><span style="color:#00e5ff;font-weight:600">📅 Fecha de creación:</span> ${escapeHtml(fecha)}</div>
      <div style="font-size:14px;margin:6px 0;color:#e0e0e0"><span style="color:#00e5ff;font-weight:600">👤 Creado por:</span> ${creadoPor}</div>
      <div style="font-size:14px;margin:6px 0">
        <span style="color:#00e5ff;font-weight:600">📝 Notas:</span>
        <div style="margin:6px 0 0;padding:8px;background:rgba(0,0,0,0.3);border-radius:6px;font-size:13px;max-height:90px;overflow-y:auto;color:#fff;border:1px solid rgba(255,255,255,0.1)">
          ${p.notas ? escapeHtml(p.notas) : "<span style='color:rgba(255,255,255,0.6)'>Sin notas</span>"}
        </div>
      </div>
    </div>

    <div style="margin-bottom:10px;font-size:14px">
      <b style="color:#00e5ff">📦 Tipo:</b> ${tipoBadge}<br>
      <b style="color:#00e5ff">🏢 Central:</b> ${escapeHtml(p.central || "N/A")}<br>
      <b style="color:#00e5ff">🧬 Molécula:</b> ${escapeHtml(p.molecula || "N/A")}<br>
    </div>

    <div style="font-size:12px;color:rgba(255,255,255,0.8);border-top:1px solid rgba(255,255,255,0.15);padding-top:8px;margin-top:8px">
      ${fechaActualizado ? `<div>✏️ Actualizado: ${escapeHtml(fechaActualizado)}</div>` : ""}
      ${p.lat != null && p.lng != null ? `<div>📍 Coord: ${Number(p.lat).toFixed(6)}, ${Number(p.lng).toFixed(6)}</div>` : ""}
    </div>

    <div style="margin-top:10px;padding:10px;background:rgba(255,255,255,0.06);border-radius:6px;max-height:140px;overflow-y:auto;border:1px solid rgba(255,255,255,0.1)">
      <b style="font-size:12px;color:#00e5ff">📋 Todas las propiedades:</b>
      <div style="font-size:13px;margin-top:6px">${todasPropsHtml}</div>
    </div>

    <hr style="margin:10px 0;border-color:rgba(255,255,255,0.1)">
    <button id="btnEditCierrePopup" class="popup-btn" style="width:100%;background:linear-gradient(135deg, #2196f3, #1565c0)">
      ✏️ Editar
    </button>
  </div>
`;

        const popup = new mapboxgl.Popup({ closeButton: true })
          .setLngLat(lngLat)
          .setHTML(html)
          .addTo(App.map);

        setTimeout(() => {
          const btnEdit = document.getElementById("btnEditCierrePopup");
          btnEdit?.addEventListener("click", () => {
            popup.remove();
            abrirEdicionCierre(p);
          });
        }, 80);
      }

      // Click en la capa de cierres → popup
      if (!App || !App.map) return;
      App.map.on("click", LAYER_ID, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        if (active) blockNextClick = true;
        showCierrePopup(f, e.lngLat);
        popupShownThisClick = true;
      });

      // Fallback: click en cualquier parte del mapa (por si otra capa está encima)
      App.map.on("click", (e) => {
        popupShownThisClick = false;
        if (active) return;
        if (!App.map.getLayer(LAYER_ID)) return;
        setTimeout(() => {
          if (popupShownThisClick) return;
          const hits = App.map.queryRenderedFeatures(e.point, { layers: [LAYER_ID] });
          if (hits.length) showCierrePopup(hits[0], e.lngLat);
        }, 0);
      });

      // Cursor pointer al pasar sobre cierre
      if (App && App.map) {
        App.map.on("mouseenter", LAYER_ID, () => {
          if (App && App.map) App.map.getCanvas().style.cursor = "pointer";
        });
        App.map.on("mouseleave", LAYER_ID, () => {
          if (App && App.map) App.map.getCanvas().style.cursor = "";
        });
      }

      console.log("✅ Capa cierres creada (estilo Google Maps)");
    }

    function refreshLayer() {
      if (!App || !App.map) return;
      const source = App.map.getSource(SOURCE_ID);
      if (!source) {
        // Si el source no existe, inicializar la capa
        console.log("⚠️ Source no existe, inicializando capa...");
        initLayer();
        return;
      }

      console.log("🔄 Refrescando capa cierres con", App.data.cierres.length, "cierres");
      source.setData({
        type: "FeatureCollection",
        features: App.data.cierres
      });
      
      if (!App.map.getLayer(LAYER_ID)) {
        console.warn("⚠️ Capa cierres no existe, inicializando...");
        initLayer();
      }
    }

    function addCierreToMap(cierre) {
      if (!cierre?.lng || !cierre?.lat) {
        console.warn("⚠️ Cierre sin coordenadas:", cierre.codigo || cierre.id);
        return;
      }

      // Normalizar (por si viene string)
      const lng = Number(cierre.lng);
      const lat = Number(cierre.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        console.warn("⚠️ Coordenadas inválidas:", cierre.codigo || cierre.id, lng, lat);
        return;
      }

      // ✅ Asegurar que el icono esté cargado (EXACTAMENTE igual que eventos)
      const label = cierre.codigo || cierre.molecula || "";
      const tipo = cierre.tipo || "E1";
      const labelShort = label.substring(0, 2).toUpperCase() || "";
      const iconId = `cierre-${tipo}-${labelShort || 'default'}`;
      
      console.log("🎨 Cargando icono para cierre:", cierre.codigo, "iconId:", iconId);
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
        console.log("🔄 Cierre actualizado en mapa:", cierre.codigo);
      } else {
        App.data.cierres.push(feature);
        console.log("✅ Cierre agregado al mapa:", cierre.codigo, "Total cierres:", App.data.cierres.length);
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
        console.warn("⚠️ Firebase cierres no disponible");
        return;
      }

      console.log("✅ Firebase cierres conectado");
      unsubscribeCierres = FB.escucharCierres((cierre) => {
        console.log("🔔 Cierre recibido de Firebase:", cierre.codigo || cierre.id, cierre);
        if (cierre._deleted) {
          // Si el cierre fue eliminado, removerlo del mapa
          removeCierreFromMap(cierre.id);
        } else {
          // Agregar o actualizar cierre en el mapa
          console.log("📍 Agregando cierre al mapa:", cierre.codigo, "Coords:", cierre.lng, cierre.lat);
          addCierreToMap(cierre);
        }
      });
    }

    async function waitForFirebase(maxAttempts = 50) {
      for (let i = 0; i < maxAttempts; i++) {
        const FB = window.FTTH_FIREBASE;
        if (FB?.escucharCierres) {
          console.log("✅ Firebase cierres disponible después de", i + 1, "intentos");
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.warn("⚠️ Firebase cierres no disponible después de esperar", maxAttempts, "intentos");
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
        console.log("🔄 Reintentando conexión Firebase cierres...");
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
          // E2SI03-A1 -> extraer submolecula "A" y número "1"
          const match = codigo.match(/-([A-C])(\d+)$/);
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

      console.log("📦 Montar Cierre ACTIVADO");
      console.log("✅ Listener de click registrado, active:", active);
      
      // ✅ Test: verificar que el listener está registrado
      const listeners = App.map._listeners?.click || [];
      console.log("🔍 Listeners de click registrados:", listeners.length);
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

      const cierre = {
        codigo: document.getElementById("cierreCodigo").value.trim(),
        tipo: document.getElementById("cierreTipo").value,
        central: document.getElementById("cierreCentral").value.trim(),
        molecula: document.getElementById("cierreMolecula").value.trim(),
        notas: document.getElementById("cierreNotas").value.trim(),
        lng: selectedLngLat?.lng,
        lat: selectedLngLat?.lat,
        createdAt: new Date().toISOString()
      };

      if (!cierre.codigo || !cierre.central || !cierre.molecula) {
        alert("⚠️ Complete todos los campos obligatorios");
        return;
      }

      try {
        const FB = window.FTTH_FIREBASE;
        const editId = modal.dataset.editId;

        if (editId) await FB?.actualizarCierre?.(editId, cierre);
        else await FB?.guardarCierre?.(cierre);

        closeModal();
      } catch (err) {
        console.error(err);
        alert("❌ Error guardando cierre");
      }
    });

    btnDelete?.addEventListener("click", async () => {
      const id = modal.dataset.editId;
      if (!id) return;

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
        console.log("🔄 Recargando capa CIERRES");
        initLayer();
        refreshLayer();
      };
    }

    runInitLayerWhenReady();

    /* ===============================
       Register tool
    =============================== */
    App.tools.cierres = { start, stop };

    console.log("🚀 tool.cierres listo (estable)");
  }

  // ✅ Auto-inicializar
  // ✅ Inicializar cuando el DOM esté listo (igual que eventos)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();