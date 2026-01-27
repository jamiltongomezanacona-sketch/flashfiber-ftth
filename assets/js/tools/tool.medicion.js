/* =========================================================
   FlashFiber FTTH | tool.medicion.js
   Medición avanzada con 100% y +20%
========================================================= */

(() => {
    "use strict";
    
    const App = window.__FTTH_APP__;
if (!App) {
  console.error("❌ App no disponible en tool.medicion.js");
  return;
}
    
    let active = false;
    let points = [];
    let undoBound = false;
    
    const SOURCE_LINE = "medicion-line-src";
    const LAYER_LINE = "medicion-line-layer";
    const SOURCE_LABEL = "medicion-label-src";
    const LAYER_LABEL = "medicion-label-layer";
    
    /* ======================================================
       Activar herramienta
    ====================================================== */
    function start() {
        stop(); // limpiar estado previo
        active = true;
        points = [];
        
        bindUndoButton(); // ✅ Enlace seguro del botón
        
        App.map.getCanvas().style.cursor = "crosshair";
        App.map.on("click", onClick);
        App.map.on("mousemove", onMove);
        
        console.log("📏 Medición ACTIVADA");
    }
    
    /* ======================================================
       Desactivar herramienta
    ====================================================== */
    function stop() {
        active = false;
        points = [];
        
        App.map.getCanvas().style.cursor = "";
        App.map.off("click", onClick);
        App.map.off("mousemove", onMove);
        
        removeLayers();
    }
    
    /* ======================================================
       Click en mapa
    ====================================================== */
    function onClick(e) {
        if (!active) return;
        points.push([e.lngLat.lng, e.lngLat.lat]);
        draw(points);
    }
    
    /* ======================================================
       Movimiento mouse (preview)
    ====================================================== */
    function onMove(e) {
        if (!active || points.length === 0) return;
        const temp = [...points, [e.lngLat.lng, e.lngLat.lat]];
        draw(temp);
    }
    
    /* ======================================================
       Dibujo principal
    ====================================================== */
    function draw(coords) {
        if (coords.length < 2) return;
        
        const geojsonLine = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: coords
            }
        };
        
        const distanceMeters = calculateDistance(coords);
        const reserveMeters = distanceMeters * 1.2;
        const last = coords[coords.length - 1];
        
        const geojsonLabel = {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: last
            },
            properties: {
                label: formatLabel(distanceMeters, reserveMeters)
            }
        };
        
        drawLineLayer(geojsonLine);
        drawLabelLayer(geojsonLabel);
    }
    
    /* ======================================================
       Cálculo de distancia (Haversine)
    ====================================================== */
    function calculateDistance(coords) {
        let total = 0;
        for (let i = 1; i < coords.length; i++) {
            total += haversine(coords[i - 1], coords[i]);
        }
        return total;
    }
    
    function haversine(a, b) {
        const R = 6371000;
        const toRad = d => d * Math.PI / 180;
        
        const dLat = toRad(b[1] - a[1]);
        const dLon = toRad(b[0] - a[0]);
        
        const lat1 = toRad(a[1]);
        const lat2 = toRad(b[1]);
        
        const h =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) ** 2;
        
        return 2 * R * Math.asin(Math.sqrt(h));
    }
    
    /* ======================================================
       Formato visual
    ====================================================== */
    function formatLabel(real, reserve) {
        const format = v => {
            if (v >= 1000) return (v / 1000).toFixed(2) + " km";
            return v.toFixed(1) + " m";
        };
        return `${format(real)}\n+20% ${format(reserve)}`;
    }
    
    /* ======================================================
       Capas visuales
    ====================================================== */
    function drawLineLayer(data) {
        if (App.map.getSource(SOURCE_LINE)) {
            App.map.getSource(SOURCE_LINE).setData(data);
            return;
        }
        
        App.map.addSource(SOURCE_LINE, { type: "geojson", data });
        
        App.map.addLayer({
            id: LAYER_LINE + "-glow",
            type: "line",
            source: SOURCE_LINE,
            paint: {
                "line-color": "#22d3ee",
                "line-width": 8,
                "line-opacity": 0.3
            }
        });
        
        App.map.addLayer({
            id: LAYER_LINE,
            type: "line",
            source: SOURCE_LINE,
            paint: {
                "line-color": "#67e8f9",
                "line-width": 3,
                "line-dasharray": [2, 2]
            }
        });
    }
    
    function drawLabelLayer(data) {
        if (App.map.getSource(SOURCE_LABEL)) {
            App.map.getSource(SOURCE_LABEL).setData(data);
            return;
        }
        
        App.map.addSource(SOURCE_LABEL, { type: "geojson", data });
        
        App.map.addLayer({
            id: LAYER_LABEL,
            type: "symbol",
            source: SOURCE_LABEL,
            layout: {
                "text-field": ["get", "label"],
                "text-size": 14,
                "text-line-height": 1.3,
                "text-offset": [0.8, -1.2],
                "text-anchor": "left",
                "text-allow-overlap": true
            },
            paint: {
                "text-color": "#6366f1",
                "text-halo-color": "#ffffff",
                "text-halo-width": 2
            }
        });
    }
    
    /* ======================================================
       Limpieza
    ====================================================== */
    function removeLayers() {
        [LAYER_LINE, LAYER_LINE + "-glow", LAYER_LABEL].forEach(id => {
            if (App.map.getLayer(id)) App.map.removeLayer(id);
        });
        
        [SOURCE_LINE, SOURCE_LABEL].forEach(id => {
            if (App.map.getSource(id)) App.map.removeSource(id);
        });
    }
    
    /* ======================================================
       Deshacer último punto
    ====================================================== */
    function undoLastPoint() {
        if (!active || points.length === 0) return;
        
        points.pop();
        console.log("↩️ Punto eliminado. Restantes:", points.length);
        
        if (points.length < 2) {
            removeLayers();
            return;
        }
        
        draw(points);
    }
    
    /* ======================================================
       Botón visual: Deshacer
    ====================================================== */
    function bindUndoButton() {
        if (undoBound) return;
        
        const btn = document.getElementById("undoMeasureBtn");
        if (!btn) {
            console.warn("⚠️ Botón #undoMeasureBtn no encontrado");
            return;
        }
        
        btn.addEventListener("click", () => {
            if (!active) return;
            undoLastPoint();
        });
        
        undoBound = true;
    }
    
    /* ======================================================
       Teclas rápidas
    ====================================================== */
    document.addEventListener("keydown", e => {
        
        if (e.key === "Escape" && active) {
            console.log("⎋ Medición cancelada");
            stop();
            document.querySelectorAll(".tool-btn")
                .forEach(b => b.classList.remove("active"));
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && active) {
            e.preventDefault();
            undoLastPoint();
        }
    });
    
  /* ======================================================
   Registro en App
====================================================== */
App.tools.medicion = {
    start,
    stop
};

console.log("✅ Herramienta MEDICIÓN registrada");
    
})();