# Verificación carpeta `geojson` – Errores de encarpetado y malas prácticas

Revisión de la estructura, índices y convenciones de nombres. Errores enumerados para corrección.

---

## 1. Estructura duplicada o inconsistente

| # | Error | Ubicación | Descripción |
|---|--------|-----------|-------------|
| **1.1** | **CHICO en dos raíces** | `geojson/CHICO/` y `geojson/FTTH/CHICO/` | Existe carpeta `geojson/CHICO/` (con CHICO.kml, chico.geojson) y además `geojson/FTTH/CHICO/`. La app usa solo FTTH; la raíz `geojson/CHICO/` es legacy y genera confusión. |
| **1.2** | **MUZU en dos ubicaciones** | `geojson/MUZU/muzu.geojson` y `geojson/FTTH/MUZU/` | MUZU tiene un archivo único `geojson/MUZU/muzu.geojson` (usado por el consolidado) y también carpeta `geojson/FTTH/MUZU/` con MU01, MU02, … (índices por molécula). El índice raíz `geojson/FTTH/index.json` **no incluye MUZU**; la app no recorre FTTH/MUZU. Doble fuente de datos y carpeta FTTH/MUZU no referenciada. |
| **1.3** | **Carpeta plantilla dentro de FTTH** | `geojson/FTTH/PLANTILLA_FTTH/` | Carpeta `PLANTILLA_FTTH` con `cierres/_base.geojson` (vacío) está dentro de FTTH pero **no está en** `FTTH/index.json`. No se carga en el árbol; es ruido o documentación que no debería estar como si fuera una central más. |

---

## 2. Índices incompletos o desalineados con el disco

| # | Error | Ubicación | Descripción |
|---|--------|-----------|-------------|
| **2.1** | **CHICO: índice solo CO01–CO30** | `geojson/FTTH/CHICO/index.json` | El `index.json` lista solo CO01..CO30. En disco existen carpetas CO31..CO43 (o más). Las moléculas CO31+ **no aparecen en el árbol** ni se consolidan por índice; solo se cargarían si hubiera otra ruta. |
| **2.2** | **GUAYMARAL: índice solo GU01–GU10** | `geojson/FTTH/GUAYMARAL/index.json` | El índice tiene 10 moléculas (GU01..GU10). En disco hay más (p. ej. GU11, GU17, GU23, GU24, GU28). Las que no están en el índice no se cargan por el árbol. |
| **2.3** | **MUZU no está en el índice FTTH** | `geojson/FTTH/index.json` | El índice raíz FTTH tiene: Santa Inés, Cuni, Holanda, Bachue, Fontibón, Chico, Suba, Toberín, Guaymaral. **No** incluye MUZU, aunque existe `geojson/FTTH/MUZU/` con su propio index. La app carga MUZU desde `geojson/MUZU/muzu.geojson`, no desde el árbol FTTH. |

---

## 3. Formato de índices inconsistente entre centrales

| # | Error | Ubicación | Descripción |
|---|--------|-----------|-------------|
| **3.1** | **Estructura de hijos distinta** | SANTA_INES vs CHICO/BACHUE/CUNI | En `FTTH/SANTA_INES/index.json` los hijos son `{"type":"folder","label":"SI01","index":"SI01/index.json"}` (sin campo `id`). En CHICO, BACHUE, CUNI, GUAYMARAL, MUZU los hijos tienen `"id":"CO01","label":"CO01",...`. Un mismo nivel del árbol debería usar la misma estructura (recomendable: siempre `id` + `label` + `type` + `index`). |
| **3.2** | **Formato y espaciado** | CUNI vs otros | CUNI usa JSON con saltos de línea y espaciado; otros índices (p. ej. CHICO) van más compactos. Mejor unificar estilo (p. ej. 2 espacios, mismo orden de claves). |

---

## 4. Nombres de archivos y referencias incorrectas

| # | Error | Ubicación | Descripción |
|---|--------|-----------|-------------|
| **4.1** | **Cable con prefijo de otra central** | `geojson/FTTH/GUAYMARAL/GU01/cables/CU01FH144.geojson` | Archivo nombrado **CU01** (CUNI) dentro de **GU01** (Guaymaral). En properties el cable tiene `molecula: "GU01"`, `central: "GUAYMARAL"`. El nombre del archivo debería ser acorde (p. ej. GU01FH144 o el código real del cable). |
| **4.2** | **Índice CO02 apunta a cable CO04** | `geojson/FTTH/CHICO/CO02/cables/index.json` | La única capa de cables en CO02 tiene `"id":"FTTH_CHICO_CO02_CO04FH144"`, `"path":"CO04FH144.geojson"`. Es cable de molécula **CO04** dentro de carpeta **CO02**. Error de encarpetado o de índice. |
| **4.3** | **Typo en nombre de archivo** | `geojson/FTTH/CHICO/CO16/cables/` | El índice referencia `CO16FH1444.geojson` (cuatro “4”). Debería ser CO16FH144 salvo que el código de cable sea realmente FH1444. |
| **4.4** | **Letra O en lugar de cero (0)** | Varios | **BAO5FH144** (Bachue), **CUO6FH144** (Cuni), **T021FH48** (Toberín): nombres con “O” en lugar de “0”. Rompe convención MOLnnFHnnn y obliga a normalización en código. Debería ser BA05, CU06, TO21. |
| **4.5** | **Entrada duplicada en índice** | `geojson/FTTH/CHICO/CO05/cables/index.json` | Dos entradas con el mismo `"path": "CO05FH48.geojson"`. Duplicado en el índice. |
| **4.6** | **Nombres descriptivos en lugar de código** | SI24, SI19, FO16 | Archivos como `TENDIDO_DE_1000_MTS.geojson`, `CAMBIO_DE_CABLE.geojson`, `L_nea_sin_t_tulo.geojson` (y títulos con tildes sustituidas por `_`). No siguen el estándar MOLnnFHnnn; dificultan búsqueda y scripts. |
| **4.7** | **Guión vs guión bajo en sufijos** | Varios (HO23, HO18, etc.) | Unos cables usan `HO23FH144-2.geojson`, otros `HO18FH144_1.geojson`. Conviene unificar: o siempre `_` (HO18FH144_1) o siempre `-` (HO18FH144-1). |

