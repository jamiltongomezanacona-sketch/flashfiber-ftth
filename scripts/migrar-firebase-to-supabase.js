/**
 * Migrar datos de Firebase (export JSON) a Supabase
 * Uso: node scripts/migrar-firebase-to-supabase.js [--path=carpeta]
 *
 * En la carpeta deben estar: cierres.json, eventos.json, eventos_corporativo.json, rutas.json
 * (o un solo archivo export.json con claves: cierres, eventos, eventos_corporativo, rutas)
 *
 * Variables de entorno: SUPABASE_URL, SUPABASE_ANON_KEY (o SUPABASE_SERVICE_ROLE_KEY)
 * Ejemplo PowerShell: $env:SUPABASE_URL="https://xxx.supabase.co"; $env:SUPABASE_ANON_KEY="eyJ..."
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ Define SUPABASE_URL y SUPABASE_ANON_KEY (o VITE_SUPABASE_*)");
  process.exit(1);
}

const supabase = createClient(url, key);

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return Object.entries(data).map(([id, doc]) => ({ ...(typeof doc === "object" ? doc : {}), id: doc?.id ?? id }));
  }
  return [];
}

function mapCierre(doc) {
  return {
    id: doc.id || undefined,
    codigo: doc.codigo ?? "",
    tipo: doc.tipo ?? "",
    central: doc.central ?? "",
    molecula: doc.molecula ?? "",
    notas: doc.notas ?? "",
    lat: doc.lat != null ? Number(doc.lat) : null,
    lng: doc.lng != null ? Number(doc.lng) : null,
    created_by: doc.createdBy ?? doc.created_by ?? "",
    created_at: doc.createdAt ?? doc.created_at ?? new Date().toISOString(),
    updated_at: doc.updatedAt ?? doc.updated_at ?? null,
    server_time: doc.serverTime ?? doc.server_time ?? null
  };
}

function mapEvento(doc) {
  return {
    id: doc.id || undefined,
    tipo: doc.tipo ?? "",
    accion: doc.accion ?? "",
    estado: doc.estado ?? "",
    tecnico: doc.tecnico ?? "",
    notas: doc.notas ?? "",
    central: doc.central ?? "",
    molecula: doc.molecula ?? "",
    lat: doc.lat != null ? Number(doc.lat) : null,
    lng: doc.lng != null ? Number(doc.lng) : null,
    created_by: doc.createdBy ?? doc.created_by ?? "",
    created_at: doc.createdAt ?? doc.created_at ?? new Date().toISOString(),
    updated_at: doc.updatedAt ?? doc.updated_at ?? null,
    server_at: doc.serverAt ?? doc.server_at ?? new Date().toISOString()
  };
}

function mapEventoCorp(doc) {
  return { ...mapEvento(doc), cable: doc.cable ?? "" };
}

function mapRuta(doc) {
  return {
    id: doc.id || undefined,
    nombre: doc.nombre ?? "",
    tipo: doc.tipo ?? "",
    central: doc.central ?? "",
    molecula: doc.molecula ?? "",
    notas: doc.notas ?? "",
    distancia: doc.distancia != null ? Number(doc.distancia) : 0,
    geojson: doc.geojson ?? "",
    created_at: doc.createdAt ?? doc.created_at ?? new Date().toISOString(),
    updated_at: doc.updatedAt ?? doc.updated_at ?? new Date().toISOString()
  };
}

function loadJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.warn("⚠️ No se pudo leer", path, e.message);
    return null;
  }
}

function isUuid(s) {
  if (!s || typeof s !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

async function insertTable(table, rows, mapper) {
  if (!rows.length) return { ok: 0, err: 0 };
  const mapped = rows.map(mapper).filter((r) => (r.lat != null && r.lng != null) || table === "rutas");
  let ok = 0,
    err = 0;
  for (const row of mapped) {
    const { id, ...rest } = row;
    const payload = id && isUuid(id) ? { id, ...rest } : rest;
    const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn("  Error insertando en", table, payload.id || payload.codigo || payload.nombre, error.message);
      err++;
    } else ok++;
  }
  return { ok, err };
}

async function main() {
  const pathArg = process.argv.find((a) => a.startsWith("--path="));
  const folder = pathArg ? pathArg.replace("--path=", "").trim() : join(root, "backup", "firestore");
  const resolved = join(root, folder);

  if (!existsSync(resolved)) {
    console.error("❌ Carpeta no encontrada:", resolved);
    console.log("Crea una carpeta con cierres.json, eventos.json, eventos_corporativo.json, rutas.json");
    console.log("O exporta desde Firebase Console y coloca los JSON ahí.");
    process.exit(1);
  }

  let cierres = [],
    eventos = [],
    eventosCorp = [],
    rutas = [];

  const singleExport = loadJson(join(resolved, "export.json"));
  if (singleExport) {
    cierres = toArray(singleExport.cierres);
    eventos = toArray(singleExport.eventos);
    eventosCorp = toArray(singleExport.eventos_corporativo || singleExport.eventosCorp);
    rutas = toArray(singleExport.rutas);
  } else {
    cierres = toArray(loadJson(join(resolved, "cierres.json")));
    eventos = toArray(loadJson(join(resolved, "eventos.json")));
    eventosCorp = toArray(loadJson(join(resolved, "eventos_corporativo.json")));
    rutas = toArray(loadJson(join(resolved, "rutas.json")));
  }

  console.log("📂 Carpeta:", resolved);
  console.log("  cierres:", cierres.length, "eventos:", eventos.length, "eventos_corporativo:", eventosCorp.length, "rutas:", rutas.length);

  if (cierres.length + eventos.length + eventosCorp.length + rutas.length === 0) {
    console.error("❌ No hay datos para migrar. Asegúrate de tener archivos JSON en la carpeta.");
    process.exit(1);
  }

  console.log("\n🔄 Insertando en Supabase...");
  const [r1, r2, r3, r4] = await Promise.all([
    insertTable("cierres", cierres, mapCierre),
    insertTable("eventos", eventos, mapEvento),
    insertTable("eventos_corporativo", eventosCorp, mapEventoCorp),
    insertTable("rutas", rutas, mapRuta)
  ]);

  console.log("  cierres:", r1.ok, "ok", r1.err, "errores");
  console.log("  eventos:", r2.ok, "ok", r2.err, "errores");
  console.log("  eventos_corporativo:", r3.ok, "ok", r3.err, "errores");
  console.log("  rutas:", r4.ok, "ok", r4.err, "errores");
  console.log("\n✅ Migración terminada. Revisa Supabase → Table Editor.");
  console.log("💡 Usuarios: créalos en Authentication y en la tabla usuarios (mismo id).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
