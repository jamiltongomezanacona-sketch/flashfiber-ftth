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

### 3.2 Números mágicos (timeouts y constantes) ✅ (parcial: mapa.layers)
- **Dónde:** Delays en `mapa.layers.js`; 100, 200, 400, 800, 1500, 3000, 5000 en `ui.buscador.js`; 4000 en `devtools-guard.js`.
- **Problema:** Difícil mantener y entender el propósito de cada valor.
- **Estado:** Añadido `CONFIG.MAP_TIMING` en config.js con todos los delays de carga de capas/estilo (RETRY_LOAD_MS, ENFORCE_VISIBILITY_MS, APPLY_FALLBACK_MS, etc.) y `mapa.layers.js` los usa con fallback `?? valor`. Pendiente: `ui.buscador.js` y `devtools-guard.js`.

### 3.3 `document.write` para scripts ✅ (parcial: mapa-ftth, mapa-corporativo)
- **Dónde:** `mapa-ftth.html`, `mapa-corporativo.html`, `mapa-eventos.html` – carga de `config.local.js` / `config.production.js`.
- **Problema:** `document.write` bloquea el parser y está desaconsejado en páginas dinámicas.
- **Estado:** En `mapa-ftth.html` y `mapa-corporativo.html` se sustituyó por inyección con `createElement('script')` + `appendChild`; `config.js` se carga en el `onload` del script de config para mantener orden. En `mapa-eventos.html` se mantiene `document.write` porque el script siguiente usa `__FTTH_CONFIG__` de forma síncrona.

### 3.4 Dependencia de globals
- **Dónde:** Uso extensivo de `window.__FTTH_APP__`, `window.__FTTH_CONFIG__`, `window.__FTTH_LOG__`, `window.__GEOJSON_INDEX__`, etc.
- **Problema:** Acoplamiento implícito; orden de carga de scripts crítico.
- **Recomendación:** Mantener por ahora (no alterar proyecto). A largo plazo, considerar un módulo de “context” o inyección explícita en puntos de entrada.

### 3.5 Acceso a DOM sin comprobación de existencia ✅ (parcial)
- **Dónde:** `mapa-eventos.js`, `tool.cierres.js`, `mapa-eventos.html` (inline).
- **Problema:** Si el HTML cambia o el id no existe, fallo en tiempo de ejecución.
- **Estado:** Añadidas comprobaciones en `mapa-eventos.js` (loading, btnFiltrar), `tool.cierres.js` (optional chaining en campos del formulario de cierre), `mapa-eventos.html` (bodyMapaEventos, gateBtnEntrar, gateClave, gateError). Pendiente: otros archivos que usen getElementById sin guard.

### 3.6 Duplicación de lógica
- **Dónde:** Patrones repetidos: “esperar estilo del mapa + reintentar”, “toggle visibility de geojson-lines + __cablesExplicitlyVisible”, construcción de filtros Mapbox similares en buscador y layers tree.
- **Problema:** Más código, más riesgo de desincronización al cambiar una sola copia.
- **Recomendación:** Extraer a funciones reutilizables (p. ej. `waitForStyleThen(fn)`, `setCablesVisibility(visible)`).

### 3.7 Mezcla de responsabilidades
- **Dónde:** Algunos módulos (p. ej. `ui.buscador.js`) cargan datos, renderizan UI, aplican filtros del mapa y manejan eventos en el mismo archivo.
- **Problema:** Archivos muy largos; pruebas y mantenimiento más costosos.
- **Recomendación:** A futuro, separar “capa de datos / índice”, “vista / render” y “controlador / eventos”.

### 3.8 Bloqueo de teclas y menú contextual ✅ (abordado)
- **Dónde:** `devtools-guard.js` – `e.preventDefault()` en F12, Ctrl+Shift+I/J/C, clic derecho, Ctrl+U.
- **Problema:** Empeora accesibilidad y experiencia de desarrolladores; no evita inspección real.
- **Estado:** Si `CONFIG.DEBUG` es true no se llama a `preventDefault` (F12, clic derecho y Ctrl+U permitidos en desarrollo). El aviso se sigue mostrando. En producción (DEBUG false) se mantiene el bloqueo.

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