---

## 5. Malas prácticas

| # | Error | Descripción |
|---|--------|-------------|
| **5.1** | **Carpetas sin referencia en índice** | Carpetas que existen en disco pero no están en el `index.json` de su central (CHICO CO31+, GUAYMARAL GU11+, etc.) no se cargan. O se actualizan los índices o se evita tener carpetas “huérfanas”. |
| **5.2** | **Dos fuentes de verdad para MUZU** | Tener `muzu.geojson` y además `FTTH/MUZU/` con índices por molécula genera duda sobre cuál es la fuente canónica. Recomendación: una sola (o solo archivo consolidado o solo árbol FTTH/MUZU). |
| **5.3** | **Plantilla dentro del árbol de datos** | `PLANTILLA_FTTH` dentro de `geojson/FTTH/` puede ser usada por scripts; si no está en el índice, debería estar fuera del árbol de datos (p. ej. `geojson/_plantillas/` o `docs/`) para no mezclar datos con plantillas. |
| **5.4** | **Nombres con caracteres problemáticos** | `L_nea_sin_t_tulo` (sustitución de í → _) indica origen con tildes o encoding incorrecto. Usar nombres ASCII sin tildes o normalizar (ej. `Linea_sin_titulo.geojson`). |
| **5.5** | **Centro inicial del mapa fijado a una central** | A nivel de app, el centro por defecto está en Santa Inés; no es error de carpeta geojson pero refuerza que una central sea “especial”. Documentar o hacer configurable. |

---

## 6. Correcciones ya aplicadas

- **2.1 CHICO**: Índice actualizado con CO31..CO41, CO43 (falta CO42 en disco).
- **2.2 GUAYMARAL**: Índice actualizado con GU11..GU40.
- **2.3 MUZU**: Añadido al `FTTH/index.json` para que el árbol incluya Muzú (la app sigue cargando cables desde `geojson/MUZU/muzu.geojson` en el consolidado).
- **4.3 CO16**: Archivo renombrado CO16FH1444 → CO16FH144; índice y property `name` corregidos.
- **4.5 CO05**: Entrada duplicada en `CO05/cables/index.json` eliminada.
- **3.1 SANTA_INES**: Añadido campo `id` a cada hijo del índice (mismo formato que CHICO/CUNI).
- **4.2 CO02**: Creado `CO02FH144.geojson` con molecula CO02; índice actualizado; eliminado CO04FH144.geojson de la carpeta CO02.
- **4.1 GU01**: Creado `GU01FH144.geojson` (name/molecula GU01); índice actualizado; eliminado CU01FH144.geojson.
- **4.4 O→0**: BAO5FH144 → BA05FH144 (BACHUE/BA05); CUO6FH144 → CU06FH144 (CUNI/CU06); T021FH48 → TO21FH48 (TOBERIN/TO21). Archivos e índices actualizados.
- **Limpieza legacy**: Eliminados `geojson/CHICO/` (chico.geojson, CHICO.kml) y `geojson/FTTH/PLANTILLA_FTTH/` (índice y _base.geojson). La app usa solo `geojson/FTTH/CHICO/`. **MUZU unificado**: `muzu.geojson` movido a `geojson/FTTH/MUZU/muzu.geojson`; eliminada carpeta `geojson/MUZU/`. **No eliminar**: `geojson/CABLES/`, `geojson/index.json`, `geojson/cables-index.json` — la app los referencia (buscador, consolidado, árbol).

---

## 7. Resumen de acciones recomendadas

1. **Unificar CHICO**: ✅ Hecho — eliminada carpeta legacy `geojson/CHICO/`; la app usa solo `geojson/FTTH/CHICO/`.
2. **Unificar MUZU**: O bien (a) se elimina `geojson/MUZU/muzu.geojson` y la app solo usa `geojson/FTTH/MUZU/` (añadiendo MUZU a `FTTH/index.json`), o (b) se elimina `geojson/FTTH/MUZU/` y solo se usa `muzu.geojson`. Evitar dos fuentes.
3. **Completar índices**: ✅ Hecho (CHICO CO31..CO43, GUAYMARAL GU11..GU40).
4. **Opcional: añadir MUZU al índice FTTH**: ✅ Hecho; MUZU aparece en el árbol FTTH.
5. **Corregir nombres de archivos**: CO16 ✅, CO02 ✅, GU01 ✅, BA05/CU06/TO21 (O→0) ✅.
6. **Estandarizar índices**: ✅ Hecho (SANTA_INES con `id`; duplicado CO05 quitado).
7. **Renombrar cables descriptivos**: Dar a TENDIDO_DE_1000_MTS, CAMBIO_DE_CABLE, L_nea_sin_t_tulo un código tipo MOLnnFHnnn o al menos un nombre sin tildes ni caracteres raros.
8. **PLANTILLA_FTTH**: ✅ Eliminada (carpeta e índices); no estaba en el árbol.

Con esto se tiene una lista clara de errores de encarpetado y malas prácticas para ir corrigiendo de forma ordenada.
