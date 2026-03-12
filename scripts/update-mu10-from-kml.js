#!/usr/bin/env node
/**
 * Actualiza la ruta del cable MU10FH144 en geojson/FTTH/MUZU/muzu.geojson desde un KML.
 * Uso: node scripts/update-mu10-from-kml.js [ruta/al/MU10FH144.kml]
 * Por defecto busca MU10FH144.kml en el directorio actual.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] || path.join(process.cwd(), "MU10FH144.kml");
const muzuPath = path.join(__dirname, "..", "geojson", "FTTH", "MUZU", "muzu.geojson");

function parseCoordinates(text) {
  if (!text || typeof text !== "string") return [];
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const coords = [];
  for (const part of parts) {
    const nums = part.split(",").map((s) => parseFloat(s.trim()));
    if (nums.length >= 2 && !Number.isNaN(nums[0]) && !Number.isNaN(nums[1])) {
      coords.push([nums[0], nums[1]]);
    }
  }
  return coords;
}

function extractOne(html, tagName) {
  const open = `<${tagName}>`;
  const close = `</${tagName}>`;
  const i = html.indexOf(open);
  if (i === -1) return null;
  const start = i + open.length;
  const j = html.indexOf(close, start);
  if (j === -1) return null;
  return html.slice(start, j).trim();
}

function main() {
  console.log("Leyendo KML:", inputPath);
  if (!fs.existsSync(inputPath)) {
    console.error("No se encontró el archivo:", inputPath);
    process.exit(1);
  }
  if (!fs.existsSync(muzuPath)) {
    console.error("No se encontró muzu.geojson:", muzuPath);
    process.exit(1);
  }

  const kml = fs.readFileSync(inputPath, "utf8");
  const coordsText = extractOne(kml, "coordinates");
  const coordinates = parseCoordinates(coordsText || "");

  if (coordinates.length < 2) {
    console.error("Se necesitan al menos 2 puntos en <coordinates>.");
    process.exit(1);
  }

  const geojson = JSON.parse(fs.readFileSync(muzuPath, "utf8"));
  const feature = geojson.features?.find((f) => f.properties?.name === "MU10FH144");
  if (!feature) {
    console.error("No se encontró el feature MU10FH144 en muzu.geojson");
    process.exit(1);
  }
  if (feature.geometry?.type !== "LineString") {
    console.error("El feature MU10FH144 no es un LineString");
    process.exit(1);
  }

  feature.geometry.coordinates = coordinates;
  fs.writeFileSync(muzuPath, JSON.stringify(geojson, null, 0), "utf8");
  console.log("✅ MU10FH144 actualizado en muzu.geojson (" + coordinates.length + " puntos)");
}

main();
