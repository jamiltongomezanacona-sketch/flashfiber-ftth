/* =========================================================
   FlashFiber FTTH | Firebase Eventos Corporativo
   Colección independiente: eventos_corporativo
   Usado por: Reportar Evento Corp (GIS Corporativo)
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

const EVENTOS_CORP_COLLECTION = "eventos_corporativo";

/* ===============================
   Guardar evento corporativo (CREAR)
   👉 Devuelve ID
=============================== */
export async function guardarEventoCorp(data) {
  const payload = {
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    serverAt: serverTimestamp()
  };

  const docRef = await addDoc(
    collection(db, EVENTOS_CORP_COLLECTION),
    payload
  );

  console.log("✅ Evento Corp creado:", docRef.id);
  return docRef.id;
}

/* ===============================
   Actualizar evento corporativo
=============================== */
export async function actualizarEventoCorp(id, data) {
  if (!id) throw new Error("ID requerido para actualizar evento corporativo");

  const refDoc = doc(db, EVENTOS_CORP_COLLECTION, id);
  await updateDoc(refDoc, data);

  console.log("✏️ Evento Corp actualizado:", id);
}

/* ===============================
   Eliminar evento corporativo
=============================== */
export async function eliminarEventoCorp(id) {
  if (!id) throw new Error("ID requerido para eliminar evento corporativo");

  const refDoc = doc(db, EVENTOS_CORP_COLLECTION, id);
  await deleteDoc(refDoc);

  console.log("🗑️ Evento Corp eliminado:", id);
}

/* ===============================
   Escuchar eventos corporativos en tiempo real
=============================== */
export function escucharEventosCorp(callback) {
  return onSnapshot(
    collection(db, EVENTOS_CORP_COLLECTION),
    (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        const evento = {
          id: change.doc.id,
          ...data
        };

        if (change.type === "removed") {
          evento._deleted = true;
        }

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
  guardarEventoCorp,
  actualizarEventoCorp,
  eliminarEventoCorp,
  escucharEventosCorp
};
