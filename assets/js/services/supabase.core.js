/* =========================================================
   FlashFiber FTTH | Supabase Core (Auth + App)
   Sustituto de firebase.js
========================================================= */

import { supabase } from "../../../supabase.js";

/* =========================
   Auth
========================= */

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

async function logout() {
  await supabase.auth.signOut();
}

function onUserChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });
}

/* =========================
   Auth + Perfil (usuarios)
========================= */

onUserChange(async (user) => {
  if (!user) {
    window.__USER__ = null;
    if (window.FTTH_CORE?.auth) window.FTTH_CORE.auth.currentUser = null;
    return;
  }

  if (window.FTTH_CORE?.auth) window.FTTH_CORE.auth.currentUser = user;

  const PERFIL_TIMEOUT_MS = 12000;
  let perfil = null;
  let perfilTimeout = false;
  try {
    if (window.FTTH_FIREBASE?.obtenerPerfilUsuario) {
      perfil = await window.FTTH_FIREBASE.obtenerPerfilUsuario(user.id);
    } else {
      const perfilPromise = supabase.from("usuarios").select("*").eq("id", user.id).maybeSingle();
      const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), PERFIL_TIMEOUT_MS));
      const result = await Promise.race([perfilPromise, timeoutPromise]);
      perfil = result?.data ?? null;
    }
  } catch (err) {
    if (err?.message === "TIMEOUT") {
      perfilTimeout = true;
      console.warn("⚠️ Tiempo de espera agotado al cargar perfil");
    } else {
      console.warn("⚠️ No se pudo cargar perfil de usuario:", err);
    }
  }

  if (!perfil || perfil.activo !== true) {
    alert(perfilTimeout ? "La carga del perfil tardó demasiado. Revisa tu conexión e intenta de nuevo." : "Usuario no autorizado");
    await logout();
    location.href = "/index.html";
    return;
  }

  window.__USER__ = {
    uid: user.id,
    email: user.email,
    ...perfil
  };

  console.log("👤 Usuario cargado:", window.__USER__);

  // Redirigir desde aquí: onAuthStateChange se dispara antes de cargar el perfil,
  // así que la condición (user && __USER__) en ui.login.js nunca se cumple a tiempo.
  const path = typeof location !== "undefined" ? location.pathname : "";
  if (/^\/(index\.html)?\/?$/i.test(path) || path === "" || path === "/") {
    const url = (typeof window.__FTTH_REDIRECT_AFTER_LOGIN__ === "function" && window.__FTTH_REDIRECT_AFTER_LOGIN__()) || "pages/home.html";
    window.location.href = url;
  }
});

/* =========================
   Exponer Core Global (misma API que Firebase)
========================= */

window.FTTH_CORE = {
  auth: supabase.auth,
  db: supabase,

  login,
  logout,
  onUserChange
};

console.log("🌍 Supabase Core listo");
