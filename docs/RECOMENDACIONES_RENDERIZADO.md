# Recomendaciones para mejorar el renderizado – Flash Fiber FTTH

Análisis del proyecto (mapa, UI, carga de datos) con sugerencias priorizadas para mejor rendimiento y fluidez.

---

## 1. Mapbox GL – Mapa

### 1.1 `preserveDrawingBuffer: true`
- **Situación:** Está activado siempre para exportar PNG/PDF en "Crear diseño de mapa".
- **Impacto:** Puede reducir FPS al mover/zoom porque el canvas se mantiene en un modo más costoso.
- **Recomendación:** Activar solo cuando se abra el panel de diseño (p. ej. `map.getCanvas().style.preserveDrawingBuffer = true` al abrir y `false` al cerrar), o usar una instancia de mapa secundaria solo para la exportación.

### 1.2 `promoteId` en fuentes GeoJSON
- **Situación:** Los sources (geojson-consolidado, cierres-layer, eventos-layer, muzu-src) no usan `promoteId`.
- **Impacto:** Con muchos features, Mapbox puede rendir mejor y manejar mejor el estado por feature si hay un id único.
- **Recomendación:** En `addSource`, si las features tienen `id` o un campo único (p. ej. `properties.id`), usar:
  ```js
  map.addSource("geojson-consolidado", {
    type: "geojson",
    data: consolidated,
    promoteId: "id"  // o la propiedad que sea única (ej. "name" en cables)
  });
  ```
  Aplicar igual en cierres, eventos y MUZU donde exista un identificador único.

### 1.3 Orden de capas y `beforeId` ✅ Hecho
- **Situación:** Las capas se añadían sin `beforeId`, quedando por encima de etiquetas del mapa base.
- **Recomendación:** Insertar capas de datos debajo de las etiquetas del estilo.
- **Estado:** En `mapa.layers.js`, `getBeforeIdForDataLayers(map)` obtiene el primer layer tipo "symbol" con "label" en el id del estilo; todas las capas de datos (geojson-lines/points/polygons, capas FTTH dinámicas, centrales, muzu-lines, y en `tool.cierres.js`/`tool.eventos.js` las capas de cierres y eventos) se añaden con ese `beforeId`. Expuesto en `App.getBeforeIdForDataLayers` para uso en otros módulos.

### 1.4 Suavizado de animaciones
- **Situación:** `flyTo` con duración 800 ms; no hay throttling explícito en `moveend`/`zoomend`.
- **Recomendación:** Mantener una sola animación de cámara a la vez (cancelar `flyTo` al iniciar otra, como ya se hace en el buscador). Si en el futuro se añaden más animaciones, centralizar en una cola para evitar solapamientos.

---

## 2. Carga inicial y datos

### 2.1 Consolidado GeoJSON ✅ Hecho
- **Situación:** `consolidateAllGeoJSON()` hacía muchos `fetch` (uno por cable/archivo del árbol).
- **Recomendación:** Pre-generar consolidado y cargar un solo JSON.
- **Estado:** Script `scripts/build-consolidado-geojson.js` genera `geojson/consolidado-ftth.geojson`. En `mapa.layers.js`, `loadConsolidatedGeoJSONToBaseMap()` intenta primero cargar ese archivo; si existe y es válido se usa (un solo fetch). Si no, se hace fallback a `consolidateAllGeoJSON()`.

### 2.2 Secuencia de tiempo al cargar ✅ Hecho
- **Situación:** Varios `setTimeout` encadenados (500 ms centrales, 600 ms consolidado, 900 ms MUZU, 150 ms enforce).
- **Recomendación:** Sustituir por una cola explícita o por `map.once("idle", ...)` para ejecutar cada paso cuando el mapa esté listo.
- **Estado:** Implementado en `mapa.init.js`: se usa `map.once("idle", ...)` para centrales y consolidado, y un segundo `idle` para MUZU.

### 2.3 Caché de búsqueda ✅ Hecho
- **Situación:** El índice de búsqueda se carga al inicio; las búsquedas son en memoria.
- **Recomendación:** Cachear resultados por texto para no re-filtrar en cada tecleo; si crece mucho, valorar Worker o Fuse.js.
- **Estado:** En `ui.buscador.js`, caché en memoria `searchResultCache` (Map) por query normalizado, máximo 50 entradas. Si la misma búsqueda se repite se reutilizan los resultados sin volver a filtrar. La caché se invalida al actualizar cierres/eventos (Firebase) o al recargar centrales/cables.

---

## 3. Capas con muchos features (cierres / eventos)

### 3.1 Actualización con `setData`
- **Situación:** Cada actualización de cierres/eventos hace `source.setData(FeatureCollection completo)`.
- **Recomendación:**  
  - Asegurar que las features tengan `id` único y usar `promoteId` (ver 1.2).  
  - Si Firebase envía solo cambios, en lugar de reemplazar todo el FeatureCollection se podría mantener un mapa local de features por id y construir el GeoJSON solo con los que cambian; Mapbox no tiene “patch” directo, pero menos datos en cada `setData` ayuda.

### 3.2 Iconos de símbolos
- **Situación:** Capa tipo `symbol` con `icon-image` por feature (cierres/eventos); iconos cargados bajo demanda.
- **Recomendación:** Limitar el número de iconos únicos (reutilizar mismo sprite para mismo tipo) y asegurar que las imágenes estén en un sprite único del estilo para reducir cambios de textura.

