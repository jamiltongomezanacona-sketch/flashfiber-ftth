/**
 * Copia index.html, supabase.js, assets/ y pages/ a dist/
 * para que Vercel (Output Directory = dist) sirva el sitio completo.
 */
import { cpSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

if (!existsSync(dist)) {
  mkdirSync(dist, { recursive: true });
}

const copies = [
  ["index.html", "index.html"],
  ["supabase.js", "supabase.js"],
  ["manifest.json", "manifest.json"],
  ["assets", "assets"],
  ["pages", "pages"],
];

for (const [src, dest] of copies) {
  const srcPath = path.join(root, src);
  const destPath = path.join(dist, dest);
  if (existsSync(srcPath)) {
    cpSync(srcPath, destPath, { recursive: true });
    console.log("  📄", src, "→ dist/" + dest);
  }
}

console.log("✅ Estáticos copiados a dist/");
