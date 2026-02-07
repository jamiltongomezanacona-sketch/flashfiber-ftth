/**
 * Convierte CABLES.kml (KML con LineStrings) a GeoJSON para el visor.
 * Uso: node scripts/kml-to-geojson.js [ruta/CABLES.kml]
 * Salida: geojson/CABLES/cables.geojson
 */

const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2] || path.join(process.cwd(), "CABLES.kml");
const outputDir = path.join(__dirname, "..", "geojson", "CABLES");
const outputPath = path.join(outputDir, "cables.geojson");

// KML color AABBGGRR -> #RRGGBB
function kmlColorToHex(aabbggrr) {
  if (!aabbggrr || aabbggrr.length < 8) return "#00e5ff";
  const rr = aabbggrr.slice(6, 8);
  const gg = aabbggrr.slice(4, 6);
  const bb = aabbggrr.slice(2, 4);
  return "#" + rr + gg + bb;
}

function parseCoordinates(text) {
  if (!text || typeof text !== "string") return [];
  const parts = text.trim().split(/[\s,]+/).filter(Boolean);
  const coords = [];
  for (let i = 0; i + 2 <= parts.length; i += 3) {
    const lon = parseFloat(parts[i]);
    const lat = parseFloat(parts[i + 1]);
    if (!Number.isNaN(lon) && !Number.isNaN(lat)) {
      coords.push([lon, lat]);
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
  const features = [];

  const placemarkRe = /<Placemark>([\s\S]*?)<\/Placemark>/gi;
  let m;
  while ((m = placemarkRe.exec(kml)) !== null) {
    const block = m[1];
    const name = extractOne(block, "name") || "Sin nombre";
    const coordsText = extractOne(block, "coordinates");
    const coordinates = parseCoordinates(coordsText || "");
    if (coordinates.length < 2) continue;

    let color = "#00e5ff";
    const styleBlock = block.includes("<StyleMap>") ? block : block;
    const styleMatch = block.match(/<LineStyle>[\s\S]*?<color>([^<]+)<\/color>/i);
    if (styleMatch) color = kmlColorToHex(styleMatch[1].trim());

    features.push({
      type: "Feature",
      properties: { name, color },
      geometry: {
        type: "LineString",
        coordinates
      }
    });
  }

  const geojson = {
    type: "FeatureCollection",
    features
  };

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 0), "utf8");
  console.log("GeoJSON escrito:", outputPath, "(" + features.length + " cables)");
}

main();
