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
  const ICON_SIZE = 40;
  const NOTA_PIN_ICON_ID = "nota-pin";
  const log = window.__FTTH_LOG__;

  function createNotaPinIconSVG(color) {
    const size = ICON_SIZE;
    const c = color.replace("#", "");
    const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-nota-${c}">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path d="M ${size/2} ${size*0.15}
           Q ${size*0.2} ${size*0.15} ${size*0.2} ${size*0.4}
           L ${size*0.2} ${size*0.7}
           Q ${size*0.2} ${size*0.85} ${size*0.35} ${size*0.85}
           L ${size*0.5} ${size}
           L ${size*0.65} ${size*0.85}
           Q ${size*0.8} ${size*0.85} ${size*0.8} ${size*0.7}
           L ${size*0.8} ${size*0.4}
           Q ${size*0.8} ${size*0.15} ${size*0.5} ${size*0.15} Z"
        fill="${color}" stroke="#000" stroke-width="1.5"
        filter="url(#shadow-nota-${c})"/>
  <circle cx="${size/2}" cy="${size*0.4}" r="${size*0.25}"
          fill="#fff" stroke="${color}" stroke-width="2"/>
  <text x="${size/2}" y="${size*0.48}" font-size="${size*0.28}"
        text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif">📌</text>
</svg>`;
    return svg;
  }

  function loadNotaIcon(map) {
    return new Promise(function (resolve) {
      if (!map || map.hasImage(NOTA_PIN_ICON_ID)) {
        resolve();
        return;
      }
      const color = "#ff9800";
      const svg = createNotaPinIconSVG(color);
      const img = new Image();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      img.onload = function () {
        if (!map.hasImage(NOTA_PIN_ICON_ID)) map.addImage(NOTA_PIN_ICON_ID, img);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = function () {
        if (log) log("warn", "Error cargando icono nota");
        URL.revokeObjectURL(url);
        resolve();
      };
      img.src = url;
    });
  }

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
      loadNotaIcon(map).then(function () {
        if (map.getLayer(LAYER_ID)) return;
        addNotaLayers(map);
      });
    }

    function addNotaLayers(map) {
      const beforeId = map.getLayer("geojson-lines") ? undefined : undefined;
      try {
        map.addLayer(
          {
            id: LAYER_ID,
            type: "symbol",
            source: SOURCE_ID,
            layout: {
              "icon-image": NOTA_PIN_ICON_ID,
              "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 15, 1.0, 20, 1.4],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "icon-anchor": "bottom",
              "icon-pitch-alignment": "viewport"
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
              "text-field": ["coalesce", ["get", "texto"], "—"],
              "text-size": 14,
              "text-anchor": "bottom",
              "text-offset": [0, -1.2],
              "text-max-width": 12,
              "text-allow-overlap": true,
              "text-ignore-placement": false
            },
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "#1a1a2e",
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
        if (map.getLayer(LAYER_ID) && e.features?.length) {
          const f = e.features.find((fe) => fe.layer?.id === LAYER_ID);
          if (f) {
            e.originalEvent?.preventDefault?.();
            showNotaPopup(f, e.lngLat);
            return;
          }
        }
        if (!active) return;
        const mol = App._selectedMoleculaForPins;
        if (!mol) {
          if (App?.ui?.notify) App.ui.notify("Selecciona una molécula en Capas para añadir una nota.");
          else alert("Selecciona una molécula en Capas (🧱 Capas) para añadir una nota.");
          return;
        }
        const lngLat = e.lngLat || e;
        const lng = lngLat.lng != null ? lngLat.lng : lngLat[0];
        const lat = lngLat.lat != null ? lngLat.lat : lngLat[1];
        openModalAdd(lng, lat, mol);
      };
      map.on("click", clickHandler);
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
      const texto = window.prompt("Nota rápida (punto en " + molecula + "):", "");
      if (texto === null) return;
      const FB = window.FTTH_FIREBASE;
      FB.guardarNota({
        molecula,
        central: central || null,
        lng,
        lat,
        texto: (texto || "").trim()
      }).catch((err) => {
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
        '<div class="pin-popup-header"><div class="pin-popup-header-icon">📌</div><h3 class="pin-popup-title">Nota rápida</h3></div>' +
        '<div class="pin-popup-body">' +
        '<div class="pin-popup-row"><span class="pin-popup-label">Molécula</span><span class="pin-popup-value">' +
        escapeHtml(nota.molecula) +
        "</span></div>" +
        '<div class="pin-popup-row pin-popup-row-notes"><span class="pin-popup-label">Nota</span><div class="pin-popup-notes-scroll"><span class="pin-popup-value">' +
        escapeHtml(nota.texto || "—") +
        "</span></div></div>" +
        '</div><div class="pin-popup-actions">' +
        '<button type="button" data-pin-action="edit" class="pin-popup-btn pin-popup-btn-edit">✏️ Editar</button>' +
        '<button type="button" data-pin-action="delete" class="pin-popup-btn pin-popup-btn-delete">🗑️ Eliminar</button></div>';

      const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true }).setLngLat(lngLat).setDOMContent(content).addTo(App.map);

      content.querySelector('[data-pin-action="edit"]')?.addEventListener("click", () => {
        popup.remove();
        const nuevo = window.prompt("Editar nota:", nota.texto || "");
        if (nuevo !== null) {
          const errMsg = (e) => e?.message || e?.error_description || (e && typeof e === "object" ? String(e.message || e.code || "") : String(e));
          window.FTTH_FIREBASE.actualizarNota(nota.id, { texto: nuevo }).catch((e) => alert("Error al actualizar: " + (errMsg(e) || "revisa la consola")));
        }
      });
      content.querySelector('[data-pin-action="delete"]')?.addEventListener("click", () => {
        if (!confirm("¿Eliminar esta nota?")) return;
        const codigo = window.prompt("Código para eliminar:");
        const esperado = CONFIG.DELETE_PIN || "7431";
        if (codigo !== esperado) {
          alert("Código incorrecto");
          return;
        }
        popup.remove();
        const errMsg = (e) => e?.message || e?.error_description || (e && typeof e === "object" ? String(e.message || e.code || "") : String(e));
        window.FTTH_FIREBASE.eliminarNota(nota.id).catch((e) => alert("Error al eliminar: " + (errMsg(e) || "revisa la consola")));
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
