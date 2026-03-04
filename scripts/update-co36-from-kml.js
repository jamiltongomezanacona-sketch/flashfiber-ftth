#!/usr/bin/env node
/**
 * Actualiza la ruta de un cable FTTH desde un KML de un solo Placemark (LineString).
 * Uso: node scripts/update-co36-from-kml.js <CO36FH144.kml>
 * Actualiza: geojson/FTTH/CHICO/CO36/cables/CO36FH144.geojson
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = process.argv[2] || path.join(process.cwd(), "CO36FH144.kml");
const outputDir = path.join(__dirname, "..", "geojson", "FTTH", "CHICO", "CO36", "cables");
const outputPath = path.join(outputDir, "CO36FH144.geojson");

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

  const kml = fs.readFileSync(inputPath, "utf8");
  const coordsText = extractOne(kml, "coordinates");
  const coordinates = parseCoordinates(coordsText || "");

  if (coordinates.length < 2) {
    console.error("Se necesitan al menos 2 puntos en <coordinates>.");
    process.exit(1);
  }

  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          name: "CO36FH144",
          molecula: "CO36",
          central: "CHICO"
        },
        geometry: {
          type: "LineString",
          coordinates
        }
      }
    ]
  };

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 0), "utf8");
  console.log("✅ GeoJSON actualizado:", outputPath, "(" + coordinates.length + " puntos)");
}

main();
