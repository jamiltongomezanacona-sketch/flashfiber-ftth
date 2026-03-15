/**
 * Crea supabase-env.js en la raíz del proyecto si no existe.
 * Así la app no se bloquea con un 404 al cargar (evita demoras en login).
 * Se ejecuta en "npm run prepare" (post-install).
 */
import { writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outPath = path.join(root, "supabase-env.js");

if (existsSync(outPath)) return;

const content = `// Stub generado por scripts/ensure-supabase-env.js (sin 404 en desarrollo).
// Sustituye por tus credenciales o configura en Vercel para producción.
window.__FTTH_SUPABASE_URL__ = window.__FTTH_SUPABASE_URL__ || "";
window.__FTTH_SUPABASE_ANON_KEY__ = window.__FTTH_SUPABASE_ANON_KEY__ || "";
`;

writeFileSync(outPath, content, "utf8");
console.log("✅ supabase-env.js (stub) creado en la raíz para desarrollo.");