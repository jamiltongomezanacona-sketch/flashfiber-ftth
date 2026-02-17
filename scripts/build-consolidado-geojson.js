#!/usr/bin/env node
/**
 * Pre-genera geojson/consolidado-ftth.geojson (solo cables + cierres E1/E0).
 * Misma lógica que consolidateAllGeoJSON en mapa.layers.js.
 * Ejecutar desde la raíz: node scripts/build-consolidado-geojson.js
 */

const fs = require("fs");
const path = require("path");

const GEOJSON_DIR = path.join(__dirname, "..", "geojson");
const ROOT_INDEX = path.join(GEOJSON_DIR, "index.json");
const OUTPUT_FILE = path.join(GEOJSON_DIR, "consolidado-ftth.geojson");

const allFeatures = [];
const loadedPaths = new Set();

function collectGeoJSON(node, baseDir, currentPath = "") {
  if (!node) return;

  const newPath = currentPath + (node.label ? "/" + node.label : "");

  if (node.type === "layer") {
    const fullPath = (currentPath + newPath).toLowerCase();
    const pathIncludesCables = fullPath.includes("cables") || fullPath.includes("/cables/") || fullPath.includes("/cables");
    const pathIncludesCierres = fullPath.includes("cierres") || fullPath.includes("/cierres/") || fullPath.includes("/cierres");
    const nodeIdLower = (node.id || "").toLowerCase();
    const nodeLabelLower = (node.label || "").toLowerCase();
    const nodePathLower = (node.path || "").toLowerCase();

    const isCable =
      (pathIncludesCables || nodeIdLower.includes("cable") || nodeLabelLower.includes("cable") || nodePathLower.includes("cable")) &&
      !fullPath.includes("corporativo");
    const isCierre =
      (pathIncludesCierres || nodeIdLower.includes("cierre") || nodeLabelLower.includes("cierre") || nodePathLower.includes("cierre")) &&
      !fullPath.includes("corporativo");

    const isExcluded =
      fullPath.includes("corporativo") ||
      fullPath.includes("eventos") ||
      fullPath.includes("rutas") ||
      fullPath.includes("mantenimientos") ||
      nodeIdLower.includes("corporativo") ||
      nodeIdLower.includes("evento") ||
      nodeIdLower.includes("ruta") ||
      nodeIdLower.includes("mantenimiento") ||
      nodeIdLower.includes("central") ||
      nodeIdLower.includes("centrales");

    if (isExcluded || (!isCable && !isCierre)) return;

    const filePath = path.join(baseDir, node.path || "");
    const normalized = path.normalize(filePath);
    if (loadedPaths.has(normalized)) return;
    loadedPaths.add(normalized);

    if (!fs.existsSync(normalized)) {
      console.warn("⚠ No existe:", normalized);
      return;
    }
    if (!fs.statSync(normalized).isFile()) {
      return; // es directorio, omitir
    }

    let geojson;
    try {
      geojson = JSON.parse(fs.readFileSync(normalized, "utf8"));
    } catch (err) {
      console.warn("⚠ Error leyendo", normalized, err.message);
      return;
    }

    if (!geojson?.features?.length) return;

    if (isCierre) {
      const cierreFeatures = geojson.features.filter((f) => {
        const tipo = f.properties?.tipo || f.properties?.type || f.properties?.name?.toUpperCase?.() || "";
        const name = (f.properties?.name || "").toUpperCase();
        const codigo = f.properties?.codigo || "";
        const isE1 = tipo === "E1" || (tipo && String(tipo).includes("E1")) || codigo.includes("E1") || name.includes("E1");
        const isE0 = tipo === "E0" || (tipo && String(tipo).includes("E0")) || name.includes("E0 POR CORTE");
        return isE1 || isE0;
      });
      if (cierreFeatures.length === 0) return;
      cierreFeatures.forEach((feature, idx) => {
        if (!feature.properties) feature.properties = {};
        feature.properties._layerId = node.id;
        feature.properties._layerLabel = node.label;
        feature.properties._layerType = node.typeLayer || "symbol";
        const moleculaMatch = (node.id || "").match(/([A-Z]{2}\d+)/);
        if (moleculaMatch) feature.properties._molecula = moleculaMatch[1];
        feature.properties.__id = feature.properties.id != null ? String(feature.properties.id) : node.id + "-c-" + idx;
      });
      allFeatures.push(...cierreFeatures);
    } else {
      const moleculaMatch = (node.id || "").match(/([A-Z]{2}\d+)/);
      const _molecula = moleculaMatch ? moleculaMatch[1] : "";
      geojson.features.forEach((feature, idx) => {
        if (!feature.properties) feature.properties = {};
        feature.properties._layerId = node.id;
        feature.properties._layerLabel = node.label;
        feature.properties._layerType = node.typeLayer || "line";
        if (_molecula) feature.properties._molecula = _molecula;
        feature.properties.__id = node.id + "-l-" + idx;
      });
      allFeatures.push(...geojson.features);
    }
    return;
  }

  if (node.children?.length) {
    for (const child of node.children) {
      if (child.type === "layer") {
        collectGeoJSON(child, baseDir, newPath);
      } else if (child.index) {
        const nextIndex = path.join(baseDir, child.index.replace(/\//g, path.sep));
        const nextBase = path.join(baseDir, path.dirname(child.index.replace(/\//g, path.sep)));
        if (!fs.existsSync(nextIndex)) {
          console.warn("⚠ No existe índice:", nextIndex);
          continue;
        }
        try {
          const json = JSON.parse(fs.readFileSync(nextIndex, "utf8"));
          const updatedPath = newPath + (json.label ? "/" + json.label : "");
          collectGeoJSON(json, nextBase, updatedPath);
        } catch (err) {
          console.warn("⚠ Error en", nextIndex, err.message);
        }
      }
    }
  }
}

function main() {
  if (!fs.existsSync(ROOT_INDEX)) {
    console.error("No se encontró", ROOT_INDEX);
    process.exit(1);
  }
  const root = JSON.parse(fs.readFileSync(ROOT_INDEX, "utf8"));
  const basePath = path.join(GEOJSON_DIR, "");
  collectGeoJSON(root, basePath, "");

  const consolidated = { type: "FeatureCollection", features: allFeatures };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(consolidated, null, 0), "utf8");
  console.log("✅ Escrito", OUTPUT_FILE, "con", allFeatures.length, "features");
}

main();
