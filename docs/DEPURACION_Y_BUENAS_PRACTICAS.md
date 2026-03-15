# Depuración, renderizado y buenas prácticas – FlashFiber FTTH

Documento de análisis **sin alterar el comportamiento del proyecto**. Sirve como guía para futuras mejoras.

---

## 1. Depuración (sin alterar el proyecto)

### 1.1 Logs condicionados por DEBUG
- **Situación:** En varios módulos se usa `if (log) log("log", ...)` (correcto). En otros se usa `console.log(...)` directo sin pasar por `__FTTH_LOG__` ni `CONFIG.DEBUG`.
- **Archivos con `console.log` directo (candidatos a condicionar):**
  - `ui.buscador.js` – muchas líneas de log de índice/cables/centrales.
  - `ui.panel.js` – logs de botones y estilo.
  - `ui.layers.tree.js` – "Árbol recargado con capas consolidadas", etc.
  - `tool.cierres.js`, `tool.eventos.js`, `tool.rutas.js`, `tool.gps.js`, `tool.diseno-mapa.js` – logs de herramientas.
  - `mapa.controls.js` – "Giro ACTIVADO/DESACTIVADO".
  - `supabase.cierres.js` – "Cierre guardado", "Escuchando cierres".
- **Recomendación:** Unificar: usar `const log = window.__FTTH_LOG__` y `if (CONFIG?.DEBUG && log) log("log", ...)` para mensajes informativos; dejar `console.error` para errores reales.

### 1.2 Puntos de depuración útiles (ya existentes)
- `CONFIG.DEBUG` y `__FTTH_LOG__` en `config.js` / `initializer.js`.
- Evento `ftth-consolidated-layers-ready` para saber cuándo las capas están listas.
- En mapa: `map.isStyleLoaded()`, `map.getLayer("geojson-lines")` para comprobar estado de capas.

### 1.3 Evitar ruido en producción
- No eliminar logs; envolverlos en `if (CONFIG?.DEBUG)` o en `log` para que en producción (DEBUG: false) no salgan en consola.

---

## 2. Mejoras de renderizado

### 2.1 Uso de `innerHTML` con contenido dinámico
- **Situación:** Se usa `innerHTML` en muchos sitios para listas de resultados, opciones, mensajes (p. ej. `ui.buscador.js`, `tool.cierres.js`, `tool.eventos.js`, `ui.layers.tree.js`).
- **Riesgo:** Si algún texto viene de usuario o de BD y se concatena directo en HTML, hay riesgo de XSS.
- **Recomendación:** Para contenido dinámico (nombres, direcciones, etc.), usar `textContent` o un pequeño helper que escape HTML (p. ej. `escapeHtml(str)`) antes de insertar en plantillas. No cambiar la lógica de negocio; solo asegurar que los datos se escapen.

### 2.2 Reflow/repaint
- **Situación:** Varios `setTimeout` con delays fijos (100, 150, 400, 1200, 2800 ms) para aplicar visibilidad de capas o recargar árbol.
- **Recomendación:** Donde sea posible (p. ej. actualizaciones de UI tras un evento del mapa), usar `requestAnimationFrame` para el siguiente frame en lugar de `setTimeout(..., 0)` para agrupar actualizaciones y reducir reflows.

### 2.3 Árbol de capas y listas largas
- **Situación:** El árbol de capas y el listado de resultados del buscador vuelcan todo el HTML de una vez (`container.innerHTML = ""` luego asignación con `.map().join()`).
- **Recomendación (futura):** Para listas muy grandes (cientos de resultados), valorar virtualización (solo renderizar nodos visibles) para mejorar rendimiento. No es obligatorio si el número de ítems se mantiene bajo.

### 2.4 Canvas/Mapbox
- **Situación:** `preserveDrawingBuffer: true` en el mapa (necesario para export PNG/PDF) aumenta uso de GPU.
- **Recomendación:** Mantenerlo; ya está documentado en comentarios. Alternativa futura: mapa secundario oculto solo para export.

---

## 3. Malas prácticas enumeradas

### 3.1 Catch vacío o silencioso ✅ (abordado)
- **Dónde:** `mapa.layers.js`, `mapa.init.js`, `ui.buscador.js`, `mapa.ftth.js`, `tool.navegacion.js`, `tool.nota-rapida.js`, `tool.diseno-mapa.js`, `tool.eventos.js`, `config.js`, `ui.layers.tree.js`, `ui.panel.js`, `ui.login.js`, `devtools-guard.js`.
- **Problema:** Se tragan errores sin registro; dificulta depuración.
- **Estado:** Añadido en todos los catch un log condicional `if (CONFIG?.DEBUG)` o `if (window.__FTTH_CONFIG__?.DEBUG) console.debug("[módulo] descripción", e?.message)` para que en desarrollo se vea el error sin alterar el flujo ni la producción.

### 3.2 Números mágicos (timeouts y constantes)
- **Dónde:** Delays repartidos por el código: 50, 100, 150, 200, 300, 400, 500, 800, 1000, 1200, 1500, 2800, 3500 ms en `mapa.layers.js`; 100, 200, 400, 800, 1500, 3000, 5000 en `ui.buscador.js`; 4000 en `devtools-guard.js`.
- **Problema:** Difícil mantener y entender el propósito de cada valor.
- **Recomendación:** Centralizar en `CONFIG` (como ya existe `DEBOUNCE`) o en constantes con nombre en cada módulo (p. ej. `RETRY_DELAY_MS`, `ENFORCE_VISIBILITY_DELAY_MS`).

