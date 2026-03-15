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

  /** Número de moléculas por central (CO01..CO40 = 40; CUNI CU01..CU45 = 45; Muzú MU01..MU45 = 45; resto MOLECULAS_DEFAULT_COUNT). */
  var CENTRAL_MOLECULA_COUNT = { CO: 40, CU: 45, MU: 45 };
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

  /**
   * Normaliza un código de molécula para comparaciones y filtros en todo el proyecto.
   * Formato estándar: 2 letras + dígitos, en mayúsculas (ej. SI03, CO36).
   * @param {string|null|undefined} mol - Valor de molécula (puede venir en cualquier capitalización).
   * @returns {string} Código normalizado en mayúsculas o "" si no es válido.
   */
  function normalizeMolecula(mol) {
    if (mol == null || typeof mol !== "string") return "";
    var s = String(mol).trim();
    if (s === "") return "";
    return s.toUpperCase();
  }

  /** Coordenadas [lng, lat] de cada central (para calcular distancia pin → central). Origen: centrales-etb.geojson */
  var CENTRAL_COORDS = {
    BACHUE: [-74.113013, 4.711564],
    CHICO: [-74.053421, 4.674773],
    CUNI: [-74.087926, 4.62991],
    FONTIBON: [-74.144039, 4.673819],
    GUAYMARAL: [-74.035133, 4.812858],
    HOLANDA: [-74.184633, 4.629427],
    MUZU: [-74.133859, 4.594729],
    SANTA_INES: [-74.088195, 4.562537],
    SUBA: [-74.113456, 4.663407],
    TOBERIN: [-74.04542, 4.750089]
  };

  /**
   * Distancia en línea recta desde un punto [lng, lat] hasta la central (en km). Requiere Turf en window.
   * @param {number} lng - Longitud del pin
   * @param {number} lat - Latitud del pin
   * @param {string} centralKey - Clave de central (ej: SANTA_INES, CHICO)
   * @returns {string} Ej: "1.25 km" o "—" si no hay central o Turf
   */
  function distanciaDesdeCentral(lng, lat, centralKey) {
    if (lng == null || lat == null || !centralKey || typeof centralKey !== "string") return "—";
    var coords = CENTRAL_COORDS[centralKey.toUpperCase().replace(/\s/g, "_")];
    if (!coords || !Array.isArray(coords) || coords.length < 2) return "—";
    if (typeof window.turf !== "undefined" && window.turf.distance) {
      var from = window.turf.point([Number(lng), Number(lat)]);
      var to = window.turf.point(coords);
      var km = window.turf.distance(from, to, { units: "kilometers" });
      if (km < 1) return (km * 1000).toFixed(0) + " m";
      return km.toFixed(2) + " km";
    }
    return "—";
  }

  window.__FTTH_CENTRALES__ = {
    CENTRAL_PREFIX: CENTRAL_PREFIX,
    CENTRAL_COORDS: CENTRAL_COORDS,
    generarMoleculas: generarMoleculas,
    normalizeMolecula: normalizeMolecula,
    distanciaDesdeCentral: distanciaDesdeCentral
  };
})();
// Compatibilidad ESM para el bundler (entry-ftth.js); la API real está en window.__FTTH_CENTRALES__
export {};
