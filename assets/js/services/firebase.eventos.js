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
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

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
   Escuchar eventos (un solo onSnapshot, múltiples callbacks)
=============================== */
const _eventosCallbacks = [];
let _eventosUnsubscribe = null;

export function escucharEventos(callback) {
  _eventosCallbacks.push(callback);

  if (!_eventosUnsubscribe) {
    console.log("👂 Escuchando eventos (singleton)...");
    _eventosUnsubscribe = onSnapshot(
      collection(db, EVENTOS_COLLECTION),
      (snapshot) => {
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();
          const evento = {
            id: change.doc.id,
            ...data
          };
          if (change.type === "removed") evento._deleted = true;
          _eventosCallbacks.forEach(cb => cb(evento));
        });
      }
    );
  }

  return function unsubscribe() {
    const i = _eventosCallbacks.indexOf(callback);
    if (i !== -1) _eventosCallbacks.splice(i, 1);
    if (_eventosCallbacks.length === 0 && _eventosUnsubscribe) {
      _eventosUnsubscribe();
      _eventosUnsubscribe = null;
    }
  };
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