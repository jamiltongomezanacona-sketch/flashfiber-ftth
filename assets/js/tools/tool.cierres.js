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
    console.warn("⚠️ tool.cierres: App.map no disponible después de esperar");
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
       Prefijos por central
    =============================== */
    const CENTRAL_PREFIX = {
      BACHUE: "BA",
      CHICO: "CH",
      CUNI: "CU",
      FONTIBON: "FO",
      GUAYMARAL: "GU",
      HOLANDA: "HO",
      MUZU: "MU",
      SANTA_INES: "SI",
      SUBA: "SU",
      TOBERIN: "TO"
    };

    function generarMoleculas(prefijo) {
      return Array.from({ length: 30 }, (_, i) =>
        `${prefijo}${String(i + 1).padStart(2, "0")}`
      );
    }

    /* ===============================
       Generar código automáticamente
    =============================== */
    function generarCodigo() {
      const tipo = selectTipo?.value || "";
      const central = selectCentral?.value || "";
      const molecula = selectMolecula?.value || "";
      
      if (!tipo || !central || !molecula) {
        inputCodigo.value = "";
        return;
      }

      if (tipo === "E1") {
        // E1: E1SI01-1, E1SI01-2, ... E1SI01-10
        const sufijo = document.getElementById("cierreSufijoE1")?.value || "";
        if (sufijo) {
          inputCodigo.value = `${tipo}${molecula}-${sufijo}`;
        } else {
          inputCodigo.value = "";
        }
      } else if (tipo === "E2") {
        // E2: E2SI03-A1, E2SI03-B2, etc.
        const submolecula = document.getElementById("cierreSubmolecula")?.value || "";
        const numero = document.getElementById("cierreNumeroE2")?.value || "";
        if (submolecula && numero) {
          inputCodigo.value = `${tipo}${molecula}-${submolecula}${numero}`;
        } else {
          inputCodigo.value = "";
        }
      } else if (tipo === "NAP") {
        // NAP: mantener formato manual por ahora
        inputCodigo.value = "";
      }
    }

    /* ===============================
       Actualizar campos dinámicos según tipo
    =============================== */
    function actualizarCamposDinamicos() {
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
      const central = selectCentral.value;
      selectMolecula.innerHTML = `<option value="">Seleccione Molécula</option>`;
      inputCodigo.value = "";

      const prefijo = CENTRAL_PREFIX[central];
      if (!prefijo) {
        selectMolecula.disabled = true;
        return;
      }

      generarMoleculas(prefijo).forEach(mol => {
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

    function initLayer() {
      if (App.map.getSource(SOURCE_ID)) return;

      App.map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      
      // ✅ Pre-cargar icono por defecto en gris (igual que eventos)
      loadCierreIconSync("E1", "");

      // ✅ Capa de símbolos (EXACTAMENTE igual que eventos)
      App.map.addLayer({
        id: LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          "icon-image": [
            "coalesce",
            ["get", "iconId"],
            "cierre-E1-default"
          ],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10, 0.6,  // Zoom 10: 60% del tamaño
            15, 1.0,  // Zoom 15: 100% del tamaño
            20, 1.4   // Zoom 20: 140% del tamaño
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-anchor": "bottom",
          "icon-pitch-alignment": "viewport"
        }
      });

      // Click sobre cierre → editar
      if (!App || !App.map) return;
      App.map.on("click", LAYER_ID, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        abrirEdicionCierre(f.properties || {});
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
        initLayer();
        return;
      }

      source.setData({
        type: "FeatureCollection",
        features: App.data.cierres
      });
      
      // ✅ Asegurar que la capa esté visible
      if (App.map.getLayer(LAYER_ID)) {
        App.map.setLayoutProperty(LAYER_ID, "visibility", "visible");
      }
    }

    function addCierreToMap(cierre) {
      if (!cierre?.lng || !cierre?.lat) return;

      // Normalizar (por si viene string)
      const lng = Number(cierre.lng);
      const lat = Number(cierre.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      // ✅ Asegurar que el icono esté cargado (EXACTAMENTE igual que eventos)
      const label = cierre.codigo || cierre.molecula || "";
      const tipo = cierre.tipo || "E1";
      const labelShort = label.substring(0, 2).toUpperCase() || "";
      loadCierreIconSync(tipo, labelShort);

      const index = App.data.cierres.findIndex(c => c.id === cierre.id);

      const feature = {
        id: cierre.id,
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          ...cierre,
          iconId: `cierre-${tipo}-${labelShort || 'default'}` // ✅ Agregar iconId a propiedades
        }
      };

      if (index >= 0) App.data.cierres[index] = feature;
      else App.data.cierres.push(feature);

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
        if (cierre._deleted) {
          // Si el cierre fue eliminado, removerlo del mapa
          removeCierreFromMap(cierre.id);
        } else {
          // Agregar o actualizar cierre en el mapa
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
      App.map.on("click", handleMapClick);

      console.log("📦 Montar Cierre ACTIVADO");
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

      const BLOCK_LAYERS = [LAYER_ID].filter(id => App.map.getLayer(id));
      if (BLOCK_LAYERS.length) {
        const hits = App.map.queryRenderedFeatures(e.point, { layers: BLOCK_LAYERS });
        if (hits.length) return;
      }

      if (blockNextClick) {
        blockNextClick = false;
        return;
      }

      selectedLngLat = e.lngLat;
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

        // Volver a crear source + layer si fueron destruidos
        initLayer();

        // Volver a pintar datos en el mapa
        refreshLayer();
      };
    }

    initLayer();

    /* ===============================
       Register tool
    =============================== */
    App.tools.cierres = { start, stop };

    console.log("🚀 tool.cierres listo (estable)");
  }

  // ✅ Auto-inicializar
  init();
})();