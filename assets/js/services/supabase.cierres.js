/* =========================================================
   FlashFiber FTTH | Supabase Cierres Service
   Sustituto de firebase.cierres.js
========================================================= */

import { supabase } from "../../../supabase.js";
import { registerChannel } from "./supabase.db.js";

const TABLE = "cierres";
const READ_LIMIT = 250;

const _cierresCallbacks = [];
let _cierresChannel = null;

function rowToDoc(row) {
  if (!row) return null;
  const { created_at, created_by, server_time, ...rest } = row;
  return {
    ...rest,
    createdAt: created_at ?? row.createdAt,
    createdBy: created_by ?? row.createdBy,
    serverTime: server_time ?? row.serverTime
  };
}

async function guardarCierre(cierre) {
  const lat = Number(cierre.lat);
  const lng = Number(cierre.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error("Coordenadas inválidas (lat/lng)");
  }
  const normalizeMolecula = window.__FTTH_CENTRALES__?.normalizeMolecula || (m) => (m != null && m !== "" ? String(m).trim().toUpperCase() : "");
  const payload = {
    codigo: cierre.codigo ?? "",
    tipo: cierre.tipo ?? "",
    central: cierre.central ?? "",
    molecula: normalizeMolecula(cierre.molecula ?? ""),
    notas: cierre.notas ?? "",
    lat,
    lng,
    created_at: cierre.createdAt ?? new Date().toISOString(),
    created_by: cierre.createdBy ?? ""
  };
  // Seleccionar solo columnas existentes en la tabla (snake_case) para evitar error de schema cache
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select("id, codigo, tipo, central, molecula, notas, lat, lng, created_at, created_by, updated_at, server_time")
    .single();
  if (error) throw error;
  const doc = rowToDoc(data);
  if (doc) _cierresCallbacks.forEach((cb) => cb(doc));
  console.log("☁️ Cierre guardado:", data.id);
  return data.id;
}

async function actualizarCierre(id, data) {
  // Solo columnas snake_case que existen en la tabla. Nunca enviar createdAt/createdBy en
  // camelCase: PostgREST espera created_at/created_by y falla con "Could not find createdAt".
  const lat = data.lat != null ? Number(data.lat) : undefined;
  const lng = data.lng != null ? Number(data.lng) : undefined;
  const normalizeMolecula = window.__FTTH_CENTRALES__?.normalizeMolecula || (m) => (m != null && m !== "" ? String(m).trim().toUpperCase() : "");
  const clean = {
    codigo: data.codigo,
    tipo: data.tipo,
    central: data.central,
    molecula: data.molecula !== undefined ? normalizeMolecula(data.molecula) : undefined,
    notas: data.notas,
    updated_at: new Date().toISOString()
  };
  if (!Number.isNaN(lat)) clean.lat = lat;
  if (!Number.isNaN(lng)) clean.lng = lng;
  // Quitar undefined para no sobrescribir con null
  Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);

  const { error } = await supabase.from(TABLE).update(clean).eq("id", id);
  if (error) throw error;
  console.log("✏️ Cierre actualizado:", id);
}

async function eliminarCierre(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  console.log("🗑️ Cierre eliminado:", id);
}

function escucharCierres(callback) {
  _cierresCallbacks.push(callback);

  if (!_cierresChannel) {
    (async () => {
      const { data: initial } = await supabase
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(READ_LIMIT);

      (initial || []).forEach((row) => {
        const doc = rowToDoc(row);
        if (doc) _cierresCallbacks.forEach((cb) => cb(doc));
      });

      const channel = supabase
        .channel("cierres-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: TABLE },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const old = payload.old || {};
              _cierresCallbacks.forEach((cb) => cb({ id: old.id, _deleted: true }));
            } else {
              const doc = rowToDoc(payload.new || payload.record);
              if (doc) _cierresCallbacks.forEach((cb) => cb(doc));
            }
          }
        )
        .subscribe();

      _cierresChannel = channel;
      registerChannel("cierres", channel);
      console.log("👂 Escuchando cierres (Supabase Realtime)...");
    })();
  }

  return function unsubscribe() {
    const i = _cierresCallbacks.indexOf(callback);
    if (i !== -1) _cierresCallbacks.splice(i, 1);
    if (_cierresCallbacks.length === 0 && _cierresChannel) {
      _cierresChannel.unsubscribe();
      _cierresChannel = null;
    }
  };
}

window.FTTH_FIREBASE = window.FTTH_FIREBASE || {};
window.FTTH_FIREBASE.guardarCierre = guardarCierre;
window.FTTH_FIREBASE.escucharCierres = escucharCierres;
window.FTTH_FIREBASE.actualizarCierre = actualizarCierre;
window.FTTH_FIREBASE.eliminarCierre = eliminarCierre;

console.log("✅ Supabase Cierres listo");
