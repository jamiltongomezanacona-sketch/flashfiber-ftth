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

    const selectCentral  = document.getElementById("cierreCentral");
    const selectMolecula = document.getElementById("cierreMolecula");

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

    selectCentral?.addEventListener("change", () => {
      const central = selectCentral.value;
      selectMolecula.innerHTML = `<option value="">Seleccione Molécula</option>`;

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
      switch (tipo) {
        case "E1": return "#2196F3"; // Azul - Derivación
        case "E2": return "#FF9800"; // Naranja - Splitter
        case "NAP": return "#4CAF50"; // Verde - NAP
        default: return "#9E9E9E"; // Gris - Sin tipo
      }
    }

    /* ===============================
       Generar icono SVG estilo Google Maps
    =============================== */
    function createPinIconSVG(color, label = "") {
      const size = ICON_SIZE;
      const pinHeight = size;
      const pinWidth = size * 0.6;
      const labelSize = label ? 12 : 0;
      
      // SVG del pin con sombra y etiqueta opcional
      const svg = `
        <svg width="${size}" height="${pinHeight + labelSize}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <!-- Sombra del pin -->
          <ellipse cx="${size / 2}" cy="${pinHeight - 2}" rx="${pinWidth * 0.4}" ry="4" 
                   fill="#000" opacity="0.2" filter="url(#shadow)"/>
          
          <!-- Cuerpo del pin (forma de gota) -->
          <path d="M ${size / 2} 0 
                   L ${size / 2 - pinWidth / 2} ${pinHeight * 0.6}
                   Q ${size / 2 - pinWidth / 2} ${pinHeight * 0.85} ${size / 2} ${pinHeight * 0.9}
                   Q ${size / 2 + pinWidth / 2} ${pinHeight * 0.85} ${size / 2 + pinWidth / 2} ${pinHeight * 0.6}
                   Z" 
                fill="${color}" 
                stroke="#FFFFFF" 
                stroke-width="2"
                filter="url(#shadow)"/>
          
          <!-- Etiqueta con texto (si se proporciona) -->
          ${label ? `
            <rect x="${size / 2 - pinWidth / 2}" y="${pinHeight}" 
                  width="${pinWidth}" height="${labelSize + 4}" 
                  rx="3" fill="#FFFFFF" stroke="${color}" stroke-width="1.5"
                  filter="url(#shadow)"/>
            <text x="${size / 2}" y="${pinHeight + labelSize + 1}" 
                  font-family="Arial, sans-serif" 
                  font-size="${labelSize}" 
                  font-weight="bold"
                  fill="${color}"
                  text-anchor="middle"
                  dominant-baseline="middle">${label}</text>
          ` : ''}
        </svg>
      `;
      
      return svg;
    }

    /* ===============================
       Convertir SVG a Image para Mapbox
       (Mapbox no soporta SVGs directamente)
       Dibuja directamente en canvas como en mapa.layers.js
    =============================== */
    function createPinIcon(color, label = "") {
      return new Promise((resolve, reject) => {
        try {
          const size = ICON_SIZE;
          const pinHeight = size;
          const pinWidth = size * 0.6;
          const labelSize = label ? 12 : 0;
          const totalHeight = pinHeight + labelSize;
          
          // Crear canvas
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = totalHeight;
          const ctx = canvas.getContext('2d');
          
          // Configurar calidad de renderizado
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Dibujar sombra del pin (ellipse)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.beginPath();
          ctx.ellipse(size / 2, pinHeight - 2, pinWidth * 0.4, 4, 0, 0, 2 * Math.PI);
          ctx.fill();
          
          // Dibujar cuerpo del pin (forma de gota estilo Google Maps)
          ctx.fillStyle = color;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.moveTo(size / 2, 0); // Punto superior
          ctx.lineTo(size / 2 - pinWidth / 2, pinHeight * 0.6); // Lado izquierdo
          ctx.quadraticCurveTo(
            size / 2 - pinWidth / 2, pinHeight * 0.85,
            size / 2, pinHeight * 0.9
          ); // Curva inferior izquierda
          ctx.quadraticCurveTo(
            size / 2 + pinWidth / 2, pinHeight * 0.85,
            size / 2 + pinWidth / 2, pinHeight * 0.6
          ); // Curva inferior derecha
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Dibujar etiqueta si existe
          if (label) {
            const labelY = pinHeight;
            const labelHeight = labelSize + 4;
            
            // Fondo de etiqueta (rectángulo redondeado)
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            // Usar roundRect si está disponible, sino usar arcos manuales
            if (ctx.roundRect) {
              ctx.roundRect(
                size / 2 - pinWidth / 2,
                labelY,
                pinWidth,
                labelHeight,
                3
              );
            } else {
              // Fallback para navegadores antiguos
              const x = size / 2 - pinWidth / 2;
              const y = labelY;
              const w = pinWidth;
              const h = labelHeight;
              const r = 3;
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + w - r, y);
              ctx.quadraticCurveTo(x + w, y, x + w, y + r);
              ctx.lineTo(x + w, y + h - r);
              ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
              ctx.lineTo(x + r, y + h);
              ctx.quadraticCurveTo(x, y + h, x, y + h - r);
              ctx.lineTo(x, y + r);
              ctx.quadraticCurveTo(x, y, x + r, y);
              ctx.closePath();
            }
            ctx.fill();
            ctx.stroke();
            
            // Texto de etiqueta
            ctx.fillStyle = color;
            ctx.font = `bold ${labelSize}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              label,
              size / 2,
              labelY + labelHeight / 2
            );
          }
          
          // Convertir canvas a imagen PNG
          const img = new Image();
          img.onload = () => {
            resolve(img);
          };
          img.onerror = (err) => {
            reject(new Error(`Error creando imagen desde canvas: ${err}`));
          };
          img.src = canvas.toDataURL('image/png');
          
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
    
    function loadIconForTipo(tipo, label = "") {
      const iconId = `cierre-${tipo}-${label || 'default'}`;
      
      // Si ya está cargado, retornar inmediatamente
      if (!App || !App.map) return iconId;
      if (loadedIcons.has(iconId) || App.map.hasImage(iconId)) {
        loadedIcons.add(iconId);
        return iconId;
      }
      
      if (!App.map.isStyleLoaded()) return iconId;
      
      // Si ya está en proceso de carga, retornar el ID
      if (loadingIcons.has(iconId)) return iconId;
      
      const color = getColorByTipo(tipo);
      
      // Marcar como en proceso
      loadingIcons.set(iconId, true);
      
      // ✅ Convertir SVG a Image y luego cargar en Mapbox
      createPinIcon(color, label)
        .then((image) => {
          try {
            if (!App || !App.map) {
              loadingIcons.delete(iconId);
              return;
            }
            
            if (!App.map.hasImage(iconId)) {
              App.map.addImage(iconId, image);
            }
            loadedIcons.add(iconId);
            loadingIcons.delete(iconId);
            
            // Refrescar capa después de cargar el icono
            refreshLayer();
          } catch (err) {
            console.warn("⚠️ Error agregando icono al mapa:", err);
            loadingIcons.delete(iconId);
          }
        })
        .catch((error) => {
          console.warn("⚠️ Error creando icono de cierre:", error);
          loadingIcons.delete(iconId);
        });
      
      return iconId;
    }

    function initLayer() {
      if (!App || !App.map || !App.map.isStyleLoaded()) return;
      if (App.map.getSource(SOURCE_ID)) return;

      App.map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });

      // ✅ Capa de símbolos estilo Google Maps (en lugar de círculos)
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
      if (!source) return;

      source.setData({
        type: "FeatureCollection",
        features: App.data.cierres
      });
    }

    function addCierreToMap(cierre) {
      if (!cierre?.lng || !cierre?.lat) return;

      const index = App.data.cierres.findIndex(c => c.id === cierre.id);

      // ✅ Generar etiqueta para el marcador (código o molécula)
      const label = cierre.codigo || cierre.molecula || "";
      const tipo = cierre.tipo || "E1";
      
      // ✅ Cargar icono personalizado
      const iconId = loadIconForTipo(tipo, label.substring(0, 4)); // Máximo 4 caracteres

      const feature = {
        id: cierre.id,
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [cierre.lng, cierre.lat]
        },
        properties: {
          ...cierre,
          iconId: iconId, // ✅ Agregar ID del icono a las propiedades
          label: label.substring(0, 4) // Etiqueta corta para el icono
        }
      };

      if (index >= 0) App.data.cierres[index] = feature;
      else App.data.cierres.push(feature);

      // ✅ Esperar a que el icono se cargue antes de refrescar
      if (!loadedIcons.has(iconId)) {
        setTimeout(() => refreshLayer(), 100);
      } else {
        refreshLayer();
      }
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
    }

    btnCancel?.addEventListener("click", closeModal);
    btnClose?.addEventListener("click", closeModal);

    function abrirEdicionCierre(cierre) {
      document.getElementById("cierreCodigo").value  = cierre.codigo || "";
      document.getElementById("cierreTipo").value    = cierre.tipo || "";
      document.getElementById("cierreCentral").value = cierre.central || "";
      document.getElementById("cierreNotas").value   = cierre.notas || "";

      selectCentral.dispatchEvent(new Event("change"));
      document.getElementById("cierreMolecula").value = cierre.molecula || "";

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