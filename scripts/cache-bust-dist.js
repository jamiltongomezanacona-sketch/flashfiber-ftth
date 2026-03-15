/**
 * Añade ?v=timestamp a ftth-bundle.js y a los CSS en los HTML de dist/
 * para que los cambios se vean de inmediato aunque el navegador tenga caché.
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const v = process.env.VERCEL_BUILD_ID || `b${Date.now()}`;

function bust(html) {
  return html
    .replace(/src="\/ftth-bundle\.js"/g, `src="/ftth-bundle.js?v=${v}"`)
    .replace(/href="(\/assets\/css\/[^"]+\.css)"/g, (_, href) => `href="${href}?v=${v}"`)
    .replace(/href="(\/assets\/js\/config\.js)"/g, (_, href) => `href="${href}?v=${v}"`);
}

for (const name of ["index.html", path.join("pages", "mapa-ftth.html"), path.join("pages", "mapa-corporativo.html")]) {
  const file = path.join(dist, name);
  try {
    const content = readFileSync(file, "utf8");
    writeFileSync(file, bust(content));
    console.log("  📌 Cache-bust:", name);
  } catch (e) {
    if (e.code === "ENOENT") console.warn("  ⚠️ No encontrado:", file);
    else throw e;
  }
}

console.log("✅ Cache-bust aplicado (v=" + v + ")");
