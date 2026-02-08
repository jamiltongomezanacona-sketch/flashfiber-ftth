#!/usr/bin/env node
/**
 * Actualiza SOLO el cable y cierres de CU21 desde CU21.kml.
 * No modifica índices ni ningún otro archivo.
 * Uso: node scripts/update-cu21-from-kml.js [ruta/CU21.kml]
 */

const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2] || path.join(process.env.USERPROFILE || "", "Desktop", "CU21.kml");
const baseDir = path.join(__dirname, "..", "geojson", "FTTH", "CUNI", "CU21");

function parseCoordinates(text) {
  if (!text || typeof text !== "string") return [];
  const parts = text.trim().split(/[\s\n,]+/).filter(Boolean);
  const coords = [];
  for (let i = 0; i + 2 <= parts.length; i += 3) {
    const lon = parseFloat(parts[i]);
    const lat = parseFloat(parts[i + 1]);
    if (!Number.isNaN(lon) && !Number.isNaN(lat)) coords.push([lon, lat]);
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
  const cables = [];
  const cierres = [];

  const placemarkRe = /<Placemark>([\s\S]*?)<\/Placemark>/gi;
  let pm;
  while ((pm = placemarkRe.exec(kml)) !== null) {
    const content = pm[1];
    const name = extractOne(content, "name") || "";
    const coordsText = extractOne(content, "coordinates");
    const coordinates = parseCoordinates(coordsText || "");

    if (content.includes("<LineString>")) {
      if (coordinates.length >= 2) {
        cables.push({ name: name || "CU21FH144", coordinates });
      }
    } else if (content.includes("<Point>")) {
      if (coordinates.length >= 1) {
        const tipo = name.includes("E1") ? "E1" : (name.toUpperCase().includes("E0") ? "E0" : "E1");
        cierres.push({ name, coordinates: coordinates[0], tipo });
      }
    }
  }

  if (cables.length === 0 && cierres.length === 0) {
    console.error("No se encontraron cables ni cierres en el KML.");
    process.exit(1);
  }

  if (cables.length > 0) {
    const cablePath = path.join(baseDir, "cables", "CU21FH144.geojson");
    const geojson = {
      type: "FeatureCollection",
      features: cables.map((c) => ({
        type: "Feature",
        properties: { name: c.name, molecula: "CU21", central: "CUNI" },
        geometry: { type: "LineString", coordinates: c.coordinates },
      })),
    };
    fs.writeFileSync(cablePath, JSON.stringify(geojson, null, 0), "utf8");
    console.log("✅ Actualizado:", cablePath, "(" + cables.length, "segmento(s))");
  }

  if (cierres.length > 0) {
    const cierresPath = path.join(baseDir, "cierres", "cierres.geojson");
    const geojson = {
      type: "FeatureCollection",
      features: cierres.map((c) => ({
        type: "Feature",
        properties: { name: c.name, molecula: "CU21", central: "CUNI", tipo: c.tipo },
        geometry: { type: "Point", coordinates: c.coordinates },
      })),
    };
    fs.writeFileSync(cierresPath, JSON.stringify(geojson, null, 0), "utf8");
    console.log("✅ Actualizado:", cierresPath, "(" + cierres.length, "punto(s))");
  }

  console.log("✅ CU21 actualizado. No se modificó ningún otro archivo.");
}

main();
