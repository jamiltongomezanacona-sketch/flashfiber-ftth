# Verificación GeoJSON FTTH – Centrales y moléculas

Generado con `node scripts/verificar_geojson_ftth.js`

## Enumeración de las que NO son iguales (formato distinto o errores)

Estas centrales/moléculas **no cumplen** el mismo formato que el resto y pueden no funcionar igual en mapa y buscador:

| Tipo | Central | Molécula | Detalle |
|------|---------|----------|---------|
| **Estructura distinta** | BACHUE | BA01 | `cables/index.json` usa `url` y `label: "index"` en vez de `path`, `id` FTTH_… y archivos `.geojson`. Contiene referencia a SI01FH144 (Santa Inés). |
| **Nombre con typo** | CHICO | CO16 | ~~Corregido: era `CO16FH1444`, ahora `CO16FH144`.~~ |

El resto de incidencias son **moléculas que en el índice tienen carpeta "Cables" pero no existe la carpeta física `cables/`** (solo tienen cierres o aún no tienen cables). Eso es esperable en muchas moléculas; no impide que el mapa funcione para las que sí tienen cables.

---

## Estándar esperado

- **Central index.json**: `label`, `children[]` con `id`, `label`, `type: "folder"`, `index: "MOL/index.json"`.
- **Molécula index.json**: `label` (ej. CO36), `children[]` con `type: "folder"`, `label: "Cables"|"Cierres"`, `index: "cables/index.json"`.
- **Cables index.json**: `children[]` con `type: "layer"`, `id: "FTTH_CENTRAL_MOL_CABLENAME"`, `path: "*.geojson"`, `typeLayer: "line"`.
- **GeoJSON de cable**: `features[].properties`: `name`, `molecula`, `central`.

## Incidencias (no cumplen el estándar)

### mol_sin_carpeta_cables

- {"tipo":"mol_sin_carpeta_cables","central":"CUNI","molecula":"CU01"}
- {"tipo":"mol_sin_carpeta_cables","central":"CUNI","molecula":"CU02"}
- {"tipo":"mol_sin_carpeta_cables","central":"CUNI","molecula":"CU04"}
- {"tipo":"mol_sin_carpeta_cables","central":"CUNI","molecula":"CU07"}
- {"tipo":"mol_sin_carpeta_cables","central":"CUNI","molecula":"CU22"}
- {"tipo":"mol_sin_carpeta_cables","central":"HOLANDA","molecula":"HO15"}
- {"tipo":"mol_sin_carpeta_cables","central":"HOLANDA","molecula":"HO16"}
- {"tipo":"mol_sin_carpeta_cables","central":"HOLANDA","molecula":"HO17"}
- {"tipo":"mol_sin_carpeta_cables","central":"HOLANDA","molecula":"HO25"}
- {"tipo":"mol_sin_carpeta_cables","central":"HOLANDA","molecula":"HO27"}
- {"tipo":"mol_sin_carpeta_cables","central":"HOLANDA","molecula":"HO28"}
- {"tipo":"mol_sin_carpeta_cables","central":"HOLANDA","molecula":"HO29"}
- {"tipo":"mol_sin_carpeta_cables","central":"HOLANDA","molecula":"HO30"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO01"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO02"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO03"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO04"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO06"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO09"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO10"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO13"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO14"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO15"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO17"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO19"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO21"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO22"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO26"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO27"}
- {"tipo":"mol_sin_carpeta_cables","central":"FONTIBON","molecula":"FO28"}
- ... y 127 más.

### cables_index_estructura_distinta

- {"tipo":"cables_index_estructura_distinta","central":"BACHUE","molecula":"BA01","detalle":"usa 'url' en vez de 'path', o sin .geojson"}

### cable_id_formato

- {"tipo":"cable_id_formato","central":"BACHUE","molecula":"BA01"}
- {"tipo":"cable_id_formato","central":"BACHUE","molecula":"BA01"}

### cable_path_sin_geojson

- {"tipo":"cable_path_sin_geojson","central":"BACHUE","molecula":"BA01"}
- {"tipo":"cable_path_sin_geojson","central":"BACHUE","molecula":"BA01"}

### cable_nombre_typo

- {"tipo":"cable_nombre_typo","central":"CHICO","molecula":"CO16","label":"CO16FH1444","esperado":"FH144 o FH48"}

## Resumen

- **Total incidencias:** 163
- **Tipos de incidencia:** 5