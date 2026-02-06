/* =========================================================
   FlashFiber FTTH | centrales.js
   Constantes y utilidades compartidas para centrales/moléculas
   Usado por: tool.cierres.js, tool.eventos.js
========================================================= */

(function () {
  "use strict";

  var CENTRAL_PREFIX = {
    BACHUE: "BA",
    CHICO: "CH",
    CUNI: "CU",
    FONTIBON: "FO",
    GUAYMARAL: "GU",
    HOLANDA: "HO",
    MUZU: "MU",
    SANTA_INES: "SI",
    SUBA: "SU",
    TOBERIN: "TO"
  };

  /**
   * Genera lista de moléculas para una central (ej: SI01..SI30).
   * @param {string} prefijo - Prefijo de central (BA, CH, SI, etc.)
   * @returns {string[]}
   */
  function generarMoleculas(prefijo) {
    if (!prefijo || typeof prefijo !== "string") return [];
    return Array.from({ length: 30 }, function (_, i) {
      return prefijo + String(i + 1).padStart(2, "0");
    });
  }

  window.__FTTH_CENTRALES__ = {
    CENTRAL_PREFIX: CENTRAL_PREFIX,
    generarMoleculas: generarMoleculas
  };
})();
