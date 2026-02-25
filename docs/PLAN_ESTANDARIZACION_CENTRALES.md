# Plan para estandarizar un solo método en el proyecto

Todas las centrales deben comportarse igual: **una sola fuente de datos (GeoJSON consolidado)**, **una sola capa de cables (geojson-lines)** y **un solo flujo en buscador y árbol de capas**.

---

## Qué debes hacer (resumen)

1. **Carga en mapa**: Todas las centrales (incluida MUZU) se cargan en el **GeoJSON consolidado** y se dibujan en **geojson-lines** / **geojson-points**. No hay capas propias por central (muzu-lines, chico-lines, etc.).
2. **Buscador**: Todos los cables se indexan igual; al seleccionar uno se aplica el **mismo filtro** (geojson-lines por `_molecula`). No hay ramas `isMuzu` ni `isChico`.
3. **Árbol de capas**: Solo se usan las capas consolidadas (geojson-lines, geojson-points). No hay etiquetas ni lógica especial por nombre de central.
4. **Santa Inés**: El centro/zoom inicial puede dejarse como “central de referencia” o hacerse configurable más adelante; no afecta al estándar de “un método por central”.

---

## Cambios ya aplicados en el código

- **MUZU integrado en el consolidado** (`mapa.layers.js`): En `consolidateAllGeoJSON()` se hace fetch de `muzu.geojson` y se añaden sus cables a `allFeatures` con `_molecula`, `_layerId`, `__id` (mismo formato que el resto). MUZU deja de tener capa `muzu-lines`.
- **Eliminado loadMuzuLayer** (`mapa.layers.js`, `mapa.init.js`): Ya no existe capa ni fuente propia de MUZU.
- **Buscador unificado** (`ui.buscador.js`): `loadCablesMuzu()` sigue cargando los cables de MUZU para el índice, pero con `layerId: "geojson-lines"` y sin `isMuzu`. Eliminada la rama `result.isMuzu` en `selectResult`; MUZU usa el mismo flujo FTTH (filtro por `_molecula`).
- **Árbol de capas** (`ui.layers.tree.js`): Quitadas las referencias a `muzu-lines` y `chico-lines` en etiquetas, en `extractMoleculaFromCableLayerId` y en `showPinsWhenCableActivated`.

---

## Comportamiento estándar resultante

| Acción | Comportamiento (todas las centrales) |
|--------|--------------------------------------|
| Carga del mapa | `loadConsolidatedGeoJSONToBaseMap()` → árbol FTTH + MUZU en un solo GeoJSON → capas `geojson-lines`, `geojson-points`. |
| Índice de búsqueda | Cables del árbol (walkTreeForCables) + cables MUZU (loadCablesMuzu con `layerId: "geojson-lines"`). |
| Seleccionar cable | `enforceOnlyCentralesVisible` + filtro en `geojson-lines` por `_molecula` + `setSelectedMoleculaForPins(mol, { keepCablesVisible: true })`. |
| Pines (cierres/eventos) | Filtro por `molecula` en capas de cierres/eventos y en `geojson-points` por `_molecula`. |
| Árbol de capas | Solo capas consolidadas; al activar cable se usa `showPinsWhenCableActivated(layerId, undefined)` y se obtiene la molécula de `extractMoleculaFromCableLayerId` cuando aplique. |

---

## Opcional (no aplicado aún)

- **Santa Inés**: Hacer centro/zoom inicial configurables (p. ej. en `config.js` o por primera central del listado) en lugar de fijarlos a Santa Inés.
- **Normalización de nombres**: Llevar CUNI/Bachue (CUO6→CU06, BAO→BA0) a un único módulo (p. ej. `utils/formatters.js` o `centrales.js`) y reutilizarlo en buscador y árbol.
- **Colores por cable**: Si se quieren colores distintos por cable como en MUZU, se puede añadir una propiedad `color` al consolidado y usar pintado por dato en `geojson-lines`.

---

## Cómo comprobar que todo va con un solo método

1. Abrir el mapa FTTH y comprobar que los cables de MUZU aparecen al filtrar por molécula (p. ej. MU05) igual que Santa Inés o Chicó.
2. Buscar un cable MUZU por nombre: debe aplicar el mismo flujo que cualquier otro cable (geojson-lines filtrado por `_molecula`, sin capa muzu-lines).
3. En el árbol de capas no debe existir entrada “MUZU (cables)”; solo “Cables (Consolidado)” (geojson-lines).
4. Al cambiar de central/molécula, no debe quedar ninguna capa “suelta” (CO36, MUZU, etc.); solo la vista consolidada filtrada.

Con esto el proyecto queda con **un solo método** para todas las centrales.
