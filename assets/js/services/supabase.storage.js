/* =========================================================
   FlashFiber FTTH | Supabase Storage Service
   Sustituto de firebase.storage.js
========================================================= */

import { supabase } from "../../../supabase.js";
import ErrorHandler from "../utils/errorHandler.js";
import { validators } from "../utils/validators.js";

const BUCKET_EVENTOS = "eventos";
const BUCKET_REFLECTO = "reflectometria";

async function subirFotoEvento(eventoId, tipo, file) {
  return await ErrorHandler.safeAsync(async () => {
    if (!eventoId || !file) throw new Error("eventoId y file son requeridos");
    const fileValidation = validators.archivo(file, 5 * 1024 * 1024);
    if (!fileValidation.valid) throw new Error(fileValidation.error);

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${tipo}_${Date.now()}.${ext}`;
    const path = `${eventoId}/${filename}`;

    const { data, error } = await supabase.storage.from(BUCKET_EVENTOS).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(BUCKET_EVENTOS).getPublicUrl(data.path);
    console.log("📸 Foto subida:", urlData.publicUrl);
    return urlData.publicUrl;
  }, "subirFotoEvento", null);
}

async function subirArchivoSOR(file, userId) {
  return await ErrorHandler.safeAsync(async () => {
    if (!file || !userId) throw new Error("file y userId son requeridos");
    const name = (file.name || "").toLowerCase();
    if (!name.endsWith(".sor")) throw new Error("Solo se permiten archivos .SOR");
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) throw new Error("Archivo máximo 20 MB");
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const path = `${userId}/${filename}`;

    const { data, error } = await supabase.storage.from(BUCKET_REFLECTO).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(BUCKET_REFLECTO).getPublicUrl(data.path);
    console.log("📁 Archivo .SOR subido:", filename);
    return { url: urlData.publicUrl, path: data.path, filename, size: file.size };
  }, "subirArchivoSOR", null);
}

async function listarArchivosSOR(userId) {
  return await ErrorHandler.safeAsync(async () => {
    if (!userId) return [];
    const { data: files, error } = await supabase.storage.from(BUCKET_REFLECTO).list(userId);
    if (error) throw error;
    const list = [];
    for (const f of files || []) {
      if (f.name && !f.name.startsWith(".")) {
        const { data: urlData } = supabase.storage.from(BUCKET_REFLECTO).getPublicUrl(`${userId}/${f.name}`);
        list.push({
          name: f.name,
          url: urlData.publicUrl,
          size: f.metadata?.size ?? 0,
          createdAt: f.created_at ?? ""
        });
      }
    }
    list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return list;
  }, "listarArchivosSOR", []);
}

async function eliminarArchivoSOR(userId, filename) {
  return await ErrorHandler.safeAsync(async () => {
    if (!userId || !filename) throw new Error("userId y filename son requeridos");
    const path = `${userId}/${filename}`;
    const { error } = await supabase.storage.from(BUCKET_REFLECTO).remove([path]);
    if (error) throw error;
    console.log("🗑️ Archivo .SOR eliminado:", filename);
    return true;
  }, "eliminarArchivoSOR", false);
}

window.FTTH_STORAGE = {
  subirFotoEvento,
  subirArchivoSOR,
  listarArchivosSOR,
  eliminarArchivoSOR
};

console.log("✅ Supabase Storage listo");
