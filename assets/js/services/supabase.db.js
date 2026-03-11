/* =========================================================
   FlashFiber FTTH | Supabase DB Service
   Perfil de usuario y cleanup. Sustituto de firebase.db.js
   (Cierres y eventos están en supabase.cierres.js y supabase.eventos.js)
========================================================= */

import { supabase } from "../../../supabase.js";

const READ_LIMIT = 250;

/* =========================
   Cleanup de listeners (Realtime)
========================= */
const unsubscribeChannels = {};

export function cleanup() {
  Object.entries(unsubscribeChannels).forEach(([name, channel]) => {
    if (channel && typeof channel.unsubscribe === "function") {
      channel.unsubscribe();
    }
  });
  Object.keys(unsubscribeChannels).forEach((k) => delete unsubscribeChannels[k]);
  console.log("🧹 Listeners de Supabase limpiados");
}

export function registerChannel(name, channel) {
  if (unsubscribeChannels[name]) {
    unsubscribeChannels[name].unsubscribe();
  }
  unsubscribeChannels[name] = channel;
}

/* =========================
   Usuarios (perfil)
========================= */

export async function obtenerPerfilUsuario(uid) {
  const { data, error } = await supabase.from("usuarios").select("*").eq("id", uid).maybeSingle();
  if (error) {
    console.warn("obtenerPerfilUsuario error:", error);
    return null;
  }
  return data ?? null;
}

/* =========================
   Exponer globalmente (misma API que Firebase)
========================= */

window.FTTH_FIREBASE = window.FTTH_FIREBASE || {};
window.FTTH_FIREBASE.db = supabase;
window.FTTH_FIREBASE.obtenerPerfilUsuario = obtenerPerfilUsuario;
window.FTTH_FIREBASE.cleanup = cleanup;

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("pagehide", cleanup);
}

console.log("✅ Supabase DB (usuarios + cleanup) listo");
