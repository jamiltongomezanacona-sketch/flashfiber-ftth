/* =========================================================
   FlashFiber FTTH | ui.rutas.js
   Panel moderno: Guardar, Editar, Borrar rutas (Firebase)
========================================================= */

(function () {
  "use strict";

  const App = window.__FTTH_APP__;
  const RUTAS_PANEL_ID = "rutasPanel";
  const RUTAS_LIST_ID = "rutasListContainer";
  const RUTAS_EMPTY_ID = "rutasListEmpty";
  const EDITAR_MODAL_ID = "editarRutaModal";

  let unsubscribeRutas = null;

  function getEl(id) {
    return document.getElementById(id);
  }

  function openPanel() {
    const panel = getEl(RUTAS_PANEL_ID);
    const sidebar = getEl("sidebar");
    if (panel) {
      panel.classList.remove("hidden");
      if (sidebar) sidebar.classList.add("hidden");
      const overlay = document.querySelector(".sidebar-overlay");
      if (overlay) overlay.classList.remove("active");
    }
  }

  function closePanel() {
    const panel = getEl(RUTAS_PANEL_ID);
    if (panel) panel.classList.add("hidden");
  }

  function renderList(rutas) {
    const container = getEl(RUTAS_LIST_ID);
    const empty = getEl(RUTAS_EMPTY_ID);
    if (!container) return;

    if (!rutas || rutas.length === 0) {
      container.innerHTML = "";
      if (empty) {
        empty.classList.remove("hidden");
      }
      return;
    }
    if (empty) empty.classList.add("hidden");

    container.innerHTML = rutas.map((r) => {
      const nombre = r.nombre || "Sin nombre";
      const central = r.central || "—";
      const molecula = r.molecula || "—";
      const dist = r.distancia != null ? Number(r.distancia) : 0;
      const distText = dist >= 1000 ? (dist / 1000).toFixed(1) + " km" : dist + " m";
      const tipo = r.tipo || "ruta";
      return (
        '<div class="ruta-card" data-ruta-id="' +
        (r.id || "") +
        '">' +
        '<div class="ruta-card-title">' +
        escapeHtml(nombre) +
        "</div>" +
        '<div class="ruta-card-meta">' +
        "<span>🏢 " +
        escapeHtml(central) +
        "</span>" +
        "<span>🧬 " +
        escapeHtml(molecula) +
        "</span>" +
        "<span>📏 " +
        distText +
        "</span>" +
        (tipo ? '<span class="ruta-tipo">' + escapeHtml(tipo) + "</span>" : "") +
        "</div>" +
        '<div class="ruta-card-actions">' +
        '<button type="button" class="ruta-card-btn ruta-btn-edit" data-action="edit" aria-label="Editar"><i class="fas fa-pen"></i> Editar</button>' +
        '<button type="button" class="ruta-card-btn ruta-btn-delete" data-action="delete" aria-label="Eliminar"><i class="fas fa-trash-alt"></i> Eliminar</button>' +
        "</div>" +
        "</div>"
      );
    }).join("");

    container.querySelectorAll(".ruta-card").forEach((card) => {
      const id = card.getAttribute("data-ruta-id");
      const ruta = rutas.find((r) => r.id === id);
      if (!ruta) return;
      card.querySelector('[data-action="edit"]')?.addEventListener("click", () => openEditModal(ruta));
      card.querySelector('[data-action="delete"]')?.addEventListener("click", () => confirmDelete(ruta));
    });
  }

  function escapeHtml(s) {
    if (s == null) return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function openEditModal(ruta) {
    const modal = getEl(EDITAR_MODAL_ID);
    const idEl = getEl("editarRutaId");
    const nombreEl = getEl("editarRutaNombre");
    const centralEl = getEl("editarRutaCentral");
    const moleculaEl = getEl("editarRutaMolecula");
    const notasEl = getEl("editarRutaNotas");
    if (!modal || !idEl || !nombreEl || !centralEl || !moleculaEl) return;

    idEl.value = ruta.id || "";
    nombreEl.value = ruta.nombre || "";
    centralEl.value = ruta.central || "";
    notasEl.value = ruta.notas || "";

    moleculaEl.innerHTML = "<option value=\"\">Seleccione Molécula</option>";
    const CENTRALES = window.__FTTH_CENTRALES__;
    if (ruta.central && CENTRALES?.CENTRAL_PREFIX?.[ruta.central]) {
      const prefijo = CENTRALES.CENTRAL_PREFIX[ruta.central];
      const moleculas = CENTRALES.generarMoleculas(prefijo) || [];
      moleculas.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        if (m === ruta.molecula) opt.selected = true;
        moleculaEl.appendChild(opt);
      });
      moleculaEl.disabled = false;
    } else {
      moleculaEl.disabled = true;
    }

    modal.classList.remove("hidden");
  }

  function closeEditModal() {
    getEl(EDITAR_MODAL_ID)?.classList.add("hidden");
  }

  function populateEditarMoleculas() {
    const centralEl = getEl("editarRutaCentral");
    const moleculaEl = getEl("editarRutaMolecula");
    if (!centralEl || !moleculaEl) return;
    moleculaEl.innerHTML = "<option value=\"\">Seleccione Molécula</option>";
    const centralVal = centralEl.value;
    const CENTRALES = window.__FTTH_CENTRALES__;
    if (!centralVal || !CENTRALES?.CENTRAL_PREFIX?.[centralVal]) {
      moleculaEl.disabled = true;
      return;
    }
    const prefijo = CENTRALES.CENTRAL_PREFIX[centralVal];
    const moleculas = CENTRALES.generarMoleculas(prefijo) || [];
    moleculas.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      moleculaEl.appendChild(opt);
    });
    moleculaEl.disabled = false;
  }

  function confirmDelete(ruta) {
    const nombre = ruta.nombre || ruta.id || "esta ruta";
    if (!window.confirm("¿Eliminar la ruta «" + nombre + "»?\nEsta acción no se puede deshacer.")) {
      return;
    }
    if (!window.FTTH_FIREBASE?.eliminarRuta) {
      App?.ui?.notify?.("⚠️ Firebase no disponible.");
      return;
    }
    window.FTTH_FIREBASE.eliminarRuta(ruta.id)
      .then(() => {
        App?.ui?.notify?.("✅ Ruta eliminada");
      })
      .catch((err) => {
        console.error("Error eliminando ruta:", err);
        App?.ui?.notify?.("⚠️ No se pudo eliminar la ruta");
      });
  }

  function saveEditModal() {
    const idEl = getEl("editarRutaId");
    const nombreEl = getEl("editarRutaNombre");
    const centralEl = getEl("editarRutaCentral");
    const moleculaEl = getEl("editarRutaMolecula");
    const notasEl = getEl("editarRutaNotas");
    const id = idEl?.value?.trim();
    if (!id) return;
    const nombre = nombreEl?.value?.trim() || "Sin nombre";
    const central = centralEl?.value?.trim() || "";
    const molecula = moleculaEl?.value?.trim() || "";
    const notas = notasEl?.value?.trim() || "";

    if (!central || !molecula) {
      App?.ui?.notify?.("⚠️ Seleccione Central y Molécula.");
      return;
    }

    const rutas = window.__rutasListCache__ || [];
    const ruta = rutas.find((r) => r.id === id);
    if (!ruta) {
      App?.ui?.notify?.("⚠️ Ruta no encontrada.");
      return;
    }

    const payload = {
      nombre,
      tipo: ruta.tipo || "",
      central,
      molecula,
      notas,
      distancia: Number(ruta.distancia) || 0,
      geojson: ruta.geojson || ""
    };

    window.FTTH_FIREBASE.actualizarRuta(id, payload)
      .then(() => {
        App?.ui?.notify?.("✅ Ruta actualizada");
        closeEditModal();
      })
      .catch((err) => {
        console.error("Error actualizando ruta:", err);
        App?.ui?.notify?.("⚠️ No se pudo actualizar");
      });
  }

  function init() {
    const btnOpen = getEl("btnGestionarRutas");
    const btnClose = getEl("btnCloseRutasPanel");
    const btnNueva = getEl("btnNuevaRutaFromPanel");
    const editarCentral = getEl("editarRutaCentral");
    const btnSaveEdit = getEl("btnSaveEditarRuta");
    const btnCancelEdit = getEl("btnCancelEditarRuta");
    const closeEditBtn = getEl("closeEditarRutaModal");

    if (btnOpen) {
      btnOpen.addEventListener("click", () => {
        openPanel();
        if (window.FTTH_FIREBASE?.escucharRutas) {
          if (unsubscribeRutas) unsubscribeRutas();
          unsubscribeRutas = window.FTTH_FIREBASE.escucharRutas((rutas) => {
            window.__rutasListCache__ = rutas;
            renderList(rutas);
          });
        } else {
          renderList([]);
        }
      });
    }
    if (btnClose) btnClose.addEventListener("click", closePanel);
    if (btnNueva) {
      btnNueva.addEventListener("click", () => {
        closePanel();
        if (App?.tools?.rutas) {
          window.dispatchEvent(new CustomEvent("ftth-switch-tool", { detail: { tool: "ruta" } }));
        }
      });
    }
    if (editarCentral) editarCentral.addEventListener("change", populateEditarMoleculas);
    if (btnSaveEdit) btnSaveEdit.addEventListener("click", saveEditModal);
    if (btnCancelEdit) btnCancelEdit.addEventListener("click", closeEditModal);
    if (closeEditBtn) closeEditBtn.addEventListener("click", closeEditModal);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
export {};
