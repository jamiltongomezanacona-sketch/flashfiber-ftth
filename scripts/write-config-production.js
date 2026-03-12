#!/usr/bin/env node
/**
 * Genera config.production.js con el token Mapbox desde la variable de entorno MAPBOX_TOKEN.
 * Uso: en Vercel (o similar) define MAPBOX_TOKEN en Environment Variables.
 * Build: node scripts/write-config-production.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");
const token = (process.env.MAPBOX_TOKEN || "").trim();
const outPath = fs.existsSync(distDir)
  ? path.join(distDir, "config.production.js")
  : path.join(root, "config.production.js");
const content =
  "/* Generado en build. Token desde MAPBOX_TOKEN (Vercel/host). */\n" +
  "window.__FTTH_MAPBOX_TOKEN__ = " +
  JSON.stringify(token) +
  ";\n";
fs.writeFileSync(outPath, content, "utf8");
console.log("config.production.js escrito (" + (token ? "token definido" : "token vacío") + ").");
