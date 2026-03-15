# Análisis a profundidad del proyecto – Buenas prácticas y mejora del renderizado

Documento generado a partir del análisis del código, la documentación existente y las recomendaciones ya implementadas. Sirve como guía de buenas prácticas y como lista priorizada de mejoras de renderizado.

---

## Parte 1. Buenas prácticas (enumeradas)

### 1. Configuración y constantes

| # | Buena práctica | Estado | Ubicación / nota |
|---|----------------|--------|-------------------|
| 1.1 | Centralizar token Mapbox y estilos en un solo módulo | ✅ Hecho | `config.js`: `MAPBOX_TOKEN`, `MAP.STYLES`, `MAP.CENTER`, `MAP_FLYTO_DURATION_MS` |
| 1.2 | No dejar credenciales por defecto en código versionado | ✅ Hecho | `config.local.js` en `.gitignore`; producción vía `config.production.js` o `__FTTH_MAPBOX_TOKEN__` |
| 1.3 | Constantes de buscador (debounce, resultados máx., geocode) | ✅ Hecho | `config.js` → `SEARCH.DEBOUNCE_MS`, `MAX_RESULTS`, `GEOCODE_LIMIT`, etc. |
| 1.4 | IDs de capas del mapa en config | ✅ Hecho | `config.js` → `LAYERS.CENTRALES`, `LAYERS.CIERRES`, `LAYERS.EVENTOS` |
| 1.5 | Log condicionado a modo depuración | ✅ Hecho | `config.js` → `DEBUG`, `window.__FTTH_LOG__(level, ...args)`; no todos los `console.log` lo usan aún |
| 1.6 | Número de moléculas por central en un solo lugar | ✅ Hecho | `utils/centrales.js` → `CENTRAL_MOLECULA_COUNT`, `generarMoleculas()` |

### 2. Mapbox GL y capas

| # | Buena práctica | Estado | Ubicación / nota |
|---|----------------|--------|-------------------|
| 2.1 | Usar `promoteId` en todos los sources GeoJSON | ✅ Hecho | `mapa.layers.js`, `tool.cierres.js`, `tool.eventos.js`, `mapa.ftth.js`: `promoteId` en consolidado, cierres, eventos, centrales |
| 2.2 | Insertar capas de datos debajo de etiquetas del mapa base | ✅ Hecho | `getBeforeIdForDataLayers(map)` → primer layer "symbol" con "label"; todas las capas de datos usan ese `beforeId` |
| 2.3 | Un solo fetch del consolidado cuando sea posible | ✅ Hecho | `loadConsolidatedGeoJSONToBaseMap()` intenta `consolidado-ftth.geojson`; fallback a `consolidateAllGeoJSON()` |
| 2.4 | Cola de carga con `map.once("idle")` en lugar de solo setTimeout | ✅ Hecho | `mapa.init.js`: centrales y consolidado tras `idle`; evita tiempos arbitrarios encadenados |
| 2.5 | Throttle de `setData` en cierres y eventos | ✅ Hecho | `tool.cierres.js`, `tool.eventos.js`: 400 ms (`SETDATA_THROTTLE_MS`) para evitar rachas de actualizaciones |
| 2.6 | Un solo listener de Supabase por colección (cierres/eventos) | ✅ Hecho | `supabase.cierres.js`, `supabase.eventos.js`: Realtime; un solo canal por colección |
| 2.7 | Documentar por qué `preserveDrawingBuffer: true` | ✅ Hecho | `mapa.init.js`: necesario para exportar PNG/PDF; no se puede cambiar después de crear el mapa |

### 3. CSS y layout

| # | Buena práctica | Estado | Ubicación / nota |
|---|----------------|--------|-------------------|
| 3.1 | Aislar repintado del contenedor del mapa | ✅ Hecho | `map.css`: `#map` con `contain: layout style paint` |
| 3.2 | Promover composición GPU en pan/zoom del mapa | ✅ Hecho | `map.css`: `#map` con `will-change: transform` |
| 3.3 | Paneles y overlays con composición GPU | ✅ Hecho | `panels.css`: `.panel` con `transform: translateZ(0)`; `.panel-capas` con `translate3d` y `will-change: transform` |
| 3.4 | Resultados del buscador con composición GPU | ✅ Hecho | `search.css`: `.search-results` con `transform: translateZ(0)` |
| 3.5 | Debounce antes de `map.resize()` tras cambio de estilo | ✅ Hecho | `app.js`: 150 ms antes de `map.resize()` y `reloadAllLayers()` en `style.load` |

### 4. Carga diferida y caché

| # | Buena práctica | Estado | Ubicación / nota |
|---|----------------|--------|-------------------|
| 4.1 | Caché de resultados de búsqueda en memoria | ✅ Hecho | `ui.buscador.js`: `searchResultCache` (Map), máx. 50 entradas |
| 4.2 | Árbol de capas: hijos bajo demanda al expandir | ✅ Hecho | `ui.layers.tree.js`: carpetas con `child.index` se expanden con `getIndex(pathKey)` |
| 4.3 | Caché de índices del árbol por path | ✅ Hecho | `ui.layers.tree.js`: `indexCache = new Map()` en `getIndex()` |
| 4.4 | jsPDF cargado solo al exportar PDF | ✅ Hecho | `tool.diseno-mapa.js`: `ensureJsPDF(callback)` carga el script bajo demanda |

### 5. Mantenibilidad y seguridad

| # | Buena práctica | Estado | Ubicación / nota |
|---|----------------|--------|-------------------|
| 5.1 | Escape de contenido dinámico en UI (XSS) | ✅ Documentado | `RECOMENDACIONES_BUENAS_PRACTICAS.md`; en buscador y popups se usa `escapeHtml` / sanitización |
| 5.2 | Un punto de verdad para “es corporativo” | Parcial | `window.__GEOJSON_INDEX__` existe; en varios archivos se repite la comprobación (recomendación ANALISIS_Y_MEJORAS) |
| 5.3 | Scripts de procesamiento de datos en carpeta dedicada | ✅ Hecho | `scripts/data/` para crear_y_procesar, setup_and_process, etc.; build en `scripts/` |

### 6. Accesibilidad

| # | Buena práctica | Estado | Ubicación / nota |
|---|----------------|--------|-------------------|
| 6.1 | Clase `.visually-hidden` para contenido solo lector de pantalla | ✅ Hecho | `theme.css` |
| 6.2 | `aria-label` en botones solo con icono | Pendiente | Recomendado en ANALISIS_Y_MEJORAS; controles del mapa (GPS, Medir, Capas) |
| 6.3 | Resultados del buscador con roles semánticos (listbox/option) | Pendiente | Mejoraría navegación por teclado y lectores de pantalla |

---

## Parte 2. Mejoras de renderizado (enumeradas)

### A. Prioridad alta

| # | Mejora | Descripción | Esfuerzo | Archivos principales |
|---|--------|-------------|----------|----------------------|
| A.1 | Usar `__FTTH_LOG__` en lugar de `console.log` en módulos críticos | Sustituir `console.log`/`console.warn` de depuración por `window.__FTTH_LOG__("log", ...)` para que en producción no se escriba en consola. Dejar `console.error` para fallos reales. | Bajo | `tool.eventos.js`, `mapa.init.js`, `ui.buscador.js`, `mapa.layers.js`, `tool.cierres.js`, `ui.layers.tree.js` |
| A.2 | Constante global para feedback “Copiar coordenada” | Definir en `config.js` algo como `UI_COPY_FEEDBACK_MS: 1500` y usarla en mapa.init, tool.eventos, tool.cierres, tool.navegacion para el texto “¡Copiado!”. | Bajo | `config.js`, `mapa.init.js`, `tool.eventos.js`, `tool.cierres.js`, `tool.navegacion.js` |
| A.3 | Limitar o paginar cierres/eventos en el mapa cuando hay muchos | Con ~1000–2000 puntos ya se puede notar; con 5000+ hay riesgo de tirones (LIMITES_Y_UMBRALES). Opciones: (1) tope máximo por capa (ej. 2000) y aviso; (2) filtrar por vista actual (solo puntos en viewport); (3) agrupación por zoom (clustering). | Medio–Alto | `tool.cierres.js`, `tool.eventos.js`, `mapa.layers.js` (si se añade capa de clustering) |
| A.4 | Asegurar que el consolidado se regenere en CI o pre-deploy | Si `consolidado-ftth.geojson` no existe o está desactualizado, la primera carga hace muchos fetch. Incluir en script de build o en GitHub Actions la ejecución de `node scripts/build-consolidado-geojson.js`. | ✅ Hecho | `npm run build` ejecuta `build:geojson` → `node scripts/build-consolidado-geojson.js`; ver `package.json`. |

### B. Prioridad media

| # | Mejora | Descripción | Esfuerzo | Archivos principales |
|---|--------|-------------|----------|----------------------|
| B.1 | Eliminar o condicionar listener global del buscador | En `ui.buscador.js` se usa `document.addEventListener("click", onDocumentClickCloseBuscadorPanels)` sin `removeEventListener`. Registrar solo cuando el buscador esté abierto/activo y quitarlo al cerrar o al desmontar la vista. | Medio | `ui.buscador.js` |
| B.2 | Un solo `flyTo` a la vez / cola de animaciones | Ya se evita solapar en el buscador; centralizar en un helper (ej. `App.flyToQueued(options)`) para que cualquier módulo que llame a `map.flyTo` use la misma cola y se cancele la anterior si aplica. | Bajo | `mapa.controls.js` o nuevo `mapa.flyTo.js`, `ui.buscador.js` |
| B.3 | Tiempos de espera en mapa.layers como constantes | Reemplazar números mágicos (100, 500, 1000, 1500, 2000, 2800 ms) por constantes con nombre al inicio del módulo (ej. `LOAD_RETRY_DELAY_MS`, `ENFORCE_VISIBILITY_DELAY_MS`) para facilitar ajuste y lectura. | ✅ Hecho | `config.js` → `MAP_TIMING` (RESTORE_LOAD_TREE_MS, FITBOUNDS_DURATION_MS, etc.); `mapa.layers.js`, `ui.layers.tree.js` |
| B.4 | Sustituir setTimeout por evento “map ready” en tool.rutas | En `tool.rutas.js` se usa `setTimeout(startRutasSync, 800)` y 500 ms. Si existe `ftth-map-ready` (u otro), suscribirse a él para ejecutar la sincronización cuando el mapa esté listo en lugar de depender de tiempos fijos. | Bajo | `tool.rutas.js`, `mapa.init.js` (confirmar evento) |
| B.5 | Límite o virtualización en resultados del buscador (primeros 50 + "Mostrar más") | Si en el futuro se muestran >100 resultados, limitar a ~50 en vista y “Cargar más” o virtualización (solo renderizar ítems visibles) para no crear cientos de nodos DOM (RECOMENDACIONES_RENDERIZADO 7.1). | ✅ Hecho | `config.js` SEARCH.DISPLAY_PAGE_SIZE; `ui.buscador.js`; `search.css` .search-load-more |
| B.6 | Subset de Font Awesome o self-host | Reducir tamaño y dependencia externa; solo los iconos usados (RECOMENDACIONES_RENDERIZADO 5.2). | Medio | Build o script de assets, HTML donde se carga FA |

### C. Prioridad baja

| # | Mejora | Descripción | Esfuerzo | Archivos principales |
|---|--------|-------------|----------|----------------------|
| C.1 | Reducir `!important` en CSS de controles del mapa | Hay muchos `!important` en `map.css` y en estilos inline de mapa-ftth.html. Mover a clases en CSS y aumentar especificidad con un contenedor (ej. `.map-wrapper .map-controls`) para poder quitar `!important`. | Bajo | `map.css`, `pages/mapa-ftth.html` |
| C.2 | Listener `ftth-consolidated-layers-ready` una sola vez | En `ui.layers.tree.js` el listener recarga el árbol; si el evento se dispara más de una vez, se recarga varias veces. Usar `once` o una bandera para ejecutar la recarga solo la primera vez. | Bajo | `ui.layers.tree.js` |
| C.3 | Iconos de cierres/eventos en un solo sprite | Limitar iconos únicos y asegurar que estén en un sprite único del estilo para reducir cambios de textura (RECOMENDACIONES_RENDERIZADO 3.2). | Medio | Estilo Mapbox, `tool.cierres.js`, `tool.eventos.js` |
| C.4 | Code-splitting por ruta (mapa-ftth vs home vs corporativo) | A medio plazo, usar bundler (Vite/Webpack) con code-splitting para cargar solo el JS de la página actual y reducir parse/compile en la primera carga (RECOMENDACIONES_RENDERIZADO 5.3). | Alto | Build (Vite ya existe para ftth-bundle), entradas por página |

---

## Parte 3. Resumen de límites y umbrales (referencia)

- **Buscador:** Caché 50 entradas; resultados mostrados ~20–50. Con miles de ítems en el índice el filtrado puede tardar ~100–300 ms; debounce 300 ms mitiga.
- **Cierres/eventos en mapa:** Sin tope en código. ~500–1000 puntos → cada `setData` puede tardar 50–200 ms. ~2000–5000+ → riesgo de tirones. Throttle 400 ms ya aplicado.
- **GeoJSON consolidado:** Sin tope. ~5000–10000+ features → carga y primer render pueden tardar varios segundos.
- **Supabase:** Límites de servicio altos; el cuello de botella es el cliente (mapa + UI), no el número de filas.

Documento de referencia: `docs/LIMITES_Y_UMBRALES.md`.

---

## Parte 4. Documentación de referencia

| Documento | Contenido |
|-----------|-----------|
| `docs/RECOMENDACIONES_RENDERIZADO.md` | Mapbox, carga, capas, CSS, árbol, buscador, Firebase; estado de cada recomendación |
| `docs/LIMITES_Y_UMBRALES.md` | Caché, resultados, cierres/eventos, GeoJSON, Firebase |
| `docs/RECOMENDACIONES_BUENAS_PRACTICAS.md` | Estructura, seguridad, rendimiento, a11y, testing |
| `ANALISIS_Y_MEJORAS.md` | Estructura del proyecto, archivos no referenciados, recomendaciones generales |
| `docs/DEPURACION_ENUMERADA.md` | Cambios de depuración ya aplicados y pendientes |

---

*Análisis a profundidad – FlashFiber FTTH. Revisar en próximas versiones del proyecto.*
