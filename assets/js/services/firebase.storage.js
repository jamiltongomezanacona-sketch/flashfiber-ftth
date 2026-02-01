/* =========================================================
   FlashFiber FTTH | Firebase Storage Service
========================================================= */

import { getStorage, ref, uploadBytes, getDownloadURL }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

import { getApp }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

// 🔥 Obtener app ya inicializada por firebase.js
const app = getApp();
const storage = getStorage(app);

/* ===============================
   Subir foto de evento
=============================== */
async function subirFotoEvento(eventoId, tipo, file) {
  if (!eventoId || !file) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${tipo}_${Date.now()}.${ext}`;

  const path = `eventos/${eventoId}/${filename}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  console.log("📸 Foto subida:", url);
  return url;
}

/* 🌍 Exponer Storage */
window.FTTH_STORAGE = {
  subirFotoEvento
};

console.log("✅ Firebase Storage listo");
