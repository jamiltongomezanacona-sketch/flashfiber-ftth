/* =========================================================
   FlashFiber FTTH | Firebase Eventos Service
========================================================= */

import { db } from "./firebase.db.js";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const EVENTOS_COLLECTION = "eventos";

/* ===============================
   Guardar evento (CREAR)
   👉 Devuelve ID
=============================== */
export async function guardarEvento(data) {
  const payload = {
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    serverAt: serverTimestamp()
  };

  const docRef = await addDoc(
    collection(db, EVENTOS_COLLECTION),
    payload
  );

  console.log("✅ Evento creado:", docRef.id);
  return docRef.id;   // ⭐ IMPORTANTE
}

/* ===============================
   Actualizar evento
=============================== */
export async function actualizarEvento(id, data) {
  if (!id) throw new Error("ID requerido para actualizar evento");

  const refDoc = doc(db, EVENTOS_COLLECTION, id);
  await updateDoc(refDoc, data);

  console.log("✏️ Evento actualizado:", id);
}

/* ===============================
   Eliminar evento
=============================== */
export async function eliminarEvento(id) {
  if (!id) throw new Error("ID requerido para eliminar evento");

  const refDoc = doc(db, EVENTOS_COLLECTION, id);
  await deleteDoc(refDoc);

  console.log("🗑️ Evento eliminado:", id);
}

/* ===============================
   Escuchar eventos en tiempo real
=============================== */
export function escucharEventos(callback) {
  return onSnapshot(
    collection(db, EVENTOS_COLLECTION),
    (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        const evento = {
          id: change.doc.id,
          ...data
        };
        callback(evento);
      });
    }
  );
}

/* ===============================
   Exponer globalmente
=============================== */
window.FTTH_FIREBASE = {
  ...window.FTTH_FIREBASE,
  guardarEvento,
  actualizarEvento,
  eliminarEvento,
  escucharEventos
};