/* =========================================================
   FlashFiber FTTH | Firebase Core + Servicios
========================================================= */

import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { 
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   Configuración Firebase
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyD3BNTIERRCZy5jRwN-KcIIQLeXFyg9gY4",
  authDomain: "flashfiber-ftth.firebaseapp.com",
  projectId: "flashfiber-ftth",
  storageBucket: "flashfiber-ftth.firebasestorage.app",
  messagingSenderId: "970573359420",
  appId: "1:970573359420:web:1254e4024920aeeff7d639"
};

/* =========================
   Inicialización
========================= */
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

console.log("🔥 Firebase conectado correctamente");

/* =========================================================
   📦 CIERRES
========================================================= */

const CIERRES_COLLECTION = "cierres";

async function guardarCierre(cierre) {
  cierre.createdAt = cierre.createdAt || new Date().toISOString();

  const ref = await addDoc(collection(db, CIERRES_COLLECTION), {
    ...cierre,
    serverTime: serverTimestamp()
  });

  console.log("✅ Cierre guardado con ID:", ref.id);
  return ref.id;   // ✅ RETORNA ID
}

function escucharCierres(callback) {
  return onSnapshot(collection(db, CIERRES_COLLECTION), (snapshot) => {
    snapshot.docChanges().forEach(change => {
      callback({
        id: change.doc.id,
        ...change.doc.data()
      });
    });
  });
}

async function actualizarCierre(id, data) {
  const ref = doc(db, CIERRES_COLLECTION, id);
  await updateDoc(ref, data);
}

async function eliminarCierre(id) {
  const ref = doc(db, CIERRES_COLLECTION, id);
  await deleteDoc(ref);
}

/* =========================================================
   🚨 EVENTOS
========================================================= */

const EVENTOS_COLLECTION = "eventos";

async function guardarEvento(evento) {
  evento.createdAt = evento.createdAt || new Date().toISOString();

  const ref = await addDoc(collection(db, EVENTOS_COLLECTION), {
    ...evento,
    serverTime: serverTimestamp()
  });

  console.log("✅ Evento guardado con ID:", ref.id);
  return ref.id;   // ✅ RETORNA ID
}

function escucharEventos(callback) {
  return onSnapshot(collection(db, EVENTOS_COLLECTION), (snapshot) => {
    snapshot.docChanges().forEach(change => {
      callback({
        id: change.doc.id,
        ...change.doc.data()
      });
    });
  });
}

async function actualizarEvento(id, data) {
  const ref = doc(db, EVENTOS_COLLECTION, id);
  await updateDoc(ref, data);
}

async function eliminarEvento(id) {
  const ref = doc(db, EVENTOS_COLLECTION, id);
  await deleteDoc(ref);
}

/* =========================================================
   🌍 EXPONER GLOBAL
========================================================= */

// 👉 Alias global para compatibilidad total
window.__FTTH_DB__ = db;

window.FTTH_FIREBASE = {
  db,

  // Cierres
  guardarCierre,
  escucharCierres,
  actualizarCierre,
  eliminarCierre,

  // Eventos
  guardarEvento,
  escucharEventos,
  actualizarEvento,
  eliminarEvento
};

console.log("🌍 Firebase expuesto globalmente");
