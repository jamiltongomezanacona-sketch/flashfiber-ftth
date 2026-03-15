/* =========================================================
   FlashFiber FTTH | Supabase Eventos Service
   Sustituto de firebase.eventos.js
========================================================= */

import { supabase } from "../../../supabase.js";
import { registerChannel } from "./supabase.db.js";

const TABLE = "eventos";
const READ_LIMIT = 2000;

const _eventosCallbacks = [];
let _eventosChannel = null;

function rowToDoc(row) {
  if (!row) return null;
  const { created_at, server_at, created_by, ...rest } = row;
  return {
    ...rest,
    createdAt: created_at ?? row.createdAt,
    serverAt: server_at ?? row.serverAt,
    createdBy: created_by ?? row.createdBy
  };
}

function dataToRow(data) {
  const { createdAt, serverAt, createdBy, updatedAt, ...rest } = data;
  const row = {
    ...rest,
    created_at: createdAt ?? new Date().toISOString(),
    server_at: serverAt ?? new Date().toISOString()
  };
  if (createdBy !== undefined) row.created_by = createdBy;
  if (updatedAt !== undefined) row.updated_at = updatedAt;
  return row;
}

export async function guardarEvento(data) {
  const payload = dataToRow({
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    serverAt: data.serverAt ?? new Date().toISOString()
  });
  const { data: inserted, error } = await supabase.from(TABLE).insert(payload).select("id").single();
  if (error) throw error;
  console.log("✅ Evento creado:", inserted.id);
  return inserted.id;
}

export async function actualizarEvento(id, data) {
  if (!id) throw new Error("ID requerido para actualizar evento");
  const clean = { ...data };
  if (clean.createdAt !== undefined) clean.created_at = clean.createdAt;
  if (clean.serverAt !== undefined) clean.server_at = clean.serverAt;
  if (clean.createdBy !== undefined) clean.created_by = clean.createdBy;
  if (clean.updatedAt !== undefined) clean.updated_at = clean.updatedAt;
  delete clean.createdAt;
  delete clean.serverAt;
  delete clean.createdBy;
  delete clean.updatedAt;
  const { error } = await supabase.from(TABLE).update(clean).eq("id", id);
  if (error) throw error;
  console.log("✏️ Evento actualizado:", id);
}

export async function eliminarEvento(id) {
  if (!id) throw new Error("ID requerido para eliminar evento");
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  console.log("🗑️ Evento eliminado:", id);
}

async function fetchInitialEventos() {
  const { data } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(READ_LIMIT);
  return (data || []).map((row) => rowToDoc(row)).filter(Boolean);
}

export function escucharEventos(callback) {
  _eventosCallbacks.push(callback);

  if (!_eventosChannel) {
    (async () => {
      const initial = await fetchInitialEventos();
      initial.forEach((doc) => _eventosCallbacks.forEach((cb) => cb(doc)));

      const channel = supabase
        .channel("eventos-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: TABLE },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const old = payload.old || {};
              _eventosCallbacks.forEach((cb) => cb({ id: old.id, _deleted: true }));
            } else {
              const doc = rowToDoc(payload.new || payload.record);
              if (doc) _eventosCallbacks.forEach((cb) => cb(doc));
            }
          }
        )
        .subscribe();

      _eventosChannel = channel;
      registerChannel("eventos", channel);
      console.log("👂 Escuchando eventos (Supabase Realtime)...");
    })();
  } else {
    (async () => {
      const initial = await fetchInitialEventos();
      initial.forEach((doc) => callback(doc));
    })();
  }

  return function unsubscribe() {
    const i = _eventosCallbacks.indexOf(callback);
    if (i !== -1) _eventosCallbacks.splice(i, 1);
    if (_eventosCallbacks.length === 0 && _eventosChannel) {
      _eventosChannel.unsubscribe();
      _eventosChannel = null;
    }
  };
}

window.FTTH_FIREBASE = {
  ...window.FTTH_FIREBASE,
  guardarEvento,
  actualizarEvento,
  eliminarEvento,
  escucharEventos
};
