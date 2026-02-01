/* =========================================================
   FlashFiber FTTH | Firebase Cierres Service
========================================================= */

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =========================
   Obtener DB desde core
========================= */
function getDB() {
  // Prioridad: alias global → objeto principal
  return window.__FTTH_DB__ || window.FTTH_FIREBASE?.db || null;
}

/* =========================
   Guardar Cierre
========================= */
async function guardarCierre(cierre) {
  const db = getDB();
  if (!db) {
    console.warn("⏳ Firebase DB aún no disponible...");
    return;
  }

  const payload = {
    codigo: cierre.codigo || "",
    tipo: cierre.tipo || "",
    central: cierre.central || "",
    molecula: cierre.molecula || "",
    notas: cierre.notas || "",
    lat: Number(cierre.lat),
    lng: Number(cierre.lng),
    createdAt: serverTimestamp()
  };

  const ref = collection(db, "cierres");
  const doc = await addDoc(ref, payload);

  console.log("☁️ Cierre guardado:", doc.id);
  return doc.id;
}

import {
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =========================
   Actualizar Cierre
========================= */
async function actualizarCierre(id, data) {
  const db = getDB();
  if (!db) {
    console.warn("⏳ Firebase DB aún no disponible...");
    return;
  }

  const ref = doc(db, "cierres", id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });

  console.log("✏️ Cierre actualizado:", id);
}

/* =========================
   Eliminar Cierre
========================= */
async function eliminarCierre(id) {
  const db = getDB();
  if (!db) {
    console.warn("⏳ Firebase DB aún no disponible...");
    return;
  }

  const ref = doc(db, "cierres", id);
  await deleteDoc(ref);

  console.log("🗑️ Cierre eliminado:", id);
}

/* =========================
   Escuchar Cierres
========================= */
function escucharCierres(callback) {
  const db = getDB();
  if (!db) {
    console.warn("⏳ Firebase DB aún no disponible...");
    return;
  }

  const ref = collection(db, "cierres");
  console.log("👂 Escuchando cierres...");

  return onSnapshot(ref, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === "added") {
        callback({
          id: change.doc.id,
          ...change.doc.data()
        });
      }
    });
  });
}

/* =========================
   Exponer API GLOBAL
========================= */
window.FTTH_FIREBASE = window.FTTH_FIREBASE || {};

window.FTTH_FIREBASE.guardarCierre     = guardarCierre;
window.FTTH_FIREBASE.escucharCierres   = escucharCierres;
window.FTTH_FIREBASE.actualizarCierre  = actualizarCierre;
window.FTTH_FIREBASE.eliminarCierre    = eliminarCierre;

console.log("✅ firebase.cierres listo con edición y eliminación");
