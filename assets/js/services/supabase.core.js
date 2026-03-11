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
    return;
  }

  let perfil = null;
  if (window.FTTH_FIREBASE?.obtenerPerfilUsuario) {
    perfil = await window.FTTH_FIREBASE.obtenerPerfilUsuario(user.id);
  } else {
    try {
      const { data } = await supabase.from("usuarios").select("*").eq("id", user.id).maybeSingle();
      perfil = data ?? null;
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
    uid: user.id,
    email: user.email,
    ...perfil
  };

  console.log("👤 Usuario cargado:", window.__USER__);
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
