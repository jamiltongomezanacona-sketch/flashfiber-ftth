/* =========================================================
   FlashFiber FTTH | Migrar datos de Firebase (backup) a Supabase
   Lee los JSON generados por backup-firebase-to-pc.js e inserta
   en las tablas de Supabase.
   Uso:
     node scripts/migrar-firebase-to-supabase.js
     node scripts/migrar-firebase-to-supabase.js --path=backup/firestore/2025-03-11
   Variables de entorno: SUPABASE_URL, SUPABASE_ANON_KEY (o en .env)
========================================================= */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const DEFAULT_BACKUP_DIR = path.join(PROJECT_ROOT, "backup", "firestore");
const BATCH_SIZE = 50;

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Migración: usar service_role para poder insertar sin estar autenticado (bypasea RLS)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("❌ Define SUPABASE_URL y SUPABASE_ANON_KEY (o SUPABASE_SERVICE_ROLE_KEY para migración) en .env");
    process.exit(1);
  }
  return createClient(url, key);
}

function getBackupPath() {
  const pathArg = process.argv.find((a) => a.startsWith("--path="));
  if (pathArg) {
    const value = pathArg.replace("--path=", "").trim();
    return path.isAbsolute(value) ? value : path.join(PROJECT_ROOT, value);
  }
  return null;
}

async function findLatestBackupDir() {
  const base = DEFAULT_BACKUP_DIR;
  try {
    const entries = await readdir(base, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name)).sort().reverse();
    if (dirs.length === 0) return null;
    return path.join(base, dirs[0].name);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Helpers: fechas y mapeo
// -----------------------------------------------------------------------------
function toIso(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value._seconds === "number") {
    return new Date(value._seconds * 1000 + ((value._nanoseconds || 0) / 1e6)).toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

function mapCierre(doc) {
  return {
    codigo: doc.codigo ?? "",
    tipo: doc.tipo ?? "",
    central: doc.central ?? "",
    molecula: doc.molecula ?? "",
    notas: doc.notas ?? "",
    lat: doc.lat != null ? Number(doc.lat) : null,
    lng: doc.lng != null ? Number(doc.lng) : null,
    created_by: doc.createdBy ?? doc.created_by ?? "",
    created_at: toIso(doc.createdAt ?? doc.created_at) ?? new Date().toISOString(),
    updated_at: toIso(doc.updatedAt ?? doc.updated_at),
    server_time: toIso(doc.serverTime ?? doc.server_time) ?? new Date().toISOString()
  };
}

function mapEvento(doc) {
  const row = {
    tipo: doc.tipo ?? null,
    accion: doc.accion ?? null,
    estado: doc.estado ?? null,
    tecnico: doc.tecnico ?? null,
    notas: doc.notas ?? null,
    central: doc.central ?? null,
    molecula: doc.molecula ?? null,
    lat: doc.lat != null ? Number(doc.lat) : null,
    lng: doc.lng != null ? Number(doc.lng) : null,
    created_by: doc.createdBy ?? doc.created_by ?? null,
    created_at: toIso(doc.createdAt ?? doc.created_at) ?? new Date().toISOString(),
    updated_at: toIso(doc.updatedAt ?? doc.updated_at),
    server_at: toIso(doc.serverAt ?? doc.server_at) ?? new Date().toISOString()
  };
  return row;
}

function mapEventoCorp(doc) {
  return {
    ...mapEvento(doc),
    cable: doc.cable ?? null
  };
}

function mapRuta(doc) {
  return {
    nombre: doc.nombre ?? "",
    tipo: doc.tipo ?? "",
    central: doc.central ?? "",
    molecula: doc.molecula ?? "",
    notas: doc.notas ?? "",
    distancia: doc.distancia != null ? Number(doc.distancia) : 0,
    geojson: doc.geojson ?? "",
    created_at: toIso(doc.createdAt ?? doc.created_at) ?? new Date().toISOString(),
    updated_at: toIso(doc.updatedAt ?? doc.updated_at) ?? new Date().toISOString()
  };
}

// -----------------------------------------------------------------------------
// Carga e inserción
// -----------------------------------------------------------------------------
async function loadJson(dir, filename) {
  const filePath = path.join(dir, filename);
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function insertBatch(supabase, table, rows) {
  if (rows.length === 0) return { count: 0, error: null };
  const { data, error } = await supabase.from(table).insert(rows).select("id");
  if (error) return { count: 0, error };
  return { count: data?.length ?? rows.length, error: null };
}

async function migrateCollection(supabase, backupDir, collectionName, mapFn, tableName = null) {
  const table = tableName || collectionName.replace(/-/g, "_");
  const filename = `${collectionName}.json`;
  const docs = await loadJson(backupDir, filename);
  if (docs.length === 0) {
    console.log("  ⏭️", table, "→ 0 registros (archivo vacío o no existe)");
    return { total: 0, errors: [] };
  }

  const rows = docs.map((doc) => mapFn(doc));
  let inserted = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await insertBatch(supabase, table, batch);
    if (result.error) {
      errors.push({ table, batch: i / BATCH_SIZE, message: result.error.message });
      console.error("  ❌", table, "batch", i / BATCH_SIZE + 1, "→", result.error.message);
    } else {
      inserted += result.count;
    }
  }

  console.log("  ✅", table, "→", inserted, "/", docs.length, "registros");
  return { total: inserted, errors };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  console.log("📦 Migración Firebase (backup) → Supabase\n");

  let backupDir = getBackupPath();
  if (!backupDir) {
    backupDir = await findLatestBackupDir();
    if (!backupDir) {
      console.error("❌ No se encontró carpeta de backup.");
      console.error("   Ejecuta primero: node scripts/backup-firebase-to-pc.js");
      console.error("   O indica la ruta: node scripts/migrar-firebase-to-supabase.js --path=backup/firestore/YYYY-MM-DD");
      process.exit(1);
    }
    console.log("   Usando backup más reciente:", backupDir);
  } else {
    console.log("   Ruta de backup:", backupDir);
  }

  const supabase = getSupabaseClient();
  console.log("   Supabase URL:", (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "").slice(0, 40) + "...\n");

  console.log("📂 Migrando colecciones:\n");

  const results = {};
  results.cierres = await migrateCollection(supabase, backupDir, "cierres", mapCierre);
  results.eventos = await migrateCollection(supabase, backupDir, "eventos", mapEvento);
  results.eventos_corporativo = await migrateCollection(supabase, backupDir, "eventos_corporativo", mapEventoCorp, "eventos_corporativo");
  results.rutas = await migrateCollection(supabase, backupDir, "rutas", mapRuta);

  // usuarios: no se migra aquí (Firebase UID ≠ Supabase auth.users id).
  // Créalos en Supabase → Authentication → Users y añade filas en tabla usuarios con ese id.
  console.log("  ⏭️ usuarios → crear en Supabase Auth + Table Editor manualmente");

  const totalInserted = Object.values(results).reduce((acc, r) => acc + (r?.total ?? 0), 0);
  const totalErrors = Object.values(results).reduce((acc, r) => acc + (r?.errors?.length ?? 0), 0);

  console.log("\n" + "─".repeat(50));
  console.log("✅ Migración terminada. Total insertados:", totalInserted);
  if (totalErrors > 0) console.warn("⚠️ Errores en batches:", totalErrors);
  console.log("\n💡 Usuarios de Auth: créalos en Supabase → Authentication → Users y añade filas en tabla usuarios con el mismo id.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
