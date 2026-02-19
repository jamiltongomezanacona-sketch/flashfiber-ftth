#!/usr/bin/env node
/**
 * Genera config.production.js con el token Mapbox desde la variable de entorno MAPBOX_TOKEN.
 * Uso: en Vercel (o similar) define MAPBOX_TOKEN en Environment Variables.
 * Build: node scripts/write-config-production.js
 */
var fs = require("fs");
var path = require("path");
var token = (process.env.MAPBOX_TOKEN || "").trim();
var outPath = path.join(__dirname, "..", "config.production.js");
var content =
  "/* Generado en build. Token desde MAPBOX_TOKEN (Vercel/host). */\n" +
  "window.__FTTH_MAPBOX_TOKEN__ = " +
  JSON.stringify(token) +
  ";\n";
fs.writeFileSync(outPath, content, "utf8");
console.log("config.production.js escrito (" + (token ? "token definido" : "token vacío") + ").");
