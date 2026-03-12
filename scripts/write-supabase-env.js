/**
 * Genera supabase-env.js con URL y clave desde variables de entorno.
 * Se ejecuta en el build de Vercel; el archivo no se sube a git.
 * Si las variables no están definidas, genera el archivo con undefined y un aviso (evita 404).
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

let content;
if (url && key) {
  content = `// Generado en build (Vercel). No editar ni subir a git.
window.__FTTH_SUPABASE_URL__ = ${JSON.stringify(url)};
window.__FTTH_SUPABASE_ANON_KEY__ = ${JSON.stringify(key)};
`;
} else {
  console.warn("⚠️ VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no definidos; supabase-env.js se generará con valores vacíos. Configura las variables en Vercel para producción.");
  content = `// Generado en build. Variables de Supabase no configuradas en este entorno.
console.warn("[FlashFiber] Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel (Environment Variables) y vuelve a desplegar.");
window.__FTTH_SUPABASE_URL__ = undefined;
window.__FTTH_SUPABASE_ANON_KEY__ = undefined;
`;
}

const outPath = path.join(root, "dist", "supabase-env.js");
const distDir = path.join(root, "dist");
try {
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }
} catch (_) {}
writeFileSync(outPath, content, "utf8");
console.log("✅ supabase-env.js generado en dist/");
