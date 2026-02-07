#!/usr/bin/env node
/**
 * Convierte un KML de central FTTH (CUNI, HOLANDA, etc.) a GeoJSON por molécula: cables + cierres.
 * Uso: node scripts/ftth-kml-to-geojson.js <ruta.kml> <CENTRAL>
 *   CENTRAL = CUNI | HOLANDA (carpeta bajo geojson/FTTH y prefijo de molécula CU | HO)
 * Ejemplo: node scripts/ftth-kml-to-geojson.js "C:\...\HOLANDA.kml" HOLANDA
 * Salida: geojson/FTTH/<CENTRAL>/<MOL>/cables/ y cierres/
 */

const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];
const centralKey = (process.argv[3] || "CUNI").toUpperCase();
const CENTRAL_PREFIX = { CUNI: "CU", HOLANDA: "HO", BACHUE: "BA", FONTIBON: "FO", CHICO: "CO", SUBA: "SU", TOBERIN: "TO", GUAYMARAL: "GU" };
const prefix = CENTRAL_PREFIX[centralKey] || centralKey.substring(0, 2);
const outputBase = path.join(__dirname, "..", "geojson", "FTTH", centralKey);

function parseCoordinates(text) {
  if (!text || typeof text !== "string") return [];
  const parts = text.trim().split(/[\s,]+/).filter(Boolean);
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

function kmlColorToHex(aabbggrr) {
  if (!aabbggrr || aabbggrr.length < 8) return "#006699";
  const rr = aabbggrr.slice(6, 8);
  const gg = aabbggrr.slice(4, 6);
  const bb = aabbggrr.slice(2, 4);
  return "#" + rr + gg + bb;
}

function parseKml(kml, molPrefix) {
  const molecules = {};
  const folderRe = new RegExp(
    `<Folder>\\s*(?:<visibility>[\\s\\S]*?<\\/visibility>\\s*)?<name>(${molPrefix}\\d+)<\\/name>([\\s\\S]*?)<\\/Folder>`,
    "gi"
  );
  let m;
  while ((m = folderRe.exec(kml)) !== null) {
    const molId = m[1];
    const block = m[2];
    if (!molecules[molId]) molecules[molId] = { cables: [], cierres: [] };

    const placemarkRe = /<Placemark>([\s\S]*?)<\/Placemark>/gi;
    let pm;
    while ((pm = placemarkRe.exec(block)) !== null) {
      const content = pm[1];
      const name = extractOne(content, "name") || "";
      const coordsText = extractOne(content, "coordinates");
      const coordinates = parseCoordinates(coordsText || "");

      if (content.includes("<LineString>")) {
        if (coordinates.length >= 2) {
          let color = "#006699";
          const styleMatch = content.match(/<LineStyle>[\s\S]*?<color>([^<]+)<\/color>/i);
          if (styleMatch) color = kmlColorToHex(styleMatch[1].trim());
          molecules[molId].cables.push({ name, coordinates, color });
        }
      } else if (content.includes("<Point>")) {
        if (coordinates.length >= 1) {
          molecules[molId].cierres.push({ name, coordinates: coordinates[0] });
        }
      }
    }
  }
  return molecules;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  if (!inputPath) {
    console.error("Uso: node scripts/ftth-kml-to-geojson.js <ruta.kml> <CENTRAL>");
    process.exit(1);
  }
  console.log("Leyendo KML:", inputPath, "| Central:", centralKey, "| Prefijo molécula:", prefix);
  if (!fs.existsSync(inputPath)) {
    console.error("No se encontró el archivo:", inputPath);
    process.exit(1);
  }

  const kml = fs.readFileSync(inputPath, "utf8");
  const molecules = parseKml(kml, prefix);

  const molIds = Object.keys(molecules).sort();
  console.log("Moléculas con datos:", molIds.length, molIds.join(", "));

  for (const molId of molIds) {
    const data = molecules[molId];
    const molDir = path.join(outputBase, molId);
    const cablesDir = path.join(molDir, "cables");
    const cierresDir = path.join(molDir, "cierres");

    const cableLayers = [];
    for (const cable of data.cables) {
      const safeName = cable.name.replace(/[^\w\-.]/g, "_").replace(/_+/g, "_") || "cable";
      const fileName = safeName + ".geojson";
      const layerId = `FTTH_${centralKey}_${molId}_${safeName}`;
      cableLayers.push({
        type: "layer",
        id: layerId,
        label: cable.name,
        path: fileName,
        typeLayer: "line",
        paint: { "line-color": cable.color || "#006699", "line-width": 4 },
      });
      const geojson = {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: { name: cable.name, molecula: molId, central: centralKey },
          geometry: { type: "LineString", coordinates: cable.coordinates },
        }],
      };
      ensureDir(cablesDir);
      fs.writeFileSync(path.join(cablesDir, fileName), JSON.stringify(geojson, null, 0), "utf8");
    }

    const cierreFeatures = data.cierres.map((c) => ({
      type: "Feature",
      properties: { name: c.name, molecula: molId, central: centralKey, tipo: c.name.includes("E1") ? "E1" : "E0" },
      geometry: { type: "Point", coordinates: c.coordinates },
    }));

    if (cableLayers.length > 0) {
      ensureDir(cablesDir);
      fs.writeFileSync(
        path.join(cablesDir, "index.json"),
        JSON.stringify({ label: "Cables", children: cableLayers }, null, 2),
        "utf8"
      );
    }

    if (cierreFeatures.length > 0) {
      ensureDir(cierresDir);
      const cierresGeo = { type: "FeatureCollection", features: cierreFeatures };
      fs.writeFileSync(path.join(cierresDir, "cierres.geojson"), JSON.stringify(cierresGeo, null, 0), "utf8");
      fs.writeFileSync(
        path.join(cierresDir, "index.json"),
        JSON.stringify({
          label: "Cierres",
          children: [{
            type: "layer",
            id: `FTTH_${centralKey}_${molId}_cierres`,
            label: "Cierres " + molId,
            path: "cierres.geojson",
            typeLayer: "symbol",
          }],
        }, null, 2),
        "utf8"
      );
    }

    const molIndexPath = path.join(molDir, "index.json");
    const molIndex = { label: molId, children: [] };
    if (cableLayers.length > 0) molIndex.children.push({ type: "folder", label: "Cables", index: "cables/index.json" });
    if (cierreFeatures.length > 0) molIndex.children.push({ type: "folder", label: "Cierres", index: "cierres/index.json" });
    fs.writeFileSync(molIndexPath, JSON.stringify(molIndex, null, 2), "utf8");

    console.log(molId, "→", data.cables.length, "cables,", data.cierres.length, "cierres");
  }

  console.log("✅ GeoJSON escrito en", outputBase);
}

main();
