/* =====================================================
   Firebase Rutas Service | FlashFiber FTTH (SAFE)
===================================================== */

import { db } from "./firebase.db.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  limit
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const RUTAS_COLLECTION = "rutas";

/** Límite para no superar plan gratuito (50k lecturas/día). Ver firebase.cierres.js. */
const FIRESTORE_READ_LIMIT = 500;

window.FTTH_FIREBASE = window.FTTH_FIREBASE || {};

function toSafePayload(payload) {
  return {
    nombre: String(payload.nombre || ""),
    tipo: String(payload.tipo || ""),
    central: String(payload.central || ""),
    molecula: String(payload.molecula || ""),
    notas: String(payload.notas || ""),
    distancia: Number(payload.distancia || 0),
    geojson: String(payload.geojson || ""),
    ...(payload.createdAt !== undefined ? {} : { updatedAt: serverTimestamp() })
  };
}

window.FTTH_FIREBASE.guardarRuta = async function (payload) {
  try {
    const safePayload = {
      ...toSafePayload(payload),
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, RUTAS_COLLECTION), safePayload);
    console.log("☁️ Ruta guardada en Firebase:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error guardando ruta Firebase:", error);
    throw error;
  }
};

window.FTTH_FIREBASE.actualizarRuta = async function (id, payload) {
  try {
    if (!id) throw new Error("ID de ruta requerido");
    const safePayload = toSafePayload(payload);
    safePayload.updatedAt = serverTimestamp();
    await updateDoc(doc(db, RUTAS_COLLECTION, id), safePayload);
    console.log("✏️ Ruta actualizada:", id);
    return id;
  } catch (error) {
    console.error("❌ Error actualizando ruta Firebase:", error);
    throw error;
  }
};

window.FTTH_FIREBASE.eliminarRuta = async function (id) {
  try {
    if (!id) throw new Error("ID de ruta requerido");
    await deleteDoc(doc(db, RUTAS_COLLECTION, id));
    console.log("🗑️ Ruta eliminada:", id);
    return id;
  } catch (error) {
    console.error("❌ Error eliminando ruta Firebase:", error);
    throw error;
  }
};

/** Escucha en tiempo real la colección rutas. callback(rutas[]) con { id, ...data } */
window.FTTH_FIREBASE.escucharRutas = function (callback) {
  const ref = collection(db, RUTAS_COLLECTION);
  const q = FIRESTORE_READ_LIMIT > 0 ? query(ref, limit(FIRESTORE_READ_LIMIT)) : ref;
  return onSnapshot(q, (snapshot) => {
    const rutas = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(rutas);
  });
};