### 3.3 `document.write` para scripts
- **Dónde:** `mapa-ftth.html`, `mapa-corporativo.html`, `mapa-eventos.html` – carga de `config.local.js` / `config.production.js` con `document.write`.
- **Problema:** `document.write` bloquea el parser y está desaconsejado en páginas dinámicas.
- **Recomendación:** Sustituir por inyección de `<script>` con `document.createElement("script")` y `appendChild`, o por un único script en el HTML que defina la ruta de config.

### 3.4 Dependencia de globals
- **Dónde:** Uso extensivo de `window.__FTTH_APP__`, `window.__FTTH_CONFIG__`, `window.__FTTH_LOG__`, `window.__GEOJSON_INDEX__`, etc.
- **Problema:** Acoplamiento implícito; orden de carga de scripts crítico.
- **Recomendación:** Mantener por ahora (no alterar proyecto). A largo plazo, considerar un módulo de “context” o inyección explícita en puntos de entrada.

### 3.5 Acceso a DOM sin comprobación de existencia
- **Dónde:** En algunos sitios se hace `document.getElementById("...").value` o `.innerHTML` sin comprobar que el elemento exista (p. ej. `mapa-eventos.js` línea 217, `tool.cierres.js` múltiples getElementById).
- **Problema:** Si el HTML cambia o el id no existe, fallo en tiempo de ejecución.
- **Recomendación:** Guardar referencia en variable y comprobar `if (el) { ... }` antes de usar.

### 3.6 Duplicación de lógica
- **Dónde:** Patrones repetidos: “esperar estilo del mapa + reintentar”, “toggle visibility de geojson-lines + __cablesExplicitlyVisible”, construcción de filtros Mapbox similares en buscador y layers tree.
- **Problema:** Más código, más riesgo de desincronización al cambiar una sola copia.
- **Recomendación:** Extraer a funciones reutilizables (p. ej. `waitForStyleThen(fn)`, `setCablesVisibility(visible)`).

### 3.7 Mezcla de responsabilidades
- **Dónde:** Algunos módulos (p. ej. `ui.buscador.js`) cargan datos, renderizan UI, aplican filtros del mapa y manejan eventos en el mismo archivo.
- **Problema:** Archivos muy largos; pruebas y mantenimiento más costosos.
- **Recomendación:** A futuro, separar “capa de datos / índice”, “vista / render” y “controlador / eventos”.

### 3.8 Bloqueo de teclas y menú contextual
- **Dónde:** `devtools-guard.js` – `e.preventDefault()` en F12, Ctrl+Shift+I/J/C, clic derecho, Ctrl+U.
- **Problema:** Empeora accesibilidad y experiencia de desarrolladores; no evita inspección real.
- **Recomendación:** Valorar desactivar en desarrollo (p. ej. solo activar cuando `!CONFIG.DEBUG`) o eliminar el preventDefault y dejar solo el aviso.

### 3.9 Promesas sin `.catch` en llamadas desde HTML/eventos
- **Dónde:** Varios `loadConsolidatedGeoJSONToBaseMap()`, `loadFTTHTree()`, etc. se llaman desde eventos; en algunos puntos (p. ej. `ui.panel.js`, `ui.buscador.js`) podría quedar un `.then()` o llamada async sin `.catch()`.
- **Problema:** Rechazos no manejados → "Uncaught (in promise)".
- **Recomendación:** Ya se corrigió en `mapa.layers.js` para load/style.load. Revisar el resto de llamadas a funciones async desde event listeners y añadir `.catch()`.

### 3.10 Strings de configuración repetidos
- **Dónde:** IDs de capas como `"geojson-lines"`, `"geojson-points"`, `"CORPORATIVO_CENTRALES_ETB"` repetidos en varios archivos.
- **Problema:** Riesgo de typo; cambios requieren buscar y reemplazar en muchos sitios.
- **Recomendación:** Ya existe `CONFIG.LAYERS` para algunos; extenderlo y usar constantes para todos los IDs de capas del mapa.

---

## 4. Resumen de prioridad (sin alterar el proyecto)

| Prioridad | Tema | Acción sugerida |
|-----------|------|-------------------|
| Alta | Catch vacíos | Añadir log mínimo en desarrollo |
| Alta | Logs en producción | Condicionar a CONFIG.DEBUG / __FTTH_LOG__ |
| Media | Números mágicos | Centralizar delays en CONFIG o constantes |
| Media | document.write | Sustituir por inyección de script |
| Media | getElementById sin null check | Comprobar elemento antes de usar |
| Baja | innerHTML con datos dinámicos | Escapar HTML donde haya entrada de usuario/BD |
| Baja | Globals | Documentar y, a largo plazo, modularizar |
| Baja | Bloqueo F12/contextmenu | Opcional solo en producción o desactivar |

Este documento no modifica el proyecto; sirve como lista de comprobación para depuración, renderizado y refactor futuro.
