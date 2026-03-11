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
  deleteDoc,
  query,
  limit
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/** Límite bajo para mantener costo mínimo (50k lecturas/día gratis). 250 × 4 colecciones = 1000 lecturas/carga → ~50 cargas/día dentro de gratis. */
const FIRESTORE_READ_LIMIT = 250;

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
  const clean = {};
  for (const [k, v] of Object.entries({ ...data, updatedAt: new Date().toISOString() })) {
    if (v !== undefined) clean[k] = v;
  }
  clean.serverTime = serverTimestamp();
  await updateDoc(ref, clean);

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
   Escuchar Cierres (un solo onSnapshot, múltiples callbacks)
========================= */
const _cierresCallbacks = [];
let _cierresUnsubscribe = null;

function escucharCierres(callback) {
  if (!db) {
    console.warn("⏳ Firebase DB aún no disponible...");
    return () => {};
  }

  _cierresCallbacks.push(callback);

  if (!_cierresUnsubscribe) {
    const ref = collection(db, "cierres");
    const q = FIRESTORE_READ_LIMIT > 0 ? query(ref, limit(FIRESTORE_READ_LIMIT)) : ref;
    console.log("👂 Escuchando cierres (singleton)...");
    _cierresUnsubscribe = onSnapshot(q, snapshot => {
      snapshot.docChanges().forEach(change => {
        const payload =
          change.type === "removed"
            ? { id: change.doc.id, _deleted: true }
            : { id: change.doc.id, ...change.doc.data() };
        _cierresCallbacks.forEach(cb => cb(payload));
      });
    });
  }

  return function unsubscribe() {
    const i = _cierresCallbacks.indexOf(callback);
    if (i !== -1) _cierresCallbacks.splice(i, 1);
    if (_cierresCallbacks.length === 0 && _cierresUnsubscribe) {
      _cierresUnsubscribe();
      _cierresUnsubscribe = null;
    }
  };
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
