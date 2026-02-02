/* =========================================================
   FlashFiber FTTH | Firebase Core (App + Auth)
========================================================= */

// 🔥 Firebase App
import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

// 🔐 Firebase Auth
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

// 🗄️ Firestore (solo para inicializar DB)
import { getFirestore }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

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
  // ❌ DESHABILITADO: Advertencia silenciada
  // console.warn("⚠️ Usando configuración Firebase por defecto. Para producción, usa config.local.js");
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
  if (!auth) {
    console.error("❌ Auth no inicializado");
    return () => {};
  }
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

  // ✅ Obtener perfil desde firebase.db.js (se carga después)
  // Usar función global si está disponible, sino usar import dinámico
  let perfil = null;
  if (window.FTTH_FIREBASE?.obtenerPerfilUsuario) {
    perfil = await window.FTTH_FIREBASE.obtenerPerfilUsuario(user.uid);
  } else {
    // Fallback: import dinámico
    try {
      const DB = await import("./firebase.db.js");
      perfil = await DB.obtenerPerfilUsuario(user.uid);
    } catch (err) {
      console.warn("⚠️ No se pudo cargar perfil de usuario:", err);
    }
  }

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
  onUserChange
};

// ✅ Las funciones de DB se exponen en firebase.db.js
// ✅ Los servicios específicos (cierres, eventos, rutas) se exponen en sus propios archivos
console.log("🌍 Firebase Core listo");
