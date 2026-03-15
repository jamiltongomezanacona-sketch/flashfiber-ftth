#!/usr/bin/env node
/**
 * B.6: Lista los iconos de Font Awesome usados en el proyecto (HTML + JS).
 * Uso: node scripts/list-fontawesome-icons.js
 * Salida: lista única de clases fa-* (fas/ far/ fab) y utilidades (fa-spin, fa-fw).
 * Sirve para crear un subset o self-host solo los iconos necesarios.
 */

import { readFileSync, statSync, readdirSync } from "fs";
import { join, extname } from "path";

const ROOT = process.cwd();

function* walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && (extname(e.name) === ".html" || extname(e.name) === ".js")) yield full;
  }
}

const iconRe = /\b(fa[srb]?\s+)?(fa-[a-z0-9-]+)/gi;
const utilRe = /\b(fa-spin|fa-fw)\b/g;
const seen = new Set();

const dirs = [join(ROOT, "pages"), join(ROOT, "assets", "js"), join(ROOT, "index.html")];
for (const p of dirs) {
  try {
    const st = statSync(p);
    if (st.isFile()) {
      const content = readFileSync(p, "utf8");
      for (const re of [iconRe, utilRe]) {
        let m;
        re.lastIndex = 0;
        while ((m = re.exec(content)) !== null) seen.add((m[2] || m[1]).toLowerCase());
      }
      continue;
    }
    if (st.isDirectory()) {
      for (const file of walk(p)) {
        const content = readFileSync(file, "utf8");
        let m;
        iconRe.lastIndex = 0;
        while ((m = iconRe.exec(content)) !== null) seen.add(m[2].toLowerCase());
        utilRe.lastIndex = 0;
        while ((m = utilRe.exec(content)) !== null) seen.add(m[1].toLowerCase());
      }
    }
  } catch (_) {}
}

const icons = Array.from(seen).filter((c) => c.startsWith("fa-")).sort();
console.log("# Iconos Font Awesome usados en el proyecto (B.6)\n");
console.log(icons.join("\n"));
console.log("\n# Total:", icons.length);
