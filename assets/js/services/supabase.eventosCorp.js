/* =========================================================
   FlashFiber FTTH | Supabase Eventos Corporativo
   Sustituto de firebase.eventosCorp.js
========================================================= */

import { supabase } from "../../../supabase.js";
import { registerChannel } from "./supabase.db.js";

const TABLE = "eventos_corporativo";
const READ_LIMIT = 250;

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

export async function guardarEventoCorp(data) {
  const payload = dataToRow({
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    serverAt: data.serverAt ?? new Date().toISOString()
  });
  const { data: inserted, error } = await supabase.from(TABLE).insert(payload).select("id").single();
  if (error) throw error;
  console.log("✅ Evento Corp creado:", inserted.id);
  return inserted.id;
}

export async function actualizarEventoCorp(id, data) {
  if (!id) throw new Error("ID requerido para actualizar evento corporativo");
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
  console.log("✏️ Evento Corp actualizado:", id);
}

export async function eliminarEventoCorp(id) {
  if (!id) throw new Error("ID requerido para eliminar evento corporativo");
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
  console.log("🗑️ Evento Corp eliminado:", id);
}

export function escucharEventosCorp(callback) {
  const callbacks = [callback];
  let channel = null;

  (async () => {
    const { data: initial } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(READ_LIMIT);

    (initial || []).forEach((row) => {
      const doc = rowToDoc(row);
      if (doc) callbacks.forEach((cb) => cb(doc));
    });

    channel = supabase
      .channel("eventos-corp-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old || {};
            callbacks.forEach((cb) => cb({ id: old.id, _deleted: true }));
          } else {
            const doc = rowToDoc(payload.new || payload.record);
            if (doc) callbacks.forEach((cb) => cb(doc));
          }
        }
      )
      .subscribe();

    registerChannel("eventos_corporativo", channel);
    console.log("👂 Escuchando eventos corporativo (Supabase Realtime)...");
  })();

  return function unsubscribe() {
    const i = callbacks.indexOf(callback);
    if (i !== -1) callbacks.splice(i, 1);
    if (callbacks.length === 0 && channel) {
      channel.unsubscribe();
    }
  };
}

window.FTTH_FIREBASE = {
  ...window.FTTH_FIREBASE,
  guardarEventoCorp,
  actualizarEventoCorp,
  eliminarEventoCorp,
  escucharEventosCorp
};
