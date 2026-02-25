#!/usr/bin/env node
/**
 * Verifica que todas las centrales/moléculas FTTH tengan el mismo formato.
 * Uso: node scripts/verificar_geojson_ftth.js
 * Escribe: docs/VERIFICACION_GEOJSON_FTTH.md
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEOJSON_FTTH = path.join(__dirname, "..", "geojson", "FTTH");
const OUT_MD = path.join(__dirname, "..", "docs", "VERIFICACION_GEOJSON_FTTH.md");

const issues = [];
const ok = [];

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return null;
  }
}

function* walkMolecules(centralDir, centralId) {
  const indexPath = path.join(centralDir, "index.json");
  if (!fs.existsSync(indexPath)) return;
  const index = loadJson(indexPath);
  if (!index || !Array.isArray(index.children)) return;
  for (const child of index.children) {
    if (child.type !== "folder" || !child.index) continue;
    const molId = child.id || child.label || path.basename(child.index, "/index.json");
    const molDir = path.join(centralDir, path.dirname(child.index));
    yield { centralId, molId, molDir, child };
  }
}

function checkCentralIndex(centralDir, centralName) {
  const p = path.join(centralDir, "index.json");
  const index = loadJson(p);
  if (!index) {
    issues.push({ tipo: "central_sin_index", ruta: p });
    return null;
  }
  if (!index.label) issues.push({ tipo: "central_sin_label", central: centralName, ruta: p });
  if (!Array.isArray(index.children)) {
    issues.push({ tipo: "central_sin_children_array", central: centralName, ruta: p });
    return index;
  }
  const withoutId = index.children.filter((c) => c.type === "folder" && !c.id);
  if (withoutId.length) {
    issues.push({
      tipo: "central_child_sin_id",
      central: centralName,
      count: withoutId.length,
      ejemplos: withoutId.slice(0, 3).map((c) => c.label || c.index),
    });
  }
  const withoutType = index.children.filter((c) => !c.type && (c.index || c.label));
  if (withoutType.length) {
    issues.push({
      tipo: "central_child_sin_type",
      central: centralName,
      count: withoutType.length,
      ejemplos: withoutType.slice(0, 3).map((c) => c.label || c.index),
    });
  }
  return index;
}

function checkMoleculeDir(centralId, molId, molDir) {
  const molIndexPath = path.join(molDir, "index.json");
  const molIndex = loadJson(molIndexPath);
  if (!molIndex) {
    issues.push({ tipo: "mol_sin_index", central: centralId, molecula: molId, ruta: molIndexPath });
    return;
  }
  if (!molIndex.label) {
    issues.push({ tipo: "mol_sin_label", central: centralId, molecula: molId });
  }
  if (!Array.isArray(molIndex.children)) {
    issues.push({ tipo: "mol_sin_children_array", central: centralId, molecula: molId });
    return;
  }
  const hasCables = molIndex.children.some(
    (c) => (c.index || "").includes("cables") || (c.label || "").toLowerCase().includes("cable")
  );
  const hasCierres = molIndex.children.some(
    (c) => (c.index || "").includes("cierres") || (c.label || "").toLowerCase().includes("cierre")
  );

  const cablesIndexPath = path.join(molDir, "cables", "index.json");
  if (fs.existsSync(cablesIndexPath)) {
    const cablesIndex = loadJson(cablesIndexPath);
    if (!cablesIndex || !Array.isArray(cablesIndex.children)) {
      issues.push({ tipo: "cables_index_invalido", central: centralId, molecula: molId });
    } else {
      const prefix = `FTTH_${centralId}_${molId}_`;
      const standardHasPath = cablesIndex.children.some((c) => c.path && c.path.endsWith(".geojson"));
      const usesUrl = cablesIndex.children.some((c) => c.url && !c.path);
      if (!standardHasPath && usesUrl) {
        issues.push({ tipo: "cables_index_estructura_distinta", central: centralId, molecula: molId, detalle: "usa 'url' en vez de 'path', o sin .geojson" });
      }
      for (const layer of cablesIndex.children) {
        if (layer.type !== "layer") {
          issues.push({ tipo: "cable_layer_sin_type_layer", central: centralId, molecula: molId, id: layer.id });
        }
        if (!layer.id || !layer.id.startsWith("FTTH_")) {
          issues.push({ tipo: "cable_id_formato", central: centralId, molecula: molId, id: layer.id });
        }
        if (layer.label && /FH1444|FH484|FH48_4/.test(layer.label)) {
          issues.push({ tipo: "cable_nombre_typo", central: centralId, molecula: molId, label: layer.label, esperado: "FH144 o FH48" });
        }
        if (layer.id && !layer.id.startsWith(prefix) && centralId !== "MUZU") {
          issues.push({
            tipo: "cable_id_prefijo",
            central: centralId,
            molecula: molId,
            esperado: prefix,
            id: layer.id,
          });
        }
        if (!layer.path || !layer.path.endsWith(".geojson")) {
          issues.push({ tipo: "cable_path_sin_geojson", central: centralId, molecula: molId, path: layer.path });
        }
        if (layer.path) {
          const geojsonPath = path.join(molDir, "cables", layer.path);
          if (!fs.existsSync(geojsonPath)) {
            issues.push({ tipo: "cable_geojson_no_existe", central: centralId, molecula: molId, path: layer.path });
          } else {
            const gj = loadJson(geojsonPath);
            if (gj && gj.features) {
              for (const f of gj.features) {
                const p = f.properties || {};
                if (f.geometry && f.geometry.type === "LineString") {
                  if (!p.central) issues.push({ tipo: "geojson_sin_central", central: centralId, molecula: molId, file: layer.path });
                  if (!p.molecula) issues.push({ tipo: "geojson_sin_molecula", central: centralId, molecula: molId, file: layer.path });
                  if (p.molecula && p.molecula !== molId) {
                    issues.push({
                      tipo: "geojson_molecula_distinta",
                      central: centralId,
                      molecula: molId,
                      enArchivo: p.molecula,
                      file: layer.path,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  } else if (hasCables) {
    issues.push({ tipo: "mol_sin_carpeta_cables", central: centralId, molecula: molId });
  }

  const cierresIndexPath = path.join(molDir, "cierres", "index.json");
  if (fs.existsSync(cierresIndexPath)) {
    const cierresIndex = loadJson(cierresIndexPath);
    if (!cierresIndex || !Array.isArray(cierresIndex.children)) {
      issues.push({ tipo: "cierres_index_invalido", central: centralId, molecula: molId });
    }
  }
}

function main() {
  if (!fs.existsSync(GEOJSON_FTTH)) {
    console.error("No existe", GEOJSON_FTTH);
    process.exit(1);
  }

  const ftthIndex = loadJson(path.join(GEOJSON_FTTH, "index.json"));
  if (!ftthIndex || !Array.isArray(ftthIndex.children)) {
    console.error("FTTH/index.json inválido");
    process.exit(1);
  }

  const centralNames = new Map();
  for (const child of ftthIndex.children) {
    if (child.type !== "folder" || !child.index) continue;
    const centralName = child.index.split("/")[0].split(path.sep)[0] || path.basename(child.index, path.sep + "index.json");
    if (!centralName) continue;
    centralNames.set(centralName, child.label || centralName);
  }

  for (const [centralId, label] of centralNames) {
    const centralDir = path.join(GEOJSON_FTTH, centralId);
    if (!fs.existsSync(centralDir)) {
      issues.push({ tipo: "central_dir_no_existe", central: centralId });
      continue;
    }
    checkCentralIndex(centralDir, centralId);
    for (const { molId, molDir } of walkMolecules(centralDir, centralId)) {
      checkMoleculeDir(centralId, molId, molDir);
    }
  }

  const lines = [
    "# Verificación GeoJSON FTTH – Centrales y moléculas",
    "",
    "Generado con `node scripts/verificar_geojson_ftth.js`",
    "",
    "## Estándar esperado",
    "",
    "- **Central index.json**: `label`, `children[]` con `id`, `label`, `type: \"folder\"`, `index: \"MOL/index.json\"`.",
    "- **Molécula index.json**: `label` (ej. CO36), `children[]` con `type: \"folder\"`, `label: \"Cables\"|\"Cierres\"`, `index: \"cables/index.json\"`.",
    "- **Cables index.json**: `children[]` con `type: \"layer\"`, `id: \"FTTH_CENTRAL_MOL_CABLENAME\"`, `path: \"*.geojson\"`, `typeLayer: \"line\"`.",
    "- **GeoJSON de cable**: `features[].properties`: `name`, `molecula`, `central`.",
    "",
    "## Incidencias (no cumplen el estándar)",
    "",
  ];

  if (issues.length === 0) {
    lines.push("Ninguna. Todas las centrales/moléculas revisadas cumplen el formato.");
  } else {
    const byTipo = new Map();
    for (const i of issues) {
      const t = i.tipo;
      if (!byTipo.has(t)) byTipo.set(t, []);
      byTipo.get(t).push(i);
    }
    for (const [tipo, list] of byTipo) {
      lines.push(`### ${tipo}`);
      lines.push("");
      list.slice(0, 30).forEach((i) => {
        lines.push("- " + JSON.stringify(i));
      });
      if (list.length > 30) lines.push(`- ... y ${list.length - 30} más.`);
      lines.push("");
    }
  }

  lines.push("## Resumen");
  lines.push("");
  lines.push(`- **Total incidencias:** ${issues.length}`);
  lines.push(`- **Tipos de incidencia:** ${new Set(issues.map((i) => i.tipo)).size}`);

  const outDir = path.dirname(OUT_MD);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUT_MD, lines.join("\n"), "utf8");
  console.log("Incidencias:", issues.length);
  issues.forEach((i) => console.log(" ", i.tipo, i.central || "", i.molecula || "", i.id || i.path || i.ruta || ""));
  console.log("Reporte escrito en", OUT_MD);
}

main();
