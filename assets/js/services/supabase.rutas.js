/* =========================================================
   FlashFiber FTTH | Supabase Rutas Service
   Sustituto de firebase.rutas.js
========================================================= */

import { supabase } from "../../../supabase.js";
import { registerChannel } from "./supabase.db.js";

const TABLE = "rutas";
const READ_LIMIT = 250;

function rowToDoc(row) {
  if (!row) return null;
  const { created_at, updated_at, ...rest } = row;
  return {
    ...rest,
    createdAt: created_at ?? row.createdAt,
    updatedAt: updated_at ?? row.updatedAt
  };
}

function toSafePayload(payload) {
  const normalizeMolecula = window.__FTTH_CENTRALES__?.normalizeMolecula || function (m) { return m != null && m !== "" ? String(m).trim().toUpperCase() : ""; };
  return {
    nombre: String(payload.nombre ?? ""),
    tipo: String(payload.tipo ?? ""),
    central: String(payload.central ?? ""),
    molecula: normalizeMolecula(payload.molecula ?? ""),
    notas: String(payload.notas ?? ""),
    distancia: Number(payload.distancia ?? 0),
    geojson: String(payload.geojson ?? ""),
    updated_at: payload.updatedAt ?? new Date().toISOString()
  };
}

let _rutasList = [];
let _rutasChannel = null;
const _rutasCallbacks = [];

async function fetchRutas() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(READ_LIMIT);
  if (error) throw error;
  return (data || []).map((row) => ({ id: row.id, ...rowToDoc(row) }));
}

function notifyRutas() {
  const rutas = _rutasList.map((row) => ({ id: row.id, ...rowToDoc(row) }));
  _rutasCallbacks.forEach((cb) => cb(rutas));
}

window.FTTH_FIREBASE = window.FTTH_FIREBASE || {};

window.FTTH_FIREBASE.guardarRuta = async function (payload) {
  try {
    const safe = {
      ...toSafePayload(payload),
      created_at: payload.createdAt ?? new Date().toISOString()
    };
    const { data, error } = await supabase.from(TABLE).insert(safe).select("id").single();
    if (error) throw error;
    console.log("☁️ Ruta guardada en Supabase:", data.id);
    return data.id;
  } catch (error) {
    console.error("❌ Error guardando ruta Supabase:", error);
    throw error;
  }
};

window.FTTH_FIREBASE.actualizarRuta = async function (id, payload) {
  try {
    if (!id) throw new Error("ID de ruta requerido");
    const safe = toSafePayload(payload);
    const { error } = await supabase.from(TABLE).update(safe).eq("id", id);
    if (error) throw error;
    console.log("✏️ Ruta actualizada:", id);
    return id;
  } catch (error) {
    console.error("❌ Error actualizando ruta Supabase:", error);
    throw error;
  }
};

window.FTTH_FIREBASE.eliminarRuta = async function (id) {
  try {
    if (!id) throw new Error("ID de ruta requerido");
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    console.log("🗑️ Ruta eliminada:", id);
    return id;
  } catch (error) {
    console.error("❌ Error eliminando ruta Supabase:", error);
    throw error;
  }
};

/** Escucha en tiempo real la colección rutas. callback(rutas[]) con { id, ...data } */
window.FTTH_FIREBASE.escucharRutas = function (callback) {
  _rutasCallbacks.push(callback);

  if (!_rutasChannel) {
    (async () => {
      _rutasList = await fetchRutas();
      notifyRutas();

      const channel = supabase
        .channel("rutas-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: TABLE },
          async () => {
            _rutasList = await fetchRutas();
            notifyRutas();
          }
        )
        .subscribe();

      _rutasChannel = channel;
      registerChannel("rutas", channel);
      console.log("👂 Escuchando rutas (Supabase Realtime)...");
    })();
  } else {
    callback(_rutasList.map((row) => ({ id: row.id, ...rowToDoc(row) })));
  }

  return function unsubscribe() {
    const i = _rutasCallbacks.indexOf(callback);
    if (i !== -1) _rutasCallbacks.splice(i, 1);
    if (_rutasCallbacks.length === 0 && _rutasChannel) {
      _rutasChannel.unsubscribe();
      _rutasChannel = null;
    }
  };
};
