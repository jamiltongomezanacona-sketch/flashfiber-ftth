/* =========================================================
   FlashFiber FTTH | tool.medicion.js
   Medición Simple PRO
   - SNAP automático
   - Deshacer último punto
   - Reserva R = +20%
========================================================= */

(function () {
  "use strict";

  const wait = setInterval(() => {
    const App = window.__FTTH_APP__;
    if (!App?.map) return;
    clearInterval(wait);

    if (!App.tools) App.tools = {};

    let active = false;
    let points = [];
    let lineSourceId = "medicion-line-src";
    let lineLayerId  = "medicion-line-layer";

    const SNAP_DISTANCE_METERS = 12;
    const RESERVE_FACTOR = 1.20;

    /* ===============================
       UI PANEL
    =============================== */
    const panel = document.createElement("div");
    panel.id = "medicionPanel";
    panel.innerHTML = `
      <div class="m-value" id="mReal">0 m</div>
      <div class="m-value r" id="mReserve">R 0 m</div>
      <div class="m-actions">
        <button id="btnUndo">↩️</button>
        <button id="btnClear">🗑️</button>
      </div>
    `;
    document.body.appendChild(panel);
    panel.style.display = "none";   // 👈 OCULTO POR DEFECTO

    injectCSS();

    const elReal    = panel.querySelector("#mReal");
    const elReserve = panel.querySelector("#mReserve");
    const btnUndo   = panel.querySelector("#btnUndo");
    const btnClear  = panel.querySelector("#btnClear");

    btnUndo.onclick  = undoLast;
    btnClear.onclick = clearAll;

    /* ===============================
       ACTIVAR TOOL
    =============================== */
    App.tools.medicion = {
      start() {
        if (active) return;
        active = true;
        points = [];
        ensureLayer();

        panel.style.display = "block";   // ✅ MOSTRAR PANEL

        App.map.getCanvas().style.cursor = "crosshair";
        App.map.on("click", onMapClick);
        update();
      },

      stop() {
        active = false;

        panel.style.display = "none";    // ✅ OCULTAR PANEL

        App.map.off("click", onMapClick);
        App.map.getCanvas().style.cursor = "";
      }
    };

    console.log("✅ Medición Simple PRO cargada");
    App.map.on("style.load", () => {
  restoreAfterStyleChange();
});

    /* ===============================
       MAP CLICK
    =============================== */
    function onMapClick(e) {
      if (!active) return;
      const snapped = snapPoint(e.lngLat);
      points.push([snapped.lng, snapped.lat]);
      update();
    }

    /* ===============================
       SNAP
    =============================== */
    function snapPoint(lngLat) {
      const features = App.map.queryRenderedFeatures({
        layers: App.CONFIG?.SNAP_LAYERS || []
      });

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
  
  const meters = calculateDistance();
  const reserve = meters * RESERVE_FACTOR;
  
  const kmReal = meters / 1000;
  const kmReserve = reserve / 1000;
  
  elReal.textContent = `${kmReal.toFixed(2)} km`;
  elReserve.textContent = `R ${kmReserve.toFixed(2)} km`;
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
       DRAW LINE
    =============================== */
    function ensureLayer() {
      if (App.map.getSource(lineSourceId)) return;

      App.map.addSource(lineSourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [] }
        }
      });

      App.map.addLayer({
        id: lineLayerId,
        type: "line",
        source: lineSourceId,
        paint: {
          "line-width": 3,
          "line-color": "#003366"
        }
      });
    }

    function drawLine() {
      const src = App.map.getSource(lineSourceId);
      if (!src) return;

      src.setData({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: points
        }
      });
    }
    /* ===============================
   RESTORE AFTER STYLE CHANGE
=============================== */
function restoreAfterStyleChange() {
  if (!App.map.isStyleLoaded()) return;
  ensureLayer();
  drawLine();
}

    /* ===============================
       ACTIONS
    =============================== */
    function undoLast() {
      if (!points.length) return;
      points.pop();
      update();
    }

    function clearAll() {
      points = [];
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
          color: #fff;
          padding: 10px 14px;
          border-radius: 12px;
          font-family: system-ui;
          box-shadow: 0 8px 20px rgba(0,0,0,.35);
          z-index: 9999;
          min-width: 110px;
          text-align: center;
        }

        #medicionPanel .m-value {
          font-size: 18px;
          font-weight: 600;
          line-height: 1.2;
        }

        #medicionPanel .m-value.r {
          color: #00e5ff;
          margin-bottom: 6px;
        }

        #medicionPanel .m-actions {
          display: flex;
          justify-content: space-between;
          gap: 6px;
        }

        #medicionPanel button {
          flex: 1;
          border: none;
          border-radius: 8px;
          background: #1f2a3a;
          color: #fff;
          padding: 6px;
          font-size: 16px;
          cursor: pointer;
        }

        #medicionPanel button:active {
          transform: scale(.95);
        }
      `;
      const style = document.createElement("style");
      style.innerHTML = css;
      document.head.appendChild(style);
    }

  }, 300);

})();