/* =========================================================
   FlashFiber FTTH | tool.medicion.js
   Medición Simple PRO
   - SNAP automático
   - Deshacer último punto
   - Reserva R = +20%
   - Mejoras: unidades m/km, ignorar clic tras arrastre, accesibilidad, Escape, panel moderno
========================================================= */

(function () {
  "use strict";

  function whenMapReady(fn) {
    if (window.__FTTH_APP__?.map) {
      fn();
      return;
    }
    document.addEventListener("ftth-map-ready", fn, { once: true });
  }

  whenMapReady(() => {
    const App = window.__FTTH_APP__;
    const CONFIG = window.__FTTH_CONFIG__ || App?.CONFIG || {};
    if (!App.tools) App.tools = {};

    let active = false;
    let points = [];
    let isPanning = false;
    let finishedMode = false; // modo solo lectura: línea visible, no se añaden más puntos
    let lineSourceId = "medicion-line-src";
    let lineLayerId  = "medicion-line-layer";
    let pointsSourceId = "medicion-points-src";
    let pointsLayerId = "medicion-points-layer";
    let labelsSourceId = "medicion-labels-src";
    let labelsLayerId  = "medicion-labels-layer";

    const SNAP_DISTANCE_METERS = 12;
    const DEFAULT_RESERVE_PERCENT = 20;
    let reservePercent = DEFAULT_RESERVE_PERCENT; // 15, 20, 25 → factor 1.15, 1.20, 1.25

    /* ===============================
       UI PANEL
    =============================== */
    const panel = document.createElement("div");
    panel.id = "medicionPanel";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Panel de medición de distancia");
    panel.innerHTML = `
      <div class="m-value" id="mReal" aria-live="polite">0 m</div>
      <div class="m-value r" id="mReserve" aria-live="polite">R 0 m</div>
      <div class="m-points" id="mPoints" aria-live="polite">0 puntos</div>
      <div class="m-reserve-select-wrap">
        <label class="m-reserve-label" for="mReservePercent">Reserva</label>
        <select id="mReservePercent" title="Porcentaje de reserva" aria-label="Porcentaje de reserva">
          <option value="15">15%</option>
          <option value="20" selected>20%</option>
          <option value="25">25%</option>
        </select>
      </div>
      <div class="m-actions">
        <button id="btnCopy" type="button" title="Copiar medición" aria-label="Copiar medición al portapapeles">📋</button>
        <button id="btnUndo" type="button" title="Deshacer último punto" aria-label="Deshacer último punto">↩️</button>
        <button id="btnDone" type="button" title="Finalizar medición (mantener visible)" aria-label="Finalizar medición">✓</button>
        <button id="btnClear" type="button" title="Limpiar medición" aria-label="Limpiar medición">🗑️</button>
      </div>
    `;
    document.body.appendChild(panel);
    panel.style.display = "none";

    injectCSS();

    const elReal    = panel.querySelector("#mReal");
    const elReserve = panel.querySelector("#mReserve");
    const elPoints  = panel.querySelector("#mPoints");
    const elReserveSelect = panel.querySelector("#mReservePercent");
    const btnCopy  = panel.querySelector("#btnCopy");
    const btnUndo  = panel.querySelector("#btnUndo");
    const btnDone  = panel.querySelector("#btnDone");
    const btnClear = panel.querySelector("#btnClear");

    btnCopy.onclick  = copyToClipboard;
    btnUndo.onclick  = undoLast;
    btnDone.onclick  = toggleDone;
    btnClear.onclick = clearOrNewMeasurement;
    if (elReserveSelect) elReserveSelect.addEventListener("change", () => {
      reservePercent = Math.max(15, Math.min(25, Number(elReserveSelect.value) || 20));
      update();
    });

    /* ===============================
       ACTIVAR TOOL
    =============================== */
    App.tools.medicion = {
      start() {
        if (active) return;
        active = true;
        isPanning = false;
        finishedMode = false;
        points = [];
        reservePercent = Number(panel.querySelector("#mReservePercent")?.value) || DEFAULT_RESERVE_PERCENT;
        ensureLayer();

        panel.style.display = "block";

        App.map.getCanvas().style.cursor = "crosshair";
        App.map.on("click", onMapClick);
        App.map.on("movestart", () => { isPanning = true; });
        App.map.on("moveend", () => { isPanning = false; });
        document.addEventListener("keydown", onKeyDown);
        update();
      },

      stop() {
        active = false;
        document.removeEventListener("keydown", onKeyDown);
        App.map.off("click", onMapClick);
        App.map.off("movestart");
        App.map.off("moveend");
        App.map.getCanvas().style.cursor = "";

        panel.style.display = "none";
      },

      isActive() {
        return active;
      }
    };

    console.log("✅ Medición Simple PRO cargada");
    App.map.on("style.load", () => {
      restoreAfterStyleChange();
    });

    function onKeyDown(e) {
      if (!active) return;
      if (e.key === "Escape") {
        if (points.length > 0 || finishedMode) clearOrNewMeasurement();
        e.preventDefault();
      }
    }

    /* ===============================
       MAP CLICK
    =============================== */
    function onMapClick(e) {
      if (!active || isPanning || finishedMode) return;
      const snapped = snapPoint(e.lngLat);
      points.push([snapped.lng, snapped.lat]);
      update();
    }

    /* ===============================
       SNAP
    =============================== */
    function snapPoint(lngLat) {
      const snapLayers = CONFIG.SNAP_LAYERS || [];
      const features = App.map.queryRenderedFeatures({ layers: snapLayers });

      let best = null;
      let minDist = SNAP_DISTANCE_METERS;

      features.forEach(f => {
        if (!f.geometry) return;
        const coords = extractCoords(f.geometry);
        coords.forEach(c => {
          const d = distanceMeters(lngLat.lng, lngLat.lat, c[0], c[1]);
          if (d < minDist) {
            minDist = d;
            best = c;
          }
        });
      });

      if (best) return { lng: best[0], lat: best[1] };
      return lngLat;
    }

    function extractCoords(geom) {
      if (geom.type === "Point") return [geom.coordinates];
      if (geom.type === "LineString") return geom.coordinates;
      if (geom.type === "MultiLineString") return geom.coordinates.flat();
      return [];
    }

    /* ===============================
       UPDATE
    =============================== */
    function update() {
      drawLine();
      drawPoints();
      drawSegmentLabels();

      const meters = calculateDistance();
      const factor = 1 + reservePercent / 100;
      const reserve = meters * factor;

      if (meters < 1000) {
        elReal.textContent = `${Math.round(meters)} m`;
        elReserve.textContent = `R ${Math.round(reserve)} m`;
      } else {
        const kmReal = meters / 1000;
        const kmReserve = reserve / 1000;
        elReal.textContent = `${kmReal.toFixed(2)} km`;
        elReserve.textContent = `R ${kmReserve.toFixed(2)} km`;
      }

      const n = points.length;
      elPoints.textContent = n === 0 ? "0 puntos" : n === 1 ? "1 punto" : `${n} puntos`;

      if (btnDone) btnDone.style.display = n >= 2 && !finishedMode ? "" : "none";
      if (btnUndo) btnUndo.style.display = !finishedMode ? "" : "none";
      if (btnClear) {
        btnClear.textContent = finishedMode ? "Nueva medición" : "🗑️";
        btnClear.title = finishedMode ? "Nueva medición" : "Limpiar medición";
        btnClear.setAttribute("aria-label", finishedMode ? "Nueva medición" : "Limpiar medición");
      }
    }

    function calculateDistance() {
      let total = 0;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        total += distanceMeters(a[0], a[1], b[0], b[1]);
      }
      return total;
    }

    /* ===============================
       DRAW LINE + POINTS + LABELS
    =============================== */
    function ensureLayer() {
      if (App.map.getSource(lineSourceId)) return;

      App.map.addSource(lineSourceId, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] } }
      });

      App.map.addLayer({
        id: lineLayerId,
        type: "line",
        source: lineSourceId,
        paint: {
          "line-width": 5,
          "line-color": "#eb7f33"
        }
      });

      App.map.addSource(pointsSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      App.map.addLayer({
        id: pointsLayerId,
        type: "circle",
        source: pointsSourceId,
        paint: {
          "circle-radius": 6,
          "circle-color": "#fff",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#eb7f33"
        }
      });

      App.map.addSource(labelsSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      App.map.addLayer({
        id: labelsLayerId,
        type: "symbol",
        source: labelsSourceId,
        layout: {
          "text-field": ["get", "text"],
          "text-size": 12,
          "text-anchor": "center",
          "text-offset": [0, 0]
        },
        paint: {
          "text-color": "#fff",
          "text-halo-color": "#333",
          "text-halo-width": 2
        }
      });
    }

    function drawLine() {
      const src = App.map.getSource(lineSourceId);
      if (!src) return;
      src.setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: points }
      });
    }

    function drawPoints() {
      const src = App.map.getSource(pointsSourceId);
      if (!src) return;
      const features = points.map((c, i) => ({
        type: "Feature",
        id: i,
        geometry: { type: "Point", coordinates: c },
        properties: {}
      }));
      src.setData({ type: "FeatureCollection", features });
    }

    function drawSegmentLabels() {
      const src = App.map.getSource(labelsSourceId);
      if (!src || points.length < 2) {
        if (src) src.setData({ type: "FeatureCollection", features: [] });
        return;
      }
      const features = [];
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const m = (a[0] + b[0]) / 2;
        const n = (a[1] + b[1]) / 2;
        const segMeters = Math.round(distanceMeters(a[0], a[1], b[0], b[1]));
        const text = segMeters >= 1000 ? (segMeters / 1000).toFixed(1) + " km" : segMeters + " m";
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [m, n] },
          properties: { text }
        });
      }
      src.setData({ type: "FeatureCollection", features });
    }
    /* ===============================
   RESTORE AFTER STYLE CHANGE
=============================== */
function restoreAfterStyleChange() {
  if (!App.map.isStyleLoaded()) return;
  ensureLayer();
  drawLine();
  drawPoints();
  drawSegmentLabels();
}

    /* ===============================
       ACTIONS
    =============================== */
    function copyToClipboard() {
      const meters = calculateDistance();
      const factor = 1 + reservePercent / 100;
      const reserve = meters * factor;
      let realStr = meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(2)} km`;
      let resStr = reserve < 1000 ? `${Math.round(reserve)} m` : `${(reserve / 1000).toFixed(2)} km`;
      const text = `${realStr} (R ${resStr})`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (btnCopy) { btnCopy.textContent = "✓"; btnCopy.title = "Copiado"; setTimeout(() => { btnCopy.textContent = "📋"; btnCopy.title = "Copiar medición"; }, 1500); }
        }).catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    }

    function fallbackCopy(text) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        if (btnCopy) { btnCopy.textContent = "✓"; btnCopy.title = "Copiado"; setTimeout(() => { btnCopy.textContent = "📋"; btnCopy.title = "Copiar medición"; }, 1500); }
      } catch (e) {
        if (window.__FTTH_APP__?.ui?.notify) window.__FTTH_APP__.ui.notify("📋 " + text);
        else alert(text);
      }
    }

    function toggleDone() {
      if (points.length < 2) return;
      finishedMode = true;
      App.map.getCanvas().style.cursor = "";
      update();
    }

    function clearOrNewMeasurement() {
      if (finishedMode) finishedMode = false;
      points = [];
      App.map.getCanvas().style.cursor = "crosshair";
      update();
    }

    function undoLast() {
      if (!points.length || finishedMode) return;
      points.pop();
      update();
    }

    function clearAll() {
      points = [];
      finishedMode = false;
      update();
    }

    /* ===============================
       UTILS
    =============================== */
    function distanceMeters(lng1, lat1, lng2, lat2) {
      const R = 6371000;
      const toRad = d => d * Math.PI / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function injectCSS() {
      const css = `
        #medicionPanel {
          position: fixed;
          bottom: 90px;
          right: 15px;
          background: rgba(15,20,30,.92);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #fff;
          padding: 12px 16px;
          border-radius: 12px;
          font-family: system-ui, -apple-system, sans-serif;
          box-shadow: 0 8px 24px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.06);
          z-index: 9999;
          min-width: 120px;
          text-align: center;
          transition: opacity .2s ease, transform .2s ease;
        }

        #medicionPanel .m-value {
          font-size: 18px;
          font-weight: 600;
          line-height: 1.2;
        }

        #medicionPanel .m-value.r {
          color: #00e5ff;
          margin-bottom: 4px;
        }

        #medicionPanel .m-points {
          font-size: 11px;
          color: rgba(255,255,255,.6);
          margin-bottom: 8px;
        }

        #medicionPanel .m-reserve-select-wrap {
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: center;
        }

        #medicionPanel .m-reserve-label {
          font-size: 11px;
          color: rgba(255,255,255,.7);
        }

        #medicionPanel #mReservePercent {
          background: rgba(31,42,58,.9);
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 6px;
          color: #fff;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
        }

        #medicionPanel .m-actions {
          display: flex;
          justify-content: space-between;
          gap: 6px;
          flex-wrap: wrap;
        }

        #medicionPanel .m-actions button {
          min-width: 36px;
        }

        #medicionPanel button {
          flex: 1;
          border: none;
          border-radius: 8px;
          background: rgba(31,42,58,.9);
          color: #fff;
          padding: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: background .15s ease, transform .1s ease;
        }

        #medicionPanel button:hover {
          background: rgba(45,60,80,.95);
        }

        #medicionPanel button:active {
          transform: scale(.96);
        }
      `;
      const style = document.createElement("style");
      style.innerHTML = css;
      document.head.appendChild(style);
    }

  });

})();
export {};