/* =========================================================
   FlashFiber FTTH | Supabase Notas Rápidas (pin con flecha)
   Tabla: notas_rapidas (molecula, lng, lat, texto, created_at, created_by)
========================================================= */

import { supabase } from "../../../supabase.js";
import { registerChannel } from "./supabase.db.js";

const TABLE = "notas_rapidas";
const READ_LIMIT = 500;

const _notasCallbacks = [];
let _notasChannel = null;

function rowToDoc(row) {
  if (!row) return null;
  const { created_at, created_by, ...rest } = row;
  return {
    ...rest,
    createdAt: created_at ?? row.createdAt,
    createdBy: created_by ?? row.createdBy
  };
}

async function guardarNota(nota) {
  const lat = Number(nota.lat);
  const lng = Number(nota.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error("Coordenadas inválidas");
  const userId = window.__USER__?.uid ?? null;
  const payload = {
    molecula: String(nota.molecula ?? "").trim(),
    central: nota.central ? String(nota.central).trim() : null,
    lng,
    lat,
    texto: String(nota.texto ?? "").trim(),
    created_by: userId
  };
  const { data, error } = await supabase.from(TABLE).insert(payload).select("*").single();
  if (error) throw error;
  console.log("📌 Nota rápida guardada:", data.id);
  return rowToDoc(data);
}

async function actualizarNota(id, data) {
  if (!id) throw new Error("ID requerido");
  const clean = {};
  if (data.texto !== undefined) clean.texto = String(data.texto).trim();
  if (data.lng !== undefined) clean.lng = Number(data.lng);
  if (data.lat !== undefined) clean.lat = Number(data.lat);
  if (data.molecula !== undefined) clean.molecula = String(data.molecula).trim();
  if (data.central !== undefined) clean.central = data.central ? String(data.central).trim() : null;
  const { error } = await supabase.from(TABLE).update(clean).eq("id", id);
  if (error) throw error;
  console.log("✏️ Nota actualizada:", id);
}

async function eliminarNota(id) {
  if (!id) throw new Error("ID requerido");
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  console.log("🗑️ Nota eliminada:", id);
}

function escucharNotas(callback) {
  _notasCallbacks.push(callback);

  if (!_notasChannel) {
    (async () => {
      const { data: initial } = await supabase
        .from(TABLE)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(READ_LIMIT);

      (initial || []).forEach((row) => {
        const doc = rowToDoc(row);
        if (doc) _notasCallbacks.forEach((cb) => cb(doc));
      });

      const channel = supabase
        .channel("notas-rapidas-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: TABLE },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const old = payload.old || {};
              _notasCallbacks.forEach((cb) => cb({ id: old.id, _deleted: true }));
            } else {
              const doc = rowToDoc(payload.new || payload.record);
              if (doc) _notasCallbacks.forEach((cb) => cb(doc));
            }
          }
        )
        .subscribe();

      _notasChannel = channel;
      registerChannel("notas", channel);
      console.log("👂 Escuchando notas rápidas (Supabase Realtime)...");
    })();
  }

  return function unsubscribe() {
    const i = _notasCallbacks.indexOf(callback);
    if (i !== -1) _notasCallbacks.splice(i, 1);
    if (_notasCallbacks.length === 0 && _notasChannel) {
      _notasChannel.unsubscribe();
      _notasChannel = null;
    }
  };
}

window.FTTH_FIREBASE = window.FTTH_FIREBASE || {};
window.FTTH_FIREBASE.guardarNota = guardarNota;
window.FTTH_FIREBASE.actualizarNota = actualizarNota;
window.FTTH_FIREBASE.eliminarNota = eliminarNota;
window.FTTH_FIREBASE.escucharNotas = escucharNotas;
