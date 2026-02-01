/* =========================================================
   FlashFiber FTTH | Firestore DB Service
========================================================= */

import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* =========================================================
   🧹 CLEANUP DE LISTENERS
========================================================= */

// ✅ Almacenar funciones de unsubscribe para cleanup
const unsubscribeFunctions = {
  eventos: null,
  cierres: null
};

/* =========================================================
   📦 CIERRES
========================================================= */

const CIERRES_COLLECTION = "cierres";

export async function guardarCierre(cierre) {
  const ref = await addDoc(collection(db, CIERRES_COLLECTION), {
    ...cierre,
    createdAt: cierre.createdAt || new Date().toISOString(),
    serverTime: serverTimestamp()
  });
  return ref.id;
}

export function escucharCierres(callback) {
  // ✅ Limpiar listener anterior si existe
  if (unsubscribeFunctions.cierres) {
    unsubscribeFunctions.cierres();
  }

  const unsubscribe = onSnapshot(collection(db, CIERRES_COLLECTION), snap => {
    snap.forEach(d => callback({ id: d.id, ...d.data() }));
  });

  unsubscribeFunctions.cierres = unsubscribe;
  return unsubscribe; // ✅ Retornar para cleanup manual
}

export async function actualizarCierre(id, data) {
  await updateDoc(doc(db, CIERRES_COLLECTION, id), data);
}

export async function eliminarCierre(id) {
  await deleteDoc(doc(db, CIERRES_COLLECTION, id));
}

/* =========================================================
   🚨 EVENTOS
========================================================= */

const EVENTOS_COLLECTION = "eventos";

export async function guardarEvento(evento) {
  const ref = await addDoc(collection(db, EVENTOS_COLLECTION), {
    ...evento,
    createdAt: evento.createdAt || new Date().toISOString(),
    serverTime: serverTimestamp()
  });
  return ref.id;
}

export function escucharEventos(callback) {
  // ✅ Limpiar listener anterior si existe
  if (unsubscribeFunctions.eventos) {
    unsubscribeFunctions.eventos();
  }

  const unsubscribe = onSnapshot(collection(db, EVENTOS_COLLECTION), snap => {
    snap.forEach(d => callback({ id: d.id, ...d.data() }));
  });

  unsubscribeFunctions.eventos = unsubscribe;
  return unsubscribe; // ✅ Retornar para cleanup manual
}

export async function actualizarEvento(id, data) {
  await updateDoc(doc(db, EVENTOS_COLLECTION, id), data);
}

export async function eliminarEvento(id) {
  await deleteDoc(doc(db, EVENTOS_COLLECTION, id));
}

/* =========================================================
   👤 USUARIOS
========================================================= */

export async function obtenerPerfilUsuario(uid) {
  const ref = doc(db, "usuarios", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/* =========================================================
   🧹 CLEANUP GLOBAL
========================================================= */

// ✅ Función de cleanup global
export function cleanup() {
  Object.values(unsubscribeFunctions).forEach(unsub => {
    if (unsub && typeof unsub === "function") {
      unsub();
    }
  });
  // Limpiar referencias
  Object.keys(unsubscribeFunctions).forEach(key => {
    unsubscribeFunctions[key] = null;
  });
  console.log("🧹 Listeners de Firebase limpiados");
}

// ✅ Cleanup automático al cerrar página
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("pagehide", cleanup);
}
