/* =========================================================
   FlashFiber FTTH | tool.eventos.js
   EVENTOS OPERATIVOS - Crear / Editar / Eliminar (Firebase Sync)
   - Pensado para vandalismo/corte + empalme provisional
   - Igual o mejor que tool.cierres.js
========================================================= */

(function () {
  "use strict";

  // ✅ Sistema de inicialización mejorado (sin setInterval)
  async function init() {
    // Esperar a que App y Firebase estén disponibles
    await waitForDependencies();
    
    // Inicializar tool
    initializeTool();
  }

  async function waitForDependencies(maxAttempts = 80) {
    for (let i = 0; i < maxAttempts; i++) {
      const App = window.__FTTH_APP__;
      const FB = window.FTTH_FIREBASE;

      if (App?.map && FB?.guardarEvento && FB?.escucharEventos) {
        console.log("✅ tool.eventos: Dependencias disponibles después de", i + 1, "intentos");
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.warn("⚠️ tool.eventos: Dependencias no disponibles después de esperar", maxAttempts, "intentos");
    console.warn("💡 Reintentando en 2 segundos...");
    
    // ✅ Retry después de 2 segundos
    setTimeout(async () => {
      const App = window.__FTTH_APP__;
      const FB = window.FTTH_FIREBASE;
      if (App?.map && FB?.guardarEvento && FB?.escucharEventos) {
        console.log("✅ tool.eventos: Dependencias disponibles en retry");
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

    if (!App?.map || !FB?.guardarEvento || !FB?.escucharEventos) {
      console.error("❌ tool.eventos: Dependencias no disponibles");
      return;
    }

    if (!App.tools) App.tools = {};
    if (!App.data) App.data = {};
    if (!App.data.eventos) App.data.eventos = [];

    let active = false;
    let selectedLngLat = null;
    let blockNextClick = false;

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

    // 🏢 Central / 🧬 Molécula
    const elCentralEvento  = document.getElementById("eventoCentral");
    const elMoleculaEvento = document.getElementById("eventoMolecula");

    // 📸 Input de fotos
    const fotoInput     = document.getElementById("fotoInput");
    const fotoPreview   = document.getElementById("fotoPreview");

    // Buffer temporal de fotos
    let fotos = [];

    if (!modal || !btnSave || !btnClose || !elTipo || !elAccion || !elEstado) {
      console.error("❌ Modal de eventos no encontrado. Revisa el HTML (eventoModal y campos).");
      return;
    }

    /* ===============================
       Fotos: preview y captura
    =============================== */
    function renderPreview(container, files) {
      if (!container) return;
      container.innerHTML = "";

      (files || []).forEach(file => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.title = file.name;
        img.style.width = "72px";
        img.style.height = "72px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        img.style.border = "1px solid #2c3e50";
        img.style.cursor = "pointer";
        container.appendChild(img);
      });
    }

    fotoInput?.addEventListener("change", (e) => {
      fotos = Array.from(e.target.files || []);
      renderPreview(fotoPreview, fotos);
    });

    /* ===============================
       Map Layer
    =============================== */
    const SOURCE_ID = "eventos-src";
    const LAYER_ID  = "eventos-layer";
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
        console.warn(`⚠️ Error cargando icono de evento: ${iconId}`);
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
          data: { type: "FeatureCollection", features: [] }
        });
      } catch (err) {
        console.warn("⚠️ tool.eventos: addSource falló (¿estilo no cargado?), reintentando en load:", err.message);
        App.map.once("load", () => initLayer());
        return;
      }

      loadEventoIconSync("CRITICO");
      loadEventoIconSync("PROVISIONAL");
      loadEventoIconSync("RESUELTO");
      loadEventoIconSync("");

      try {
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
        console.warn("⚠️ tool.eventos: addLayer falló, reintentando en load:", err.message);
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

        const notas = p.notas ? escapeHtml(String(p.notas).slice(0, 120)) + (String(p.notas).length > 120 ? "…" : "") : "—";
        const html = `
  <div class="popup pin-popup pin-popup-card">
    <div class="pin-popup-header">
      <div class="pin-popup-header-icon evento">🚨</div>
      <h3 class="pin-popup-title">${nombrePin}</h3>
    </div>
    <div class="pin-popup-body">
      <div class="pin-popup-row"><span class="pin-popup-label">Fecha de creación</span><span class="pin-popup-value">${escapeHtml(fecha)}</span></div>
      <div class="pin-popup-row"><span class="pin-popup-label">Creado por</span><span class="pin-popup-value">${creadoPor}</span></div>
      <div class="pin-popup-row"><span class="pin-popup-label">Notas</span><span class="pin-popup-value">${notas}</span></div>
    </div>
    <div class="pin-popup-actions">
      <button type="button" data-pin-action="edit" class="pin-popup-btn pin-popup-btn-edit">✏️ Editar</button>
      <button type="button" data-pin-action="delete" class="pin-popup-btn pin-popup-btn-delete">🗑️ Eliminar</button>
    </div>
  </div>
`;

        const popup = new mapboxgl.Popup({ closeButton: true })
          .setLngLat(lngLat)
          .setHTML(html)
          .addTo(App.map);

        setTimeout(function () {
          const popupEl = popup.getElement?.();
          const container = popupEl || document.querySelector(".mapboxgl-popup-content");
          if (!container) return;
          const btnEdit = container.querySelector('[data-pin-action="edit"]');
          const btnDelete = container.querySelector('[data-pin-action="delete"]');
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
              if (!confirm("¿Estás seguro de eliminar este evento?")) return;
              try {
                const FB = window.FTTH_FIREBASE;
                if (FB?.eliminarEvento && p.id) {
                  await FB.eliminarEvento(p.id);
                  popup.remove();
                  console.log("✅ Evento eliminado:", p.id);
                } else {
                  alert("❌ No se pudo eliminar el evento");
                }
              } catch (err) {
                console.error("❌ Error eliminando evento:", err);
                alert("❌ Error al eliminar el evento");
              }
            });
          }
        }, 0);
      }

      // Click en la capa de eventos → popup
      App.map.on("click", LAYER_ID, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        if (active) blockNextClick = true;
        showEventoPopup(f, e.lngLat);
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
          if (hits.length) showEventoPopup(hits[0], e.lngLat);
        }, 0);
      });

      // Cursor
      App.map.on("mouseenter", LAYER_ID, () => {
        App.map.getCanvas().style.cursor = "pointer";
      });
      App.map.on("mouseleave", LAYER_ID, () => {
        App.map.getCanvas().style.cursor = "";
      });

      console.log("✅ Capa eventos creada");
    }

    /* ===============================
       Render eventos
    =============================== */
    function refreshLayer() {
      const source = App.map.getSource(SOURCE_ID);
      if (!source) {
        // Si el source no existe, inicializar la capa
        initLayer();
        return;
      }

      source.setData({
        type: "FeatureCollection",
        features: App.data.eventos
      });
    }

    function addEventoToMap(evt) {
      if (!evt?.lng || !evt?.lat) return;

      // Normalizar (por si viene string)
      const lng = Number(evt.lng);
      const lat = Number(evt.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

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
      console.log("🔄 Recargando capa EVENTOS");

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
      if (!FB?.escucharEventos) {
        console.warn("⚠️ FB.escucharEventos no disponible aún");
        return false;
      }
      
      if (unsubscribeEventos) {
        unsubscribeEventos();
        unsubscribeEventos = null;
      }
      
      unsubscribeEventos = FB.escucharEventos((evt) => {
        if (evt._deleted) {
          // Si el evento fue eliminado, removerlo del mapa
          removeEventoFromMap(evt.id);
        } else {
          // Agregar o actualizar evento en el mapa
          addEventoToMap(evt);
        }
      });
      console.log("✅ Listener de eventos Firebase activo");
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
    function openModal() {
      modal?.classList.remove("hidden");
      // si es creación, ocultar delete
      const editId = modal.dataset.editId;
      if (btnDelete) btnDelete.style.display = editId ? "inline-block" : "none";
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

      // ✅ limpiar central/molécula
      if (elCentralEvento) elCentralEvento.value = "";
      if (elMoleculaEvento) {
        elMoleculaEvento.innerHTML = `<option value="">Seleccione Molécula</option>`;
        elMoleculaEvento.disabled = true;
      }

      // ✅ limpiar fotos temporales
      fotos = [];
      if (fotoInput) fotoInput.value = "";
      if (fotoPreview) fotoPreview.innerHTML = "";
    }

    btnClose?.addEventListener("click", closeModal);

    function abrirEdicionEvento(evt) {
      // llenar campos
      elTipo.value = evt.tipo || "";
      elAccion.value = evt.accion || "";
      elEstado.value = evt.estado || "PROVISIONAL";
      elTecnico.value = evt.tecnico || "";
      elNotas.value = evt.notas || "";

      // ✅ central/molécula al editar
      if (elCentralEvento) elCentralEvento.value = evt.central || "";
      if (elCentralEvento) elCentralEvento.dispatchEvent(new Event("change"));
      if (elMoleculaEvento) elMoleculaEvento.value = evt.molecula || "";

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

    elCentralEvento?.addEventListener("change", () => {
      if (!elMoleculaEvento) return;
      const central = elCentralEvento.value;
      elMoleculaEvento.innerHTML = `<option value="">Seleccione Molécula</option>`;

      const prefijo = CENTRAL_PREFIX[central];
      if (!prefijo) {
        elMoleculaEvento.disabled = true;
        return;
      }

      const moleculas = generarMoleculas(prefijo);

      moleculas.forEach(mol => {
        const opt = document.createElement("option");
        opt.value = mol;
        opt.textContent = mol;
        elMoleculaEvento.appendChild(opt);
      });

      elMoleculaEvento.disabled = false;
    });

    /* ===============================
       Tool control
    =============================== */
    function start() {
      if (active) return;
      active = true;

      App.map.getCanvas().style.cursor = "crosshair";
      App.map.on("click", handleMapClick);

      console.log("🚨 Montar Evento ACTIVADO");
    }

    function stop() {
      active = false;
      App.map.off("click", handleMapClick);
      App.map.getCanvas().style.cursor = "";
      closeModal();
      
      // ✅ Limpiar listener de Firebase si existe
      if (unsubscribeEventos && typeof unsubscribeEventos === "function") {
        unsubscribeEventos();
        unsubscribeEventos = null;
      }
      
      console.log("🛑 Montar Evento DESACTIVADO");
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

      // ✅ reset central/molécula en creación
      if (elCentralEvento) elCentralEvento.value = "";
      if (elMoleculaEvento) {
        elMoleculaEvento.innerHTML = `<option value="">Seleccione Molécula</option>`;
        elMoleculaEvento.disabled = true;
      }

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

  const msg = validar(evento);
  if (msg) return alert(msg);
  
  try {
    const editId = modal.dataset.editId;
    let eventoId = editId;
    
    /* =========================
       1️⃣ Guardar evento base
    ========================= */
    if (editId) {
      const update = { ...evento };
      delete update.createdAt;
      update.updatedAt = new Date().toISOString();
      await FB.actualizarEvento(editId, update);
      eventoId = editId;
    } else {
      eventoId = await FB.guardarEvento(evento); // ⚠️ debe devolver ID
    }
    
    if (!eventoId) {
      throw new Error("No se pudo obtener eventoId");
    }
    
    /* =========================
       2️⃣ Subir fotos a Storage (con manejo de errores mejorado)
    ========================= */
    const fotosURLs = [];
    
    // ✅ Subir todas las fotos con Promise.allSettled para manejar errores individuales
    if (fotos.length > 0) {
      const uploadResults = await Promise.allSettled(
        fotos.map(file => 
          window.FTTH_STORAGE.subirFotoEvento(eventoId, "fotos", file)
        )
      );
      
      uploadResults.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          fotosURLs.push(result.value);
        } else {
          const errorMsg = result.reason?.message || "Error desconocido";
          console.warn(`⚠️ Error subiendo foto #${index + 1}:`, errorMsg);
        }
      });
    }
    
    // ✅ Mostrar resumen si hubo errores
    const totalFotos = fotos.length;
    const fotosExitosas = fotosURLs.length;
    const fotosFallidas = totalFotos - fotosExitosas;
    
    if (fotosFallidas > 0 && totalFotos > 0) {
      console.warn(`⚠️ ${fotosFallidas} de ${totalFotos} fotos no se pudieron subir. El evento se guardó correctamente.`);
    }
    
    /* =========================
       3️⃣ Guardar URLs en Firestore
    ========================= */
    if (fotosURLs.length > 0) {
      await FB.actualizarEvento(eventoId, {
        fotos: fotosURLs
      });
    }
    
    // ✅ Agregar/actualizar evento en el mapa inmediatamente después de guardarlo
    const eventoCompleto = {
      id: eventoId,
      ...evento,
      fotos: fotosURLs.length > 0 ? fotosURLs : (editId ? undefined : [])
    };
    addEventoToMap(eventoCompleto);
    
    console.log("✅ Evento agregado al mapa:", eventoId);
    
    closeModal();
  } catch (err) {
    console.error("❌ Error guardando evento con fotos:", err);
    alert("❌ Error guardando evento o subiendo fotos");
  }
});
    /* ===============================
       Eliminar evento
    =============================== */
    btnDelete?.addEventListener("click", async () => {
      const id = modal.dataset.editId;
      if (!id) return;

      if (!confirm("¿Eliminar este evento?")) return;

      try {
        // si tienes eliminarEvento en firebase, úsalo
        if (FB.eliminarEvento) {
          await FB.eliminarEvento(id);
        } else {
          // fallback: si no existe, avisa
          console.warn("⚠️ eliminarEvento no existe en firebase.db.js");
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

    console.log("🚀 tool.eventos listo (PRO)");
  }

  // ✅ Inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();