/* =========================================================
   FlashFiber FTTH | Firebase Cierres Service
========================================================= */

import { db } from "./firebase.db.js";

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =========================
   Guardar Cierre
========================= */
async function guardarCierre(cierre) {
  if (!db) {
    console.warn("⏳ Firebase DB aún no disponible...");
    throw new Error("Firebase DB no disponible");
  }

  const payload = {
    codigo: cierre.codigo || "",
    tipo: cierre.tipo || "",
    central: cierre.central || "",
    molecula: cierre.molecula || "",
    notas: cierre.notas || "",
    lat: Number(cierre.lat),
    lng: Number(cierre.lng),
    createdAt: cierre.createdAt || new Date().toISOString(),
    createdBy: cierre.createdBy || "",
    serverTime: serverTimestamp()
  };

  const ref = collection(db, "cierres");
  const docRef = await addDoc(ref, payload);

  console.log("☁️ Cierre guardado:", docRef.id);
  return docRef.id;
}

/* =========================
   Actualizar Cierre
========================= */
async function actualizarCierre(id, data) {
  if (!db) {
    console.warn("⏳ Firebase DB aún no disponible...");
    throw new Error("Firebase DB no disponible");
  }

  const ref = doc(db, "cierres", id);
  await updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString(),
    serverTime: serverTimestamp()
  });

  console.log("✏️ Cierre actualizado:", id);
}

/* =========================
   Eliminar Cierre
========================= */
async function eliminarCierre(id) {
  if (!db) {
    console.warn("⏳ Firebase DB aún no disponible...");
    throw new Error("Firebase DB no disponible");
  }

  const ref = doc(db, "cierres", id);
  await deleteDoc(ref);

  console.log("🗑️ Cierre eliminado:", id);
}

/* =========================
   Escuchar Cierres
========================= */
function escucharCierres(callback) {
  if (!db) {
    console.warn("⏳ Firebase DB aún no disponible...");
    return null;
  }

  const ref = collection(db, "cierres");
  console.log("👂 Escuchando cierres...");

  return onSnapshot(ref, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === "added" || change.type === "modified") {
        callback({
          id: change.doc.id,
          ...change.doc.data()
        });
      } else if (change.type === "removed") {
        // Notificar eliminación
        callback({
          id: change.doc.id,
          _deleted: true
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
