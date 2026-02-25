# Uso de archivos y carpetas en `geojson/` (raíz)

---

## Función de la carpeta FTTH y de consolidado-ftth.geojson

### Carpeta `geojson/FTTH/`

Es la **fuente de datos principal** del mapa FTTH. Cumple dos funciones:

1. **Árbol de capas (panel de capas)**  
   El mapa lee `geojson/index.json` → `FTTH/index.json` y recorre todos los `index.json` (Santa Inés, Cuni, Chico, cada molécula, cables, cierres, etc.). Con eso construye el **árbol** que ves en el panel: central → molécula → Cables / Cierres / Rutas, etc. Cada nodo “capa” apunta a un `.geojson` dentro de FTTH (p. ej. `FTTH/SANTA_INES/SI01/cables/SI01FH48.geojson`). Al marcar/desmarcar una capa, el mapa muestra u oculta ese archivo.

2. **Origen del consolidado**  
   Cuando el mapa arranca, necesita **una sola capa** con todos los cables y cierres E1/E0 para dibujarlos. Para eso:
   - **Si existe** `geojson/consolidado-ftth.geojson` → lo carga y lo usa.
   - **Si no existe** → recorre el mismo árbol FTTH (leyendo los mismos `index.json` y archivos `.geojson` de cables y cierres), junta todos los features en memoria y genera el consolidado en tiempo de ejecución (`consolidateAllGeoJSON()` en `mapa.layers.js`).

En resumen: **FTTH** es la estructura (índices + archivos) que define qué capas hay y qué datos tienen; el **consolidado** es “todo ese contenido de cables y cierres E1/E0 en un solo GeoJSON” para pintar el mapa de una vez.

### Archivo `geojson/consolidado-ftth.geojson`

- **Función:** Es un **GeoJSON pregenerado** que contiene ya unidos:
  - Todos los **cables** de todas las centrales/moléculas del árbol FTTH.
  - Todos los **cierres** tipo E1 y E0 por corte de ese mismo árbol.
  - Los cables de **MUZU** (desde `FTTH/MUZU/muzu.geojson`).

- **Quién lo usa:**  
  `mapa.layers.js` intenta primero cargar `consolidado-ftth.geojson`. Si el archivo existe y es válido, lo usa y **no** recorre todo el árbol FTTH para consolidar (más rápido). Si no existe o falla, hace el fallback: recorre el árbol FTTH y construye el mismo consolidado en memoria.

- **Cómo se genera:**  
  Ejecutando en la raíz del proyecto:
  ```bash
  node scripts/build-consolidado-geojson.js
  ```
  Ese script replica la lógica de `consolidateAllGeoJSON()` y escribe `geojson/consolidado-ftth.geojson`.

**Resumen:** La carpeta **FTTH** define la estructura y los datos (árbol + archivos). El **consolidado-ftth.geojson** es una copia pre-calculada de “todos los cables y cierres E1/E0” para cargar el mapa más rápido cuando exista el archivo.

---

# Uso de archivos y carpetas en `geojson/` (raíz)

## ✅ Necesarios (la app los usa)

| Carpeta / archivo | Uso |
|-------------------|-----|
| **FTTH/** | Árbol de centrales, moléculas, cables y cierres. Carga principal del mapa y del buscador. |
| **CORPORATIVO/** | Capa "Centrales ETB" y datos corporativos. |
| **CABLES/** | `CABLES/cables.geojson` — buscador y herramienta de eventos. |
| **index.json** | Índice raíz del mapa principal (FTTH + CORPORATIVO). |
| **index-corporativo.json** | Índice para la vista mapa corporativo (CABLES + CORPORATIVO). |
| **cables-index.json** | Índice de cables para el buscador (generado por `scripts/build-cables-index.js`). |
| **consolidado-ftth.geojson** | Consolidado opcional del mapa (si existe; si no, se construye en memoria). Generado por `scripts/build-consolidado-geojson.js`. |

## ❌ No necesarios / inexistentes

| Referencia | Motivo |
|------------|--------|
| **FTTH_COMPLETO.geojson** | Lo usa `mapa.ftth.js` pero **el archivo no existe** en el repo. Ese script añade una capa que queda sin datos. Se puede hacer que use `consolidado-ftth.geojson` o quitar la capa si no se usa. |

## Resumen

**No hay más carpetas ni archivos en `geojson/` que se puedan borrar**: todo lo que está (FTTH, CORPORATIVO, CABLES, index.json, index-corporativo.json, cables-index.json, consolidado-ftth.geojson) lo usa la app o los scripts de build.

Lo único “sobrante” es la **referencia** en código a `FTTH_COMPLETO.geojson`, que no existe. Opciones: apuntar esa capa a `consolidado-ftth.geojson` o eliminar esa carga si la capa no se usa.
