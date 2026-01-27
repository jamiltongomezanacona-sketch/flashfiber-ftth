/* =========================================================
   FlashFiber FTTH | tool.eventos.js
   EVENTOS OPERATIVOS - Crear / Editar / Eliminar (Firebase Sync)
========================================================= */

(function () {
  "use strict";

  const wait = setInterval(() => {
    const App = window.__FTTH_APP__;
    const FB  = window.FTTH_FIREBASE;

    if (!App?.map || !FB?.guardarEvento || !FB?.escucharEventos) return;

    clearInterval(wait);

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
    const elImpacto = document.getElementById("eventoImpacto");
    const elTecnico = document.getElementById("eventoTecnico");
    const elNotas   = document.getElementById("eventoNotas");

    const elCentralEvento  = document.getElementById("eventoCentral");
    const elMoleculaEvento = document.getElementById("eventoMolecula");

    const fotoAntesInput     = document.getElementById("fotoAntesInput");
    const fotoDespuesInput   = document.getElementById("fotoDespuesInput");
    const fotoAntesPreview   = document.getElementById("fotoAntesPreview");
    const fotoDespuesPreview = document.getElementById("fotoDespuesPreview");

    let fotosAntes = [];
    let fotosDespues = [];

    if (!modal || !btnSave || !btnClose) {
      console.error("❌ Modal de eventos no encontrado.");
      return;
    }

    /* ===============================
       Fotos preview
    =============================== */
    function renderPreview(container, files) {
      if (!container) return;
      container.innerHTML = "";
      (files || []).forEach(file => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.width = "72px";
        img.style.height = "72px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        container.appendChild(img);
      });
    }

    fotoAntesInput?.addEventListener("change", e => {
      fotosAntes = Array.from(e.target.files || []);
      renderPreview(fotoAntesPreview, fotosAntes);
    });

    fotoDespuesInput?.addEventListener("change", e => {
      fotosDespues = Array.from(e.target.files || []);
      renderPreview(fotoDespuesPreview, fotosDespues);
    });

    /* ===============================
       Map Layer
    =============================== */
    const SOURCE_ID = "eventos-src";
    const LAYER_ID  = "eventos-layer";

    function initLayer() {
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
          "circle-radius": 9,
          "circle-color": [
            "match",
            ["get", "estado"],
            "CRITICO", "#e53935",
            "PROVISIONAL", "#fbc02d",
            "RESUELTO", "#43a047",
            "#9e9e9e"
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#000"
        }
      });

      console.log("✅ Capa eventos creada");
    }

    function refreshLayer() {
      const source = App.map.getSource(SOURCE_ID);
      if (!source) return;

      source.setData({
        type: "FeatureCollection",
        features: App.data.eventos
      });
    }

    function addEventoToMap(evt) {
      if (!evt?.lng || !evt?.lat) return;

      const lng = Number(evt.lng);
      const lat = Number(evt.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

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

    /* ===============================
       Firebase Sync
    =============================== */

    App.reloadEventos = function () {
      initLayer();
      refreshLayer();
    };

    App.reloadEventos();

    FB.escucharEventos(evt => addEventoToMap(evt));

    /* ===============================
       Modal helpers
    =============================== */
    function openModal() {
      modal.classList.remove("hidden");
    }

    function closeModal() {
      modal.classList.add("hidden");
      modal.dataset.editId = "";
      selectedLngLat = null;
      blockNextClick = true;
    }

    btnClose?.addEventListener("click", closeModal);

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
      console.log("🛑 Montar Evento DESACTIVADO");
    }

    function handleMapClick(e) {
      if (!active) return;
      if (blockNextClick) {
        blockNextClick = false;
        return;
      }
      selectedLngLat = e.lngLat;
      modal.dataset.editId = "";
      openModal();
    }

    /* ===============================
       Guardar evento
    =============================== */
    btnSave?.addEventListener("click", async e => {
      e.stopPropagation();

      const evento = {
        tipo: (elTipo.value || "").trim(),
        accion: (elAccion.value || "").trim(),
        estado: (elEstado.value || "").trim(),
        impacto: (elImpacto.value || "").trim(),
        tecnico: (elTecnico.value || "").trim(),
        notas: (elNotas.value || "").trim(),
        central: (elCentralEvento?.value || "").trim(),
        molecula: (elMoleculaEvento?.value || "").trim(),
        lng: selectedLngLat?.lng,
        lat: selectedLngLat?.lat,
        createdAt: new Date().toISOString()
      };

      try {
        const eventoId = await FB.guardarEvento(evento);
        if (!eventoId) throw new Error("No se pudo obtener eventoId");

        const storage = window.FTTH_STORAGE;
        if (storage?.subirFotoEvento) {
          for (const file of fotosAntes) {
            await storage.subirFotoEvento(eventoId, "antes", file);
          }
          for (const file of fotosDespues) {
            await storage.subirFotoEvento(eventoId, "despues", file);
          }
        }

        closeModal();
      } catch (err) {
        console.error("❌ Error guardando evento:", err);
        alert("❌ Error guardando evento");
      }
    });

    /* ===============================
       Registrar tool
    =============================== */
    App.tools.eventos = { start, stop };

    console.log("🚀 tool.eventos listo y operativo");
  }, 300);
})();
