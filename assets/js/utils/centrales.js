/* =========================================================
   FlashFiber FTTH | centrales.js
   Constantes y utilidades compartidas para centrales/moléculas
   Usado por: tool.cierres.js, tool.eventos.js
========================================================= */

(function () {
  "use strict";

  var CENTRAL_PREFIX = {
    BACHUE: "BA",
    CHICO: "CO",
    CUNI: "CU",
    FONTIBON: "FO",
    GUAYMARAL: "GU",
    HOLANDA: "HO",
    MUZU: "MU",
    SANTA_INES: "SI",
    SUBA: "SU",
    TOBERIN: "TO"
  };

  /** Número de moléculas por central (CO01..CO40 = 40; CUNI CU01..CU45 = 45; resto MOLECULAS_DEFAULT_COUNT). */
  var CENTRAL_MOLECULA_COUNT = { CO: 40, CU: 45 };
  var MOLECULAS_DEFAULT_COUNT = 30;

  /**
   * Genera lista de moléculas para una central (ej: SI01..SI30, CO01..CO40).
   * @param {string} prefijo - Prefijo de central (BA, CO, SI, etc.)
   * @returns {string[]}
   */
  function generarMoleculas(prefijo) {
    if (!prefijo || typeof prefijo !== "string") return [];
    var length = CENTRAL_MOLECULA_COUNT[prefijo] || MOLECULAS_DEFAULT_COUNT;
    return Array.from({ length: length }, function (_, i) {
      return prefijo + String(i + 1).padStart(2, "0");
    });
  }

  window.__FTTH_CENTRALES__ = {
    CENTRAL_PREFIX: CENTRAL_PREFIX,
    generarMoleculas: generarMoleculas
  };
})();
export {};
