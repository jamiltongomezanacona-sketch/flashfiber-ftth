/* =========================================================
   FlashFiber FTTH | Firebase Core (App + Auth)
========================================================= */

// 🔥 Firebase App
import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// 🔐 Firebase Auth
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 🗄️ Firestore (solo para inicializar DB)
import { getFirestore }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 📦 Firestore lógica
import * as DB from "./firebase.db.js";

/* =========================
   Configuración Firebase
========================= */
// ✅ Obtener configuración desde config.local.js o usar valores por defecto
const SECRETS = window.__FTTH_SECRETS__ || {};
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD3BNTIERRCZy5jRwN-KcIIQLeXFyg9gY4",
  authDomain: "flashfiber-ftth.firebaseapp.com",
  projectId: "flashfiber-ftth",
  storageBucket: "flashfiber-ftth.firebasestorage.app",
  messagingSenderId: "970573359420",
  appId: "1:970573359420:web:1254e4024920aeeff7d639"
};

const firebaseConfig = SECRETS.FIREBASE || DEFAULT_FIREBASE_CONFIG;

// ✅ Validar que la configuración esté completa
const requiredKeys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error("❌ Firebase config incompleto. Faltan:", missingKeys);
  console.error("💡 Crea config.local.js basado en config.local.example.js");
} else if (!SECRETS.FIREBASE) {
  console.warn("⚠️ Usando configuración Firebase por defecto. Para producción, usa config.local.js");
}

/* =========================
   Inicialización ÚNICA
========================= */
const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

console.log("🔥 Firebase Core inicializado");

/* =========================================================
   🔐 AUTH
========================================================= */

async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

async function logout() {
  await signOut(auth);
}

function onUserChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/* =========================================================
   👤 AUTH + PERFIL (CONEXIÓN CLAVE)
========================================================= */

onUserChange(async (user) => {
  if (!user) {
    window.__USER__ = null;
    return;
  }

  const perfil = await DB.obtenerPerfilUsuario(user.uid);

  if (!perfil || perfil.activo !== true) {
    alert("Usuario no autorizado");
    await logout();
    location.href = "/index.html";
    return;
  }

  window.__USER__ = {
    uid: user.uid,
    email: user.email,
    ...perfil
  };

  console.log("👤 Usuario cargado:", window.__USER__);
});

/* =========================================================
   🌍 EXPONER CORE GLOBAL
========================================================= */

window.FTTH_CORE = {
  auth,
  db,

  // Auth
  login,
  logout,
  onUserChange,

  // Firestore DB
  ...DB
};

console.log("🌍 Firebase Core listo");