---

## 4. CSS y layout

### 4.1 Contenedor del mapa ✅ Hecho
- **Situación:** `#map` con `position: absolute; inset: 0` sin hints de composición.
- **Recomendación:** Añadir `contain: layout style paint` y opcionalmente `will-change: transform`.
- **Estado:** Añadido en `assets/css/map.css` para `#map`.

### 4.2 Paneles y overlays ✅ Hecho
- **Situación:** Paneles con visibilidad/animación.
- **Recomendación:** Composición GPU para reducir reflow.
- **Estado:** `.panel` con `transform: translateZ(0)` en `panels.css`; `.panel-capas` con `translate3d(-50%, -50%, 0)` y `will-change: transform`; `.search-results` con `translateZ(0)` en `search.css`. Sidebar y modales ya tenían `will-change` donde aplica.

### 4.3 Reducir repaints ✅ Hecho
- **Recomendación:** Debounce (150–200 ms) antes de `map.resize()`.
- **Estado:** En `app.js`, el handler de `style.load` hace debounce de 150 ms antes de llamar a `map.resize()` y `reloadAllLayers()`.

---

## 5. Scripts y recursos

### 5.1 jsPDF ✅ Hecho
- **Situación:** Cargado siempre desde CDN aunque solo se usa al exportar PDF.
- **Recomendación:** Cargar bajo demanda al exportar PDF.
- **Estado:** El script se eliminó de `mapa-ftth.html` y `mapa-corporativo.html`. En `tool.diseno-mapa.js`, `ensureJsPDF(callback)` carga el script bajo demanda y `downloadPdf()` lo invoca antes de generar el PDF.

### 5.2 Font Awesome
- **Situación:** Hoja completa desde CDN.
- **Recomendación:** Si el número de iconos usados es estable, valorar subset (solo los iconos que se usan) o self-host para menos dependencia externa y menor tamaño.

### 5.3 Orden y módulos
- **Situación:** Muchos scripts con `defer` y varios `type="module"` (Firebase, auth, etc.).
- **Recomendación:** A medio plazo, un bundler (Vite, Webpack, etc.) con code-splitting por ruta (p. ej. mapa-ftth vs home) para reducir parse/compile en la primera carga.

---

## 6. Árbol de capas (UI)

### 6.1 Nodos y DOM ✅ Hecho
- **Recomendación:** Cargar hijos bajo demanda al expandir.
- **Estado:** En `ui.layers.tree.js`, las carpetas con `child.index` se renderizan como stub (solo fila + contenedor vacío). Al expandir por primera vez se llama a `getIndex(pathKey)` y se renderizan los hijos. Así se evita cargar todo el árbol al inicio.

### 6.2 Fetches al expandir ✅ Hecho
- **Recomendación:** Caché en memoria por path.
- **Estado:** `indexCache = new Map()` en `ui.layers.tree.js`; `getIndex(pathKey)` devuelve la promesa en cache si existe y guarda el resultado tras el primer fetch. El índice raíz también se cachea al usar la ruta por defecto.

---

## 7. Buscador

### 7.1 Resultados
- **Situación:** Lista de resultados renderizada con `innerHTML` y template string; delegación de eventos en el contenedor.
- **Recomendación:** Mantener este enfoque; si en el futuro se muestran >100 resultados, limitar a ~50 en vista y “Cargar más” o virtualización para no crear cientos de nodos DOM.

### 7.2 Geocoding
- **Situación:** Llamadas a Mapbox Geocoding con bbox de Bogotá.
- **Recomendación:** Mantener debounce (300 ms); si se nota latencia, mostrar un estado “Buscando direcciones…” y cachear en memoria las últimas N búsquedas por texto para repetir sin nueva petición.

---

## 8. Firebase y tiempo real

### 8.1 Listeners y `setData`
- **Situación:** Actualizaciones de cierres/eventos que disparan `setData` en la capa.
- **Recomendación:** Hacer throttle/debounce (p. ej. 300–500 ms) de las actualizaciones antes de llamar a `setData`, para no redibujar en cada cambio si llegan muchos eventos seguidos.

### 8.2 Evitar listeners duplicados
- **Recomendación:** Asegurar que los listeners de Firebase (cierres, eventos) se registren una sola vez (por ejemplo desde un módulo singleton o comprobando una bandera antes de `onSnapshot`).

---

## 9. Resumen de prioridad

| Prioridad | Tema                         | Esfuerzo | Impacto |
|----------|------------------------------|----------|---------|
| Alta     | promoteId en sources         | Bajo     | Bueno   |
| Alta     | Consolidado pre-generado     | Medio    | Alto    |
| Alta     | Throttle setData cierres/eventos | Bajo | Bueno   |
| Media    | preserveDrawingBuffer solo al exportar | Medio | Medio   |
| Media    | Carga diferida de jsPDF      | Bajo     | Bajo    |
| Media    | Cola de carga (idle / sin tantos setTimeout) | Medio | Medio   |
| Baja     | will-change / contain en #map | Bajo    | Bajo    |
| Baja     | Árbol de capas lazy/virtual  | Alto     | Depende del tamaño |

---

*Documento generado a partir del análisis del código en febrero 2026. Revisar en próximas versiones del proyecto.*
