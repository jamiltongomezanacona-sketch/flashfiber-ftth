/* =========================================================
   FlashFiber FTTH | mapa.layers.js
   Carga dinámica de capas GeoJSON FTTH (desde árbol children)
   + AutoZoom inteligente
========================================================= */

(() => {
  "use strict";

  const App = window.__FTTH_APP__;
  if (!App) {
    console.error("❌ App no disponible en mapa.layers.js");
    return;
  }

  const ROOT_INDEX = "../geojson/index.json";
  let restoring = false;

  App.__ftthLayerIds = App.__ftthLayerIds || [];

  /* ===============================
     🎯 AUTO ZOOM GEOJSON
  =============================== */
  function autoZoomToGeoJSON(geojson) {
    const map = App.map;
    if (!map || !geojson?.features?.length) return;

    const coords = [];

    geojson.features.forEach(f => {
      if (f.geometry.type === "LineString") {
        coords.push(...f.geometry.coordinates);
      }
      if (f.geometry.type === "MultiLineString") {
        f.geometry.coordinates.forEach(line => {
          coords.push(...line);
        });
      }
    });

    if (!coords.length) return;

    const bounds = coords.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    );

    // 🛡️ Delay para evitar conflictos de render
    setTimeout(() => {
      map.fitBounds(bounds, {
        padding: 80,
        duration: 900
      });
      console.log("🎯 AutoZoom aplicado");
    }, 300);
  }

  /* ===============================
     Cargar árbol raíz
  =============================== */
  async function loadFTTHTree() {
    try {
      console.log("📂 Cargando árbol FTTH...");
      const res = await fetch(ROOT_INDEX, { cache: "no-store" });
      const root = await res.json();

      await walkNode(root, "../geojson/");

      console.log("🌳 Árbol FTTH procesado");
    } catch (err) {
      console.error("❌ Error cargando árbol FTTH", err);
    }
  }

  /* ===============================
     Recorrer nodos recursivamente
  =============================== */
  async function walkNode(node, basePath) {
    if (!node) return;

    // 🟢 Si ESTE nodo es una capa
    if (node.type === "layer") {
      await createLayer(node, basePath);
      return;
    }

    // 🟢 Si tiene hijos → recorrerlos
    if (node.children?.length) {
      for (const child of node.children) {

        // 👉 CASO 1: hijo es capa directa
        if (child.type === "layer") {
          await createLayer(child, basePath);
          continue;
        }

        // 👉 CASO 2: hijo es carpeta con index.json
        if (child.index) {
          try {
            const url = basePath + child.index;
            const res = await fetch(url, { cache: "no-store" });
            const json = await res.json();

            const nextBase =
              basePath + child.index.replace("index.json", "");

            await walkNode(json, nextBase);

          } catch (err) {
            console.warn("⚠️ No se pudo cargar:", child.index);
          }
        }
      }
    }
  }

  /* ===============================
     Crear capa Mapbox
  =============================== */
  async function createLayer(layer, basePath) {
    const map = App.map;
    if (!map || !map.isStyleLoaded()) return;

    const id  = layer.id;
    const url = basePath + layer.path;

    if (map.getSource(id)) return;

    try {
      const res = await fetch(url, { cache: "no-store" });
      const geojson = await res.json();

      map.addSource(id, {
        type: "geojson",
        data: geojson
      });

      map.addLayer({
        id,
        type: layer.typeLayer || "line",
        source: id,
        layout: {
          visibility: "visible"
        },
        paint: layer.paint || {
          "line-color": "#00ff90",
          "line-width": 4
        }
      });

      App.__ftthLayerIds.push(id);

      console.log("✅ Capa FTTH cargada:", id);

      // 🎯 Auto zoom automático al cargar
      autoZoomToGeoJSON(geojson);

    } catch (err) {
      console.error("❌ Error creando capa:", id, err);
    }
  }

  /* ===============================
     Restaurar al cambiar estilo
  =============================== */
  function restoreLayers() {
    if (restoring) return;
    restoring = true;

    console.log("🔄 Restaurando capas FTTH...");
    setTimeout(() => {
      loadFTTHTree();
      restoring = false;
    }, 400);
  }

  /* ===============================
     Eventos
  =============================== */
  App.map?.on("load", loadFTTHTree);
  App.map?.on("style.load", restoreLayers);

  /* ===============================
     API pública
  =============================== */
  App.loadFTTHTree = loadFTTHTree;

})();
