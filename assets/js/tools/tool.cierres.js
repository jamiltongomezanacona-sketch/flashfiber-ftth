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

  const wait = setInterval(() => {
    const App = window.__FTTH_APP__;
    if (!App?.map) return;

    clearInterval(wait);

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
       Map Layer
    =============================== */
    const SOURCE_ID = "cierres-src";
    const LAYER_ID  = "cierres-layer";

    function initLayer() {
      if (!App.map || !App.map.isStyleLoaded()) return;
      if (App.map.getSource(SOURCE_ID)) return;

      App.map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });

      App.map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": 8,
          "circle-color": "#ff9800",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#000"
        }
      });

      // Click sobre cierre → editar
      App.map.on("click", LAYER_ID, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        abrirEdicionCierre(f.properties || {});
      });

      console.log("✅ Capa cierres creada");
    }

    function refreshLayer() {
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

      const feature = {
        id: cierre.id,
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [cierre.lng, cierre.lat]
        },
        properties: cierre
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

    async function waitForFirebase(maxAttempts = 20) {
      for (let i = 0; i < maxAttempts; i++) {
        const FB = window.FTTH_FIREBASE;
        if (FB?.escucharCierres) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.warn("⚠️ Firebase no disponible después de esperar");
      return false;
    }

    // Inicializar listener
    initFirebaseSync();

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
    App.map.on("style.load", () => {
      initLayer();
      refreshLayer();
    });

    initLayer();

    /* ===============================
       Register tool
    =============================== */
    App.tools.cierres = { start, stop };

    console.log("🚀 tool.cierres listo (estable)");
  }, 300);
})();