/* =========================================================
   FlashFiber FTTH | Respaldo de Firebase en tu PC
   Exporta Firestore (cierres, eventos, rutas, etc.) y
   opcionalmente archivos de Storage a carpetas locales.
========================================================= */

import { createRequire } from "module";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const admin = require("firebase-admin");

// Colecciones a exportar (mismas que usa la app)
const FIRESTORE_COLLECTIONS = [
  "cierres",
  "eventos",
  "eventos_corporativo",
  "rutas"
];

// Prefijos de Storage a respaldar (fotos eventos, reflectometría)
const STORAGE_PREFIXES = ["eventos/", "reflectometria/"];

const PROJECT_ID = "flashfiber-ftth";
const STORAGE_BUCKET = "flashfiber-ftth.firebasestorage.app";

function getTimestamp() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function getDateFolder() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

function initFirebase() {
  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(path.dirname(__dirname), "firebase-service-account.json");
  const keyPathResolved = path.resolve(keyPath);

  try {
    const key = require(keyPathResolved);
    admin.initializeApp({
      credential: admin.credential.cert(key),
      storageBucket: STORAGE_BUCKET
    });
  } catch (e) {
    console.error("❌ No se pudo cargar la cuenta de servicio de Firebase.");
    console.error("   Ruta usada:", keyPathResolved);
    console.error("   Crea el archivo desde Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.");
    console.error("   Guárdalo como firebase-service-account.json en la raíz del proyecto (y no lo subas a git).");
    process.exit(1);
  }
}

async function exportFirestore(backupRoot) {
  const firestoreDir = path.join(backupRoot, "firestore", getDateFolder());
  await ensureDir(firestoreDir);

  const db = admin.firestore();

  for (const collName of FIRESTORE_COLLECTIONS) {
    const snap = await db.collection(collName).get();
    const data = [];
    snap.docs.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    const outPath = path.join(firestoreDir, `${collName}.json`);
    await writeFile(outPath, JSON.stringify(data, null, 2), "utf8");
    console.log("  📄", collName + ".json", "→", snap.size, "documentos");
  }

  return firestoreDir;
}

async function exportStorage(backupRoot) {
  const storageDir = path.join(backupRoot, "storage", getDateFolder());
  await ensureDir(storageDir);

  const bucket = admin.storage().bucket();

  async function listAllFiles(prefix) {
    const [files] = await bucket.getFiles({ prefix });
    return files;
  }

  async function downloadFile(file, localDir) {
    const rel = file.name.replace(prefix, "").replace(/\//g, path.sep);
    const localPath = path.join(localDir, rel);
    await ensureDir(path.dirname(localPath));
    await file.download({ destination: localPath });
  }

  let total = 0;
  for (const prefix of STORAGE_PREFIXES) {
    const files = await listAllFiles(prefix);
    const subDir = path.join(storageDir, prefix.replace("/", ""));
    await ensureDir(subDir);
    for (const file of files) {
      if (file.name.endsWith("/")) continue;
      await downloadFile(file, subDir);
      total++;
    }
    if (files.length) console.log("  📁", prefix, "→", files.length, "archivos");
  }
  if (total === 0) console.log("  📁 Storage: sin archivos en eventos/ ni reflectometria/");
  return storageDir;
}

async function main() {
  const backupStorage = process.argv.includes("--storage");
  const backupRoot =
    process.env.FIREBASE_BACKUP_DIR ||
    path.join(path.dirname(__dirname), "backup");

  console.log("🔥 Respaldo Firebase → PC");
  console.log("   Proyecto:", PROJECT_ID);
  console.log("   Carpeta:", backupRoot);

  initFirebase();

  console.log("\n📂 Firestore:");
  const firestoreDir = await exportFirestore(backupRoot);
  console.log("   Guardado en:", firestoreDir);

  if (backupStorage) {
    console.log("\n📂 Storage:");
    const storageDir = await exportStorage(backupRoot);
    console.log("   Guardado en:", storageDir);
  } else {
    console.log("\n💡 Para incluir fotos y archivos .SOR usa: node scripts/backup-firebase-to-pc.js --storage");
  }

  console.log("\n✅ Respaldo listo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
