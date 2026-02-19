/* =========================================================
   FlashFiber FTTH | Firebase Storage Service
========================================================= */

import { getStorage, ref, uploadBytes, getDownloadURL }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

import { getApp }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

// ✅ Error Handler y Validators
import ErrorHandler from "../utils/errorHandler.js";
import { validators } from "../utils/validators.js";

// 🔥 Obtener app ya inicializada por firebase.js
const app = getApp();
const storage = getStorage(app);

/* ===============================
   Subir foto de evento
=============================== */
async function subirFotoEvento(eventoId, tipo, file) {
  return await ErrorHandler.safeAsync(async () => {
    // ✅ Validaciones
    if (!eventoId || !file) {
      throw new Error("eventoId y file son requeridos");
    }

    // ✅ Validar archivo
    const fileValidation = validators.archivo(file, 5 * 1024 * 1024); // 5MB max
    if (!fileValidation.valid) {
      throw new Error(fileValidation.error);
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${tipo}_${Date.now()}.${ext}`;

    const path = `eventos/${eventoId}/${filename}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    console.log("📸 Foto subida:", url);
    return url;
  }, "subirFotoEvento", null);
}

/* ===============================
   Subir archivo .SOR (reflectometría)
=============================== */
async function subirArchivoSOR(file, userId) {
  return await ErrorHandler.safeAsync(async () => {
    if (!file || !userId) throw new Error("file y userId son requeridos");
    const name = (file.name || "").toLowerCase();
    if (!name.endsWith(".sor")) throw new Error("Solo se permiten archivos .SOR");
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) throw new Error("Archivo máximo 20 MB");
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const path = `reflectometria/${userId}/${filename}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    console.log("📁 Archivo .SOR subido:", filename);
    return { url, path, filename, size: file.size };
  }, "subirArchivoSOR", null);
}

/* 🌍 Exponer Storage */
window.FTTH_STORAGE = {
  subirFotoEvento,
  subirArchivoSOR
};

console.log("✅ Firebase Storage listo");
