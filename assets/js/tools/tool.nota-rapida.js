/* =========================================================
   FlashFiber FTTH | tool.nota-rapida.js
   Pin de nota rápida con flecha apuntando al punto.
   Visible cuando hay molécula seleccionada en Capas. Guarda en Supabase (notas_rapidas).
========================================================= */

(function () {
  "use strict";

  const CONFIG = window.__FTTH_CONFIG__ || {};
  const LAYER_ID = CONFIG.LAYERS?.NOTAS || "notas-layer";
  const LAYER_LABEL_ID = "notas-layer-label";
  const SOURCE_ID = "notas-src";
  const log = window.__FTTH_LOG__;

  function getCentralFromMolecula(molecula) {
    if (!molecula || typeof molecula !== "string") return "";
    const prefix = molecula.replace(/\d+$/, "").toUpperCase();
    const CENTRAL_PREFIX = window.__FTTH_CENTRALES__?.CENTRAL_PREFIX || {};
    for (const [central, p] of Object.entries(CENTRAL_PREFIX)) {
      if (p === prefix) return central;
    }
    return "";
  }

  async function waitForDeps(maxAttempts) {
    for (let i = 0; i < (maxAttempts || 80); i++) {
      const App = window.__FTTH_APP__;
      const FB = window.FTTH_FIREBASE;
      if (App?.map && FB?.guardarNota && FB?.escucharNotas) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  async function init() {
    const ok = await waitForDeps();
    if (!ok) {
      console.warn("⚠️ tool.nota-rapida: dependencias no disponibles");
      return;
    }
    const App = window.__FTTH_APP__;
    const FB = window.FTTH_FIREBASE;

    let active = false;
    let notasList = [];
    let unsubNotas = null;
    let clickHandler = null;

    function notasToGeoJSON() {
      const features = notasList
        .filter((n) => !n._deleted)
        .map((n) => ({
          type: "Feature",
          id: n.id,
          properties: {
            id: n.id,
            molecula: n.molecula || "",
            central: n.central || "",
            texto: n.texto || "",
            createdAt: n.createdAt,
            createdBy: n.createdBy
          },
          geometry: { type: "Point", coordinates: [Number(n.lng), Number(n.lat)] }
        }));
      return { type: "FeatureCollection", features };
    }

    function ensureLayer() {
      const map = App.map;
      if (!map) return;
      if (map.getLayer(LAYER_ID)) return;

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: "geojson", data: notasToGeoJSON(), promoteId: "id" });
      }
      addNotaLayers(map);
    }

    function addNotaLayers(map) {
      if (map.getLayer(LAYER_ID)) return;
      const beforeId = map.getLayer("geojson-lines") ? undefined : undefined;
      try {
        map.addLayer(
          {
            id: LAYER_ID,
            type: "symbol",
            source: SOURCE_ID,
            layout: {
              "text-field": "▼",
              "text-size": 52,
              "text-anchor": "bottom",
              "text-allow-overlap": true,
              "text-ignore-placement": true
            },
            paint: {
              "text-color": "#9c27b0",
              "text-halo-color": "#ffffff",
              "text-halo-width": 4
            }
          },
          beforeId
        );
        map.addLayer(
          {
            id: LAYER_LABEL_ID,
            type: "symbol",
            source: SOURCE_ID,
            layout: {
              "text-field": ["coalesce", ["get", "texto"], "Comentario"],
              "text-size": 14,
              "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
              "text-anchor": "bottom",
              "text-offset": [0, -4.2],
              "text-max-width": 12,
              "text-allow-overlap": true,
              "text-ignore-placement": false
            },
            paint: {
              "text-color": "#1b5e20",
              "text-halo-color": "#ffffff",
              "text-halo-width": 2
            }
          },
          beforeId
        );
        map.setLayoutProperty(LAYER_ID, "visibility", "none");
        map.setLayoutProperty(LAYER_LABEL_ID, "visibility", "none");
      } catch (e) {
        if (log) log("warn", "notas layer add:", e.message);
        map.once("load", function () { addNotaLayers(map); });
      }
    }

    function syncNotasToMap() {
      const map = App.map;
      const src = map?.getSource(SOURCE_ID);
      if (src) src.setData(notasToGeoJSON());
      const mol = App._selectedMoleculaForPins;
      [LAYER_ID, LAYER_LABEL_ID].forEach((lid) => {
        if (map && map.getLayer(lid)) {
          try {
            map.setFilter(lid, mol ? ["==", ["get", "molecula"], mol] : null);
            map.setLayoutProperty(lid, "visibility", mol ? "visible" : "none");
          } catch (e) {}
        }
      });
    }

    function onNotaReceived(doc) {
      if (doc._deleted) {
        notasList = notasList.filter((n) => n.id !== doc.id);
      } else {
        const idx = notasList.findIndex((n) => n.id === doc.id);
        const row = { ...doc };
        if (idx >= 0) notasList[idx] = row;
        else notasList.push(row);
      }
      syncNotasToMap();
    }

    function setupClickHandler() {
      const map = App.map;
      if (!map || clickHandler) return;
      clickHandler = function (e) {
        if (App.tools?.medicion?.isActive?.()) return;
        // Clic en la flecha o en la etiqueta: mostrar popup Editar/Borrar
        if (map.getLayer(LAYER_ID) || map.getLayer(LAYER_LABEL_ID)) {
          const hits = map.queryRenderedFeatures(e.point, { layers: [LAYER_ID, LAYER_LABEL_ID] });
          if (hits && hits.length > 0) {
            e.originalEvent?.preventDefault?.();
            showNotaPopup(hits[0], e.lngLat);
            return;
          }
        }
        if (!active) return;
        const mol = App._selectedMoleculaForPins;
        if (!mol) {
          if (App?.ui?.notify) App.ui.notify("Selecciona una molécula en Capas para añadir un comentario.");
          else alert("Selecciona una molécula en Capas (🧱 Capas) para añadir un comentario.");
          return;
        }
        const lngLat = e.lngLat || e;
        const lng = lngLat.lng != null ? lngLat.lng : lngLat[0];
        const lat = lngLat.lat != null ? lngLat.lat : lngLat[1];
        openModalAdd(lng, lat, mol);
      };
      map.on("click", clickHandler);
      // Cursor pointer al pasar sobre flecha o etiqueta
      map.on("mouseenter", LAYER_ID, () => { if (!App.tools?.medicion?.isActive?.()) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", LAYER_LABEL_ID, () => { if (!App.tools?.medicion?.isActive?.()) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LAYER_LABEL_ID, () => { map.getCanvas().style.cursor = ""; });
    }

    function start() {
      active = true;
      ensureLayer();
      if (!unsubNotas) unsubNotas = FB.escucharNotas(onNotaReceived);
      setupClickHandler();
      syncNotasToMap();
    }

    function stop() {
      active = false;
      closeModalAdd();
      syncNotasToMap();
    }

    function openModalAdd(lng, lat, molecula) {
      const central = getCentralFromMolecula(molecula);
      const texto = window.prompt("Comentario (punto en " + molecula + "):", "");
      if (texto === null) return;
      const FB = window.FTTH_FIREBASE;
      FB.guardarNota({
        molecula,
        central: central || null,
        lng,
        lat,
        texto: (texto || "").trim()
      })
        .then((doc) => {
          if (doc) {
            notasList.push(doc);
            syncNotasToMap();
          }
        })
        .catch((err) => {
          const msg = err?.message || err?.error_description || (err && typeof err === "object" ? (err.message || err.code || JSON.stringify(err)) : String(err));
          console.error("Error guardando nota:", err);
          if (/does not exist|relation.*notas_rapidas|404|PGRST116/i.test(String(msg))) {
            alert("La tabla 'notas_rapidas' no existe en Supabase.\n\nCrea la tabla con el SQL de docs/NOTA_RAPIDA_PIN.md (Supabase → SQL Editor) y activa Realtime para esa tabla.");
          } else {
            alert("No se pudo guardar la nota: " + msg);
          }
        });
    }

    function closeModalAdd() {
      const el = document.getElementById("notaRapidaModal");
      if (el) el.classList.add("hidden");
    }

    function escapeHtml(str) {
      if (str == null) return "";
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function showNotaPopup(f, lngLat) {
      const id = f.properties?.id || f.id;
      const nota = notasList.find((n) => String(n.id) === String(id));
      if (!nota) return;

      const content = document.createElement("div");
      content.className = "popup pin-popup pin-popup-card";
      content.innerHTML =
        '<div class="pin-popup-header"><div class="pin-popup-header-icon">💬</div><h3 class="pin-popup-title">Comentario</h3></div>' +
        '<div class="pin-popup-body">' +
        '<div class="pin-popup-row"><span class="pin-popup-label">Molécula</span><span class="pin-popup-value">' +
        escapeHtml(nota.molecula) +
        "</span></div>" +
        '<div class="pin-popup-row pin-popup-row-notes"><span class="pin-popup-label">Comentario</span><div class="pin-popup-notes-scroll"><span class="pin-popup-value">' +
        escapeHtml(nota.texto || "—") +
        "</span></div></div>" +
        '</div><div class="pin-popup-actions pin-popup-actions-nota">' +
        '<button type="button" data-pin-action="edit" class="pin-popup-btn pin-popup-btn-edit" aria-label="Editar comentario">✏️ Editar</button>' +
        '<button type="button" data-pin-action="delete" class="pin-popup-btn pin-popup-btn-delete" aria-label="Borrar comentario">🗑️ Borrar</button></div>';

      const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true }).setLngLat(lngLat).setDOMContent(content).addTo(App.map);

      content.querySelector('[data-pin-action="edit"]')?.addEventListener("click", () => {
        popup.remove();
        const nuevo = window.prompt("Editar comentario:", nota.texto || "");
        if (nuevo !== null) {
          const id = nota.id;
          const errMsg = (e) => e?.message || e?.error_description || (e && typeof e === "object" ? String(e.message || e.code || "") : String(e));
          // Actualizar al instante en mapa (optimista)
          const idx = notasList.findIndex((n) => String(n.id) === String(id));
          if (idx >= 0) {
            notasList[idx] = { ...notasList[idx], texto: nuevo };
            syncNotasToMap();
          }
          window.FTTH_FIREBASE.actualizarNota(id, { texto: nuevo }).catch((e) => alert("Error al actualizar: " + (errMsg(e) || "revisa la consola")));
        }
      });
      content.querySelector('[data-pin-action="delete"]')?.addEventListener("click", () => {
        if (!confirm("¿Borrar este comentario? Esta acción no se puede deshacer.")) return;
        const id = nota.id;
        popup.remove();
        // Desaparecer al instante (optimista)
        notasList = notasList.filter((n) => String(n.id) !== String(id));
        syncNotasToMap();
        const errMsg = (e) => e?.message || e?.error_description || (e && typeof e === "object" ? String(e.message || e.code || "") : String(e));
        window.FTTH_FIREBASE.eliminarNota(id).catch((e) => {
          alert("Error al borrar: " + (errMsg(e) || "revisa la consola"));
        });
      });
    }

    if (!App.tools) App.tools = {};
    App.tools.notaRapida = { start, stop, isActive: () => active };

    ensureLayer();
    if (!unsubNotas) unsubNotas = FB.escucharNotas(onNotaReceived);
    setupClickHandler();
    syncNotasToMap();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
