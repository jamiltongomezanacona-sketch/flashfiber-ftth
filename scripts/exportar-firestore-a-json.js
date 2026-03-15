/**
 * Exportar colecciones de Firestore a archivos JSON
 * Uso: node scripts/exportar-firestore-a-json.js [--out=carpeta]
 *
 * Requiere:
 *   - firebase-admin instalado: npm install firebase-admin
 *   - Archivo de cuenta de servicio: firebase-service-account.json en la raíz,
 *     o variable GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON
 *
 * Genera en backup/firestore/YYYY-MM-DD/ (o --out):
 *   cierres.json, eventos.json, eventos_corporativo.json, rutas.json
 */

import admin from "firebase-admin";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const COLLECTIONS = ["cierres", "eventos", "eventos_corporativo", "rutas"];

function getCredentialsPath() {
  const env = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (env && existsSync(env)) return env;
  const defaultPath = join(root, "firebase-service-account.json");
  if (existsSync(defaultPath)) return defaultPath;
  return null;
}

function docToPlain(obj) {
  if (obj == null) return null;
  if (typeof obj.toDate === "function") return obj.toDate().toISOString();
  if (Array.isArray(obj)) return obj.map(docToPlain);
  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = docToPlain(v);
    return out;
  }
  return obj;
}

async function exportCollection(db, name) {
  const snap = await db.collection(name).get();
  const out = [];
  snap.docs.forEach((doc) => {
    out.push({ id: doc.id, ...docToPlain(doc.data()) });
  });
  return out;
}

async function main() {
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  const outDir = outArg
    ? join(root, outArg.replace("--out=", "").trim())
    : join(root, "backup", "firestore", new Date().toISOString().slice(0, 10));

  const credPath = getCredentialsPath();
  if (!credPath) {
    console.error("❌ No se encontró la cuenta de servicio de Firebase.");
    console.error("   1. En Firebase Console → Configuración del proyecto → Cuentas de servicio");
    console.error("   2. Genera una nueva clave privada y guarda el JSON como:");
    console.error("      firebase-service-account.json (en la raíz del proyecto)");
    console.error("   3. O define la variable GOOGLE_APPLICATION_CREDENTIALS con la ruta al archivo.");
    process.exit(1);
  }

  if (!existsSync(credPath)) {
    console.error("❌ Archivo no encontrado:", credPath);
    process.exit(1);
  }

  const key = JSON.parse(readFileSync(credPath, "utf8"));
  let app;
  try {
    app = admin.app();
  } catch {
    app = admin.initializeApp({ credential: admin.credential.cert(key) });
  }
  const db = admin.firestore();

  mkdirSync(outDir, { recursive: true });
  console.log("📂 Carpeta de salida:", outDir);

  for (const name of COLLECTIONS) {
    try {
      const data = await exportCollection(db, name);
      const path = join(outDir, name + ".json");
      writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
      console.log("  ✅", name + ".json", "→", data.length, "documentos");
    } catch (e) {
      console.warn("  ⚠️", name, e.message);
    }
  }

  const relativePath = outDir.replace(root, "").replace(/^[\\/]/, "").replace(/\\/g, "/");
  console.log("\n✅ Exportación terminada. Ejecuta la migración a Supabase:");
  console.log("   node scripts/migrar-firebase-to-supabase.js --path=" + relativePath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
