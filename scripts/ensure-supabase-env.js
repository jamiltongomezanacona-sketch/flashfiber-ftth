/**
 * Crea supabase-env.js en la raíz del proyecto si no existe.
 * Así la app no se bloquea con un 404 al cargar (evita demoras en login).
 * Se ejecuta en "npm run prepare" (post-install). No debe fallar el build en Vercel/CI.
 */
import { writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(__dirname, "..");
  const outPath = path.join(root, "supabase-env.js");

  if (existsSync(outPath)) process.exit(0);

  const content = `// Stub generado por scripts/ensure-supabase-env.js (sin 404 en desarrollo).
// Sustituye por tus credenciales o configura en Vercel para producción.
window.__FTTH_SUPABASE_URL__ = window.__FTTH_SUPABASE_URL__ || "";
window.__FTTH_SUPABASE_ANON_KEY__ = window.__FTTH_SUPABASE_ANON_KEY__ || "";
`;

  writeFileSync(outPath, content, "utf8");
  if (!process.env.CI && !process.env.VERCEL) {
    console.log("✅ supabase-env.js (stub) creado en la raíz para desarrollo.");
  }
} catch (e) {
  // No fallar npm install en Vercel/CI; el build generará supabase-env.js en dist/
  if (!process.env.CI && !process.env.VERCEL) {
    console.warn("⚠️ ensure-supabase-env:", e.message);
  }
  process.exit(0);
}