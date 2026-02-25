# Estándar de centrales – Diferencias identificadas

Revisión del proyecto para unificar el comportamiento: **todas las centrales deben tratarse igual** salvo donde existan requisitos de datos o negocio explícitos. A continuación se enumeran las diferencias encontradas.

---

## 1. Carga de datos y capas en el mapa

| # | Diferencia | Dónde | Descripción |
|---|------------|--------|-------------|
| **1.1** | **MUZU tiene capa y fuente propias** | `mapa.layers.js` | MUZU se carga desde `../geojson/MUZU/muzu.geojson` con `loadMuzuLayer()`, crea source `muzu-src` y layer `muzu-lines`. El resto de centrales (Santa Inés, CHICO, CUNI, etc.) van en el GeoJSON consolidado (`geojson-lines` / `geojson-points`). |
| **1.2** | **MUZU no está en el árbol FTTH** | `geojson/FTTH/index.json` | El índice FTTH tiene: Santa Inés, Cuni, Holanda, Bachue, Fontibón, Chico, Suba, Toberín, Guaymaral. **No** hay carpeta MUZU; MUZU se carga aparte. |
| **1.3** | **Carga inicial del mapa** | `mapa.init.js` | Tras `loadConsolidatedGeoJSONToBaseMap()` se llama solo `loadMuzuLayer()`. Ninguna otra central tiene un loader adicional. |

---

## 2. Buscador (índice de cables y selección)

| # | Diferencia | Dónde | Descripción |
|---|------------|--------|-------------|
| **2.1** | **Cables MUZU se cargan aparte** | `ui.buscador.js` | `loadCables()` recorre el árbol FTTH; luego `loadCablesMuzu()` hace un fetch a `../geojson/MUZU/muzu.geojson` y agrega cables con `layerId: name`, `isMuzu: true`. El resto de centrales salen solo del árbol (o de `cables-index.json` si existiera). |
| **2.2** | **Rama específica al seleccionar cable MUZU** | `ui.buscador.js` | En `selectResult` hay tres ramas: `result.isMuzu` (filtrar `muzu-lines` por nombre del cable), `isCorporativo` (CABLES_KML), y **else** (FTTH: filtrar `geojson-lines` por `_molecula`). Solo MUZU usa la primera. |
| **2.3** | **Referencia a chico-lines** | `ui.layers.tree.js` | `extractMoleculaFromCableLayerId` devuelve `null` para `"chico-lines"` (capa ya eliminada). Código muerto. |
| **2.4** | **Detección de cable en el árbol** | `ui.buscador.js` (walkTreeForCables) | `isCable` usa entre otros `idLower.match(/si\d+fh\d+/i)` (patrón explícito Santa Inés). Otras centrales se detectan por path "cable" o `typeLayer === "line"`. |

---

## 3. Árbol de capas (panel Capas)

| # | Diferencia | Dónde | Descripción |
|---|------------|--------|-------------|
| **3.1** | **Etiqueta solo para MUZU** | `ui.layers.tree.js` | En “Capas consolidadas” solo se asigna nombre amigable a `muzu-lines`: "🧵 MUZU (cables)". El resto son "geojson-lines", "geojson-points", etc. |
| **3.2** | **Pines al activar cable** | `ui.layers.tree.js` | `showPinsWhenCableActivated(layerId, (layerId === "muzu-lines" \|\| layerId === "chico-lines") ? null : undefined)`. Para MUZU (y antes CHICO) se pasa `null` como molécula; para el resto se usa `extractMoleculaFromCableLayerId(layerId)`. |

---

## 4. Santa Inés (zoom y centro inicial)

| # | Diferencia | Dónde | Descripción |
|---|------------|--------|-------------|
| **4.1** | **Centro inicial del mapa** | `mapa.init.js` | `center: [-74.088195, 4.562537]` comentado como "Central Santa Inés". Todas las vistas FTTH arrancan centradas en Santa Inés. |
| **4.2** | **Zoom automático a Santa Inés** | `mapa.layers.js` | `zoomToSantaInes()` se llama: al cargar la primera capa “importante”, cuando el id de capa incluye `"SANTA_INES"` o `"FTTH_SANTA_INES"`, y tras cargar centrales (primera vez). Ninguna otra central tiene zoom automático. |

---

## 5. Datos y convenciones por central

| # | Diferencia | Dónde | Descripción |
|---|------------|--------|-------------|
| **5.1** | **Número de moléculas** | `centrales.js` | `CENTRAL_MOLECULA_COUNT = { CO: 40 }`; el resto usan `MOLECULAS_DEFAULT_COUNT = 30`. Solo Chicó (prefijo CO) tiene 40 moléculas (CO01..CO40). |
| **5.2** | **Normalización de nombres de cable** | `ui.buscador.js`, `ui.layers.tree.js` | CUNI: `normalizeCuniCableName` (CUO6→CU06). Bachue: reemplazo BAO→BA0 en `shortCableDisplayName` y en etiquetas del árbol. Otras centrales no tienen normalización específica. |
| **5.3** | **Colores por cable (solo MUZU)** | `mapa.layers.js` | MUZU usa `MUZU_LINE_PALETTE` y asigna un color por cable. La capa consolidada `geojson-lines` no diferencia color por central/cable. |

---

## 6. Resumen por tipo

- **Comportamiento distinto (candidatos a unificar)**  
  - **1.1, 1.2, 1.3**: MUZU como única central con capa/loader propio.  
  - **2.1, 2.2**: Carga y selección de cables MUZU separadas del flujo FTTH.  
  - **3.1, 3.2**: Trato especial de `muzu-lines` (y referencia a `chico-lines`) en el árbol.  
  - **4.1, 4.2**: Centro y zoom inicial fijados a Santa Inés.

- **Datos/configuración (aceptables si son requisito)**  
  - **5.1**: 40 moléculas para CO (Chicó).  
  - **5.2**: Normalización CUNI/Bachue (O→0 en códigos).  
  - **5.3**: Colores por cable en MUZU (podría extenderse a consolidado si se desea).

- **Limpieza**  
  - **2.3**: Quitar referencia a `chico-lines` en `extractMoleculaFromCableLayerId` y en `showPinsWhenCableActivated`.

---

## 7. Recomendaciones para un solo comportamiento

1. **MUZU**: Decidir si MUZU debe ser “una central más” del árbol FTTH (p. ej. `geojson/FTTH/MUZU/` con misma estructura que CHICO/Santa Inés) y eliminar `loadMuzuLayer`, `loadCablesMuzu`, fuente `muzu-src` y capa `muzu-lines`; o documentar por qué MUZU es excepción y mantener un único punto de “excepciones” en el código.
2. **Santa Inés**: Si el estándar es “sin zoom automático por central”, eliminar `zoomToSantaInes()` y usar un centro/zoom genérico o configurables; si se mantiene, documentar que es la central de referencia inicial.
3. **Buscador**: Un solo flujo de “cable seleccionado”: un único filtro sobre `geojson-lines` (por `_molecula` o por cable) para todas las centrales FTTH, sin rama `isMuzu`.
4. **Árbol de capas**: No tratar por nombre `muzu-lines` ni `chico-lines`; usar solo IDs genéricos (`geojson-lines`, etc.) o derivar comportamiento del tipo de capa y de metadatos (p. ej. `_molecula` / central).
5. **Normalización de nombres**: Centralizar en un solo módulo (p. ej. `centrales.js` o `formatters.js`) las reglas CU/BA (O→0) y reutilizarlas en buscador y árbol.

Con esto se tiene un estándar único para todas las centrales y las excepciones quedan explícitas y documentadas.
