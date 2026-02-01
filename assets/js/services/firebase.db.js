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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
  return onSnapshot(collection(db, CIERRES_COLLECTION), snap => {
    snap.forEach(d => callback({ id: d.id, ...d.data() }));
  });
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
  return onSnapshot(collection(db, EVENTOS_COLLECTION), snap => {
    snap.forEach(d => callback({ id: d.id, ...d.data() }));
  });
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
