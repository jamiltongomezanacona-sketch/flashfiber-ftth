# ¿Es profesional la estructura de `geojson/`?

Evaluación breve: qué está bien y qué falta para un estándar más profesional.

---

## Lo que ya es profesional (o va bien encaminado)

| Aspecto | Estado |
|--------|--------|
| **Jerarquía clara** | Raíz → FTTH / CORPORATIVO; dentro de FTTH una carpeta por central (SANTA_INES, CHICO, etc.) y por molécula (SI01, CO02…). Fácil de entender y de mantener. |
| **Índices por carpeta** | Cada nivel tiene su `index.json`; el árbol se recorre de forma predecible. Patrón habitual en proyectos GIS. |
| **Una fuente por dominio** | FTTH concentra todo el FTTH; CORPORATIVO y CABLES tienen roles definidos. Legacy (CHICO raíz, MUZU raíz, PLANTILLA) ya se limpió. |
| **Convención de nombres** | Mayoría de cables sigue MOLnnFHnnn (SI01FH48, CO16FH144). Se corrigieron typos y O→0. |
| **Consolidado opcional** | `consolidado-ftth.geojson` como caché pregenerada es una buena práctica de rendimiento. |
| **Documentación** | Existen `GEOJSON_VERIFICACION_ENCARPETADO.md` y `GEOJSON_RAIZ_USO.md`; los problemas están identificados y muchos corregidos. |

En conjunto, la estructura **sí es usable y razonablemente profesional**: se entiende, se puede mantener y encaja con el resto del proyecto.

---

## Lo que aún no es del todo profesional

| Aspecto | Detalle | Prioridad |
|--------|---------|-----------|
| **Nombres de archivos** | Algunos cables con nombres descriptivos (`TENDIDO_DE_1000_MTS.geojson`, `L_nea_sin_t_tulo.geojson`, `CAMBIO_DE_CABLE.geojson`) en lugar de código MOLnnFHnnn. Dificultan búsqueda y scripts. | Media |
| **Sufijos en cables** | Mezcla de guión y guión bajo (`HO23FH144-2` vs `HO18FH144_1`). Conviene unificar (p. ej. siempre `_`). | Baja |
| **Formato de índices** | Algunos JSON compactos, otros con saltos de línea; orden de claves distinto. No rompe nada, pero unificar (2 espacios, mismo orden: `id`, `label`, `type`, `index`) daría más consistencia. | Baja |
| **Carpeta CABLES en raíz** | `geojson/CABLES/` está al mismo nivel que FTTH y CORPORATIVO; conceptualmente es “cables corporativos”. No es error, pero documentar su propósito en un README en `geojson/` evita dudas. | Baja |
| **Scripts legacy** | `kml_to_geojson_chico.py` y `kml_to_geojson_muzu.py` escriben a rutas que ya no existen (CHICO, MUZU en raíz). Actualizarlos o marcarlos como legacy. | Baja |
| **README en geojson/** | No hay un README que explique la estructura, convenciones y cómo generar consolidado/índice. Sería el toque final “profesional”. | Media |

---

## Resumen

- **¿Está bien así?** Sí: la estructura es clara, coherente y mantenible; no es un “desastre” ni poco profesional.
- **¿Es “de libro”?** Casi: le falta pulir convenciones (nombres de archivos, sufijos, formato JSON) y documentación en la propia carpeta (`geojson/README.md`).

Recomendación: **usar la estructura actual con tranquilidad** e ir aplicando las mejoras de la tabla anterior cuando toque tocar esos archivos o cuando quieras subir un poco más el nivel de estándar.
