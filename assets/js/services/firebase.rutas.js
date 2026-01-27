/* =====================================================
   Firebase Rutas Service | FlashFiber FTTH (SAFE)
===================================================== */

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

window.FTTH_FIREBASE = window.FTTH_FIREBASE || {};

window.FTTH_FIREBASE.guardarRuta = async function (payload) {
  try {

    // 🔒 Payload totalmente plano (sin arrays)
    const safePayload = {
      nombre: String(payload.nombre || ""),
      tipo: String(payload.tipo || ""),
      central: String(payload.central || ""),
      notas: String(payload.notas || ""),
      distancia: Number(payload.distancia || 0),
      geojson: String(payload.geojson || ""),
      createdAt: serverTimestamp()
    };

    console.log("📦 Payload FINAL enviado a Firebase:", safePayload);

    const docRef = await addDoc(
      collection(db, "rutas"),
      safePayload
    );

    console.log("☁️ Ruta guardada en Firebase:", docRef.id);
    return docRef.id;

  } catch (error) {
    console.error("❌ Error guardando ruta Firebase:", error);
    throw error;
  }
};