# Recomendaciones para mejorar el proyecto (sin alterar funcionalidad)

Estas mejoras mantienen el comportamiento actual y mejoran mantenibilidad, robustez y claridad.

---

## 1. Evitar duplicación (DRY)

### CENTRAL_PREFIX y generarMoleculas ✅ Hecho
- **Situación:** `CENTRAL_PREFIX` y `generarMoleculas(prefijo)` estaban duplicados en tool.cierres y tool.eventos.
- **Recomendación:** Módulo compartido `utils/centrales.js` y usarlo en cierres y eventos.
- **Estado:** `utils/centrales.js` exporta y expone en `window.__FTTH_CENTRALES__` (CENTRAL_PREFIX, generarMoleculas). `tool.cierres.js` y `tool.eventos.js` usan `__FTTH_CENTRALES__.CENTRAL_PREFIX` y `__FTTH_CENTRALES__.generarMoleculas` con fallback. El entry del bundle carga centrales.js antes de los tools.

### IDs de capas y constantes de mapa ✅ Hecho
- **Situación:** `LAYER_CIERRES`, `LAYER_EVENTOS`, `LAYER_CENTRALES` se repiten en `ui.buscador.js` y en los tools.
- **Recomendación:** Definir constantes globales en un solo sitio (p. ej. `config.js`) y reutilizarlas.
- **Estado:** En `config.js` ya existía `LAYERS: { CENTRALES, CIERRES, EVENTOS }`. Ahora `tool.cierres.js`, `tool.eventos.js` y `mapa.layers.js` usan `CONFIG.LAYERS?.CIERRES`, `CONFIG.LAYERS?.EVENTOS` y `CONFIG.LAYERS?.CENTRALES` con fallback al valor por defecto. `ui.buscador.js` y `ui.layers.tree.js` ya los usaban.

---

## 2. Consistencia en manejo de errores (parcial) ✅

### Usar ErrorHandler y validators
- **Situación:** Existen `utils/errorHandler.js` y `utils/validators.js`, pero casi no se usaban en tools.
- **Recomendación:** Usar ErrorHandler en operaciones críticas y validators antes de guardar.
- **Estado:** En `entry-ftth.js` se exponen `window.ErrorHandler` y `window.__FTTH_VALIDATORS__` para los tools (IIFE). En `tool.cierres.js` y `tool.eventos.js`: (1) `addCierreToMap`/`addEventoToMap` validan coordenadas con `validators.coordenadas` y registran con ErrorHandler si son inválidas; (2) antes de guardar se valida coordenadas con validators; (3) en el `catch` de guardar cierre/evento se usa `ErrorHandler.handle` y `ErrorHandler.getUserMessage` para el alert. Quedan otros puntos (fetch, carga de capas) por cubrir de forma incremental.

---

## 3. Configuración y “magic numbers”

### Constantes en config ✅ Hecho
- **Situación:** Números como 300 (debounce búsqueda), 600 (retry), 30 (moléculas), 20 (resultados máximos), duración flyTo estaban repartidos en el código.
- **Recomendación:** Mover a `config.js` o constantes al inicio de cada módulo.
- **Estado:** En `config.js`: `SEARCH.DEBOUNCE_MS` (300), `SEARCH.RETRY_DELAY_MS` (600), `SEARCH.MAX_RETRIES` (3), `SEARCH.MAX_RESULTS` (20), `MAP_FLYTO_DURATION_MS` (800). En `ui.buscador.js` se leen con fallbacks. En `utils/centrales.js` se añadió `MOLECULAS_DEFAULT_COUNT = 30` para el número de moléculas por central cuando no está en `CENTRAL_MOLECULA_COUNT`.

### Token y secretos ✅ Hecho
- **Situación:** En producción no debe usarse un token por defecto en código.
- **Recomendación:** Si no hay MAPBOX_TOKEN, mostrar mensaje claro y no inicializar el mapa (o mostrar una pantalla de “Configuración requerida”).
- **Estado:** En `mapa.init.js` si no hay token se muestra mensaje de configuración requerida (Vercel / config.local.js) y no se inicializa el mapa. En `config.js` el token viene de SECRETS o __FTTH_MAPBOX_TOKEN__.

---

## 4. Accesibilidad (a11y) ✅ Hecho

### Botones e inputs
- **Situación:** Algunos botones solo tienen icono (p. ej. GPS, Medir, Capas, Limpiar mapa) sin texto alternativo.
- **Recomendación:** Añadir siempre `aria-label` descriptivo.
- **Estado:** Los botones del mapa (GPS, Medir, Rotar, Limpiar) ya tenían `aria-label`. Añadido `aria-label="Cerrar panel de capas"` en `btnCloseLayers` y `aria-label="Cerrar modal de evento"` en `closeEventoModal` (mapa-ftth.html y mapa-corporativo.html).

### Resultados de búsqueda
- **Situación:** Los resultados se generan como `div` con `data-type` y `data-id`.
- **Recomendación:** Usar `role="listbox"` en el contenedor y `role="option"` en cada ítem.
- **Estado:** El contenedor de resultados tiene `aria-label="Resultados de búsqueda"`. En `ui.buscador.js`, la lista de resultados usa `role="listbox"` en el div `.search-results-list` y `role="option"` en cada `.search-result-item`.

---

## 5. Estilos y HTML ✅ Hecho

### Estilos inline en controles del mapa
- **Situación:** En `mapa-ftth.html` los botones del mapa tenían estilos inline.
- **Recomendación:** Mover esos estilos a una clase en CSS (p. ej. `.map-controls .map-control-btn`) y quitar `!important` donde no sea necesario.
- **Estado:** Los controles del mapa no tienen estilos inline; todo está en `assets/css/map.css` (`.map-controls` y `.map-controls button`). Se mantienen algunos `!important` donde evitan que estilos de Mapbox u otros overlays sobrescriban posición y visibilidad de la barra de controles.

---

## 6. Rendimiento y buenas prácticas

### Listeners globales
- **Situación:** En `ui.buscador.js` hay un `document.addEventListener("click", ...)` para cerrar resultados al hacer clic fuera; no se elimina nunca.
- **Recomendación:** Está bien para un único buscador; si en el futuro hubiera varias instancias o SPA, considerar registrar el listener solo cuando el buscador esté “activo” y quitarlo al cerrar, para evitar fugas.
- **Beneficio:** Comportamiento predecible si la página crece en complejidad.

### Búsqueda
- **Situación:** El debounce de 300 ms está bien; el retry cuando el índice está vacío hace hasta 3 reintentos cada 600 ms.
- **Recomendación:** Dejar los valores como están o moverlos a constantes; si el índice tarda mucho en cargar, valorar mostrar un indicador “Cargando índice…” en el header hasta que `loadCentrales`/`loadCables` (y opcionalmente cierres/eventos) hayan terminado la primera carga.
- **Beneficio:** Usuario sabe que la app sigue cargando y no piensa que “no hay resultados”.

---

## 7. Orden y carga de scripts ✅ Hecho

### Dependencias explícitas
- **Situación:** Varios scripts dependen de `window.__FTTH_APP__`, `window.__FTTH_CONFIG__`, Firebase, etc.
- **Recomendación:** Comentario con el orden requerido (config → app → mapa → tools → ui).
- **Estado:** En `assets/js/entry-ftth.js` (entrada del bundle Vite) se documenta el orden de carga en 6 pasos y las dependencias globales esperadas (Mapbox, Turf, config, App.map).

---

## 8. Seguridad

### Contenido generado (búsqueda, popups)
- **Situación:** En `ui.buscador.js` se usa `highlightMatch` con `replace(regex, "<mark>$1</mark>")`; el texto viene de datos internos (centrales, cables, cierres, eventos).
- **Recomendación:** Mientras el contenido sea solo de fuentes controladas (Firebase/GeoJSON propios), el riesgo es bajo. Si algún día se muestran textos introducidos por usuarios, escapar HTML (p. ej. función `escapeHtml` que ya existe en tool.cierres) antes de insertar en el DOM.
- **Beneficio:** Evitar XSS si las fuentes de datos cambian.

---

## 9. Código y documentación

### JSDoc en funciones públicas (parcial) ✅
- **Situación:** Algunas funciones importantes no tenían JSDoc.
- **Recomendación:** Añadir JSDoc breve a funciones que se usan desde otros módulos o que son “punto de entrada”.
- **Estado:** Añadido JSDoc a `setSelectedMoleculaForPins` y `selectResult` (ui.buscador.js) y a `enforceOnlyCentralesVisible` (mapa.layers.js). Quedan otras funciones por documentar de forma incremental.

### Comentarios obsoletos
- **Situación:** Hay bloques comentados con “DESHABILITADO” o “❌” en varios archivos (config, mapa.layers, etc.).
- **Recomendación:** Si la funcionalidad no se va a recuperar, eliminar el comentario; si se puede recuperar más adelante, dejar un comentario corto tipo “Carga de iconos personalizados deshabilitada; ver issue #X”.
- **Beneficio:** Código más limpio y menos confusión.

---

## 10. Testing (opcional a medio plazo)

- **Situación:** No hay tests automatizados visibles en el repo.
- **Recomendación:** Sin cambiar funcionalidad, se puede preparar el terreno:
  - Extraer funciones puras (p. ej. `generarMoleculas`, `generarCodigo` lógica, formateo de código de cierre) a módulos que no dependan del DOM.
  - Añadir tests unitarios solo para esas funciones (Jest o Vitest).
- **Beneficio:** Refactors más seguros y regresiones detectadas antes.

---

## Resumen prioritario

| Prioridad | Tema                         | Esfuerzo | Impacto |
|----------|------------------------------|----------|---------|
| Alta     | Constantes compartidas (CENTRAL_PREFIX, generarMoleculas, IDs capas) | Bajo     | Mantenibilidad |
| Alta     | Usar ErrorHandler/validators en puntos críticos | Medio    | Robustez |
| Media    | Constantes para “magic numbers” (debounce, retry, etc.) | Bajo     | Claridad |
| Media    | `aria-label` en botones de icono y opciones de búsqueda | Bajo     | Accesibilidad |
| Media    | Mover estilos inline de controles del mapa a CSS | Bajo     | Mantenibilidad |
| Baja     | JSDoc en APIs cruzadas       | Bajo     | Documentación |
| Baja     | Limpiar comentarios obsoletos | Bajo    | Claridad |

Todas las recomendaciones pueden aplicarse de forma incremental sin cambiar el comportamiento actual de la aplicación.
