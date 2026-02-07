#!/usr/bin/env node
/**
 * Genera geojson/cables-index.json para el buscador.
 * Un solo fetch en lugar de N (uno por cable).
 * Ejecutar desde la raíz del proyecto: node scripts/build-cables-index.js
 */

const fs = require("fs");
const path = require("path");

const GEOJSON_DIR = path.join(__dirname, "..", "geojson");
const OUTPUT_FILE = path.join(GEOJSON_DIR, "cables-index.json");

function shortCableDisplayName(layerId, fallbackName) {
  const from = (layerId || fallbackName || "").toString();
  if (!from) return "";
  const normalized = from.replace(/\s+/g, "");
  const match = normalized.match(/(SI\d+FH\d+(?:_\d+)?)/i);
  if (match) return match[1];
  const matchCuni = normalized.match(/(CUO?\d+FH\d+)/i);
  if (matchCuni) return matchCuni[1].replace(/^CUO(\d)/i, "CU0$1");
  const matchHo = normalized.match(/(HO\d+FH\d+)/i);
  if (matchHo) return matchHo[1];
  const matchBa = normalized.match(/(BAO?\d+FH\d+)/i);
  if (matchBa) return matchBa[1].replace(/^BAO(\d)/i, "BA0$1");
  if (from.startsWith("FTTH_") && from.includes("_")) {
    const parts = from.split("_");
    if (parts.length >= 2) return parts.slice(-2).join("_");
  }
  return fallbackName || layerId || from;
}

function isCableNode(node, basePathLower) {
  const pathLower = (node.path || "").toLowerCase();
  const idLower = (node.id || "").toLowerCase();
  const typeLayer = (node.typeLayer || "").toLowerCase();
  return (
    pathLower.includes("cable") ||
    basePathLower.includes("cables") ||
    typeLayer === "line" ||
    /si\d+fh\d+/i.test(idLower)
  );
}

const cables = [];
const seenIds = new Set();

function walkTree(node, dirPath) {
  if (!node) return;

  if (node.type === "layer") {
    const basePathLower = (dirPath || "").toLowerCase();
    if (!isCableNode(node, basePathLower)) return;

    const filePath = path.join(dirPath, node.path || "");
    if (!fs.existsSync(filePath)) {
      console.warn("⚠️ No existe:", filePath);
      return;
    }

    let geojson;
    try {
      geojson = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
      console.warn("⚠️ Error leyendo", filePath, err.message);
      return;
    }

    if (!geojson.features || !geojson.features.length) return;

    geojson.features.forEach((feature) => {
      const props = feature.properties || {};
      const id = props.id || props.codigo || node.id;
      const codigo = props.codigo || id;
      const central = props.central || "";
      const molecula = props.molecula || "";
      const tipo = props.tipo || "";
      const fibras = props.fibras || "";

      let coordinates = null;
      if (feature.geometry.type === "LineString" && feature.geometry.coordinates.length > 0) {
        const midIndex = Math.floor(feature.geometry.coordinates.length / 2);
        coordinates = feature.geometry.coordinates[midIndex];
      } else if (feature.geometry.type === "Point") {
        coordinates = feature.geometry.coordinates;
      }

      if (coordinates && id && !seenIds.has(id)) {
        seenIds.add(id);
        const name = shortCableDisplayName(node.id, codigo);
        cables.push({
          id,
          name,
          layerId: node.id,
          coordinates,
          central,
          molecula,
          tipo,
          fibras,
          subtitle: `${central}${molecula ? " · " + molecula : ""}${tipo ? " · " + tipo : ""}${fibras ? " · " + fibras + "F" : ""}`,
        });
      }
    });
    return;
  }

  const children = node.children || [];
  for (const child of children) {
    if (child.index) {
      const indexPath = path.join(dirPath, child.index);
      if (!fs.existsSync(indexPath)) continue;
      try {
        const next = JSON.parse(fs.readFileSync(indexPath, "utf8"));
        const dir = path.dirname(indexPath);
        walkTree(next, dir);
      } catch (err) {
        console.warn("⚠️ Error en", indexPath, err.message);
      }
    } else {
      walkTree(child, dirPath);
    }
  }
}

function main() {
  const rootPath = path.join(GEOJSON_DIR, "index.json");
  if (!fs.existsSync(rootPath)) {
    console.error("❌ No existe", rootPath);
    process.exit(1);
  }

  const root = JSON.parse(fs.readFileSync(rootPath, "utf8"));
  walkTree(root, GEOJSON_DIR);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cables, null, 0), "utf8");
  console.log("✅", cables.length, "cables en", OUTPUT_FILE);
}

main();
