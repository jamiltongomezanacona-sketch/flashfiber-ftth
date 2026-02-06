# Recomendaciones para mejorar el proyecto (sin alterar funcionalidad)

Estas mejoras mantienen el comportamiento actual y mejoran mantenibilidad, robustez y claridad.

---

## 1. Evitar duplicación (DRY)

### CENTRAL_PREFIX y generarMoleculas
- **Situación:** `CENTRAL_PREFIX` y `generarMoleculas(prefijo)` están duplicados en `tool.cierres.js` y `tool.eventos.js`.
- **Recomendación:** Crear un módulo compartido, por ejemplo `assets/js/utils/centrales.js`:
  - Exportar `CENTRAL_PREFIX` y `generarMoleculas(prefijo)`.
  - Importar o cargar ese script antes de los tools y usarlo en cierres y eventos.
- **Beneficio:** Un solo lugar para cambiar centrales o formato de moléculas.

### IDs de capas y constantes de mapa
- **Situación:** `LAYER_CIERRES`, `LAYER_EVENTOS`, `LAYER_CENTRALES` se repiten en `ui.buscador.js` y en los tools.
- **Recomendación:** Definir constantes globales en un solo sitio (p. ej. `config.js` o `assets/js/constants.js`) y reutilizarlas.
- **Beneficio:** Menos riesgo de errores si se cambia el nombre de una capa.

---

## 2. Consistencia en manejo de errores

### Usar ErrorHandler y validators
- **Situación:** Existen `utils/errorHandler.js` y `utils/validators.js`, pero casi no se usan; en muchos sitios se usa `try/catch` + `console.warn/error` o se ignora el error.
- **Recomendación:**
  - En operaciones async o críticas (Firebase, fetch, carga de capas), usar `ErrorHandler.handle(error, "contexto")` o `ErrorHandler.safeAsync(fn, "contexto", fallback)`.
  - Para coordenadas y datos de formularios (cierres, eventos), usar `validators.coordenadas(lng, lat)` y el validador que corresponda antes de guardar.
- **Beneficio:** Errores más claros, mismo formato en dev/prod y validación centralizada.

---

## 3. Configuración y “magic numbers”

### Constantes en config
- **Situación:** Números como 300 (debounce búsqueda), 600/800 (retry), 30 (moléculas), 20 (resultados máximos), 1500 (duración flyTo) están repartidos en el código.
- **Recomendación:** Mover a `config.js` o a constantes al inicio de cada módulo, por ejemplo:
  - `SEARCH_DEBOUNCE_MS`, `SEARCH_RETRY_DELAY_MS`, `MOLECULAS_COUNT`, `SEARCH_MAX_RESULTS`, `MAP_FLYTO_DURATION_MS`.
- **Beneficio:** Más fácil de ajustar y documentar sin tocar la lógica.

### Token y secretos
- **Situación:** En `config.js` hay un token por defecto en código y comentarios sobre producción.
- **Recomendación:** En producción no usar nunca un token por defecto; si `SECRETS.MAPBOX_TOKEN` no existe, mostrar un mensaje claro y no inicializar el mapa (o mostrar una pantalla de “Configuración requerida”).
- **Beneficio:** Evitar fugas de token y dejar claro cuándo falta configuración.

---

## 4. Accesibilidad (a11y)

### Botones e inputs
- **Situación:** Algunos botones solo tienen icono (p. ej. GPS, Medir, Capas, Limpiar mapa) sin texto alternativo.
- **Recomendación:** Añadir siempre `aria-label` descriptivo, por ejemplo:
  - `aria-label="Centrar en mi ubicación"` en el botón GPS.
  - `aria-label="Limpiar mapa"` en el botón de la escoba.
- **Beneficio:** Mejor uso con lectores de pantalla y cumplimiento de buenas prácticas.

### Resultados de búsqueda
- **Situación:** Los resultados se generan como `div` con `data-type` y `data-id`; el checkbox ya no se usa para la acción principal.
- **Recomendación:** Usar `role="listbox"` en el contenedor y `role="option"` en cada ítem, o un `<button>` por resultado para que sea claramente activable por teclado y lector de pantalla.
- **Beneficio:** Navegación por teclado y anunciados correctos.

---

## 5. Estilos y HTML

### Estilos inline en controles del mapa
- **Situación:** En `mapa-ftth.html` los botones del mapa tienen muchos `style="display: flex !important; ..."` inline.
- **Recomendación:** Mover esos estilos a una clase en CSS (p. ej. `.map-controls .map-control-btn`) y usar esa clase en el HTML. Quitar `!important` donde no sea estrictamente necesario.
- **Beneficio:** Más fácil de mantener y de sobrescribir en temas o responsive.

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

## 7. Orden y carga de scripts

### Dependencias explícitas
- **Situación:** Varios scripts dependen de `window.__FTTH_APP__`, `window.__FTTH_CONFIG__`, Firebase, etc., y el orden actual en `mapa-ftth.html` ya lo respeta.
- **Recomendación:** Añadir un comentario breve al inicio del `<head>` o antes de los scripts indicando el orden requerido (config → app → mapa → tools → ui). Si más adelante se usa un bundler, declarar estas dependencias en el módulo de entrada.
- **Beneficio:** Menos riesgo al añadir o reordenar scripts.

---

## 8. Seguridad

### Contenido generado (búsqueda, popups)
- **Situación:** En `ui.buscador.js` se usa `highlightMatch` con `replace(regex, "<mark>$1</mark>")`; el texto viene de datos internos (centrales, cables, cierres, eventos).
- **Recomendación:** Mientras el contenido sea solo de fuentes controladas (Firebase/GeoJSON propios), el riesgo es bajo. Si algún día se muestran textos introducidos por usuarios, escapar HTML (p. ej. función `escapeHtml` que ya existe en tool.cierres) antes de insertar en el DOM.
- **Beneficio:** Evitar XSS si las fuentes de datos cambian.

---

## 9. Código y documentación

### JSDoc en funciones públicas
- **Situación:** Algunas funciones importantes (p. ej. `setSelectedMoleculaForPins`, `enforceOnlyCentralesVisible`, `selectResult`) no tienen JSDoc.
- **Recomendación:** Añadir JSDoc breve a funciones que se usan desde otros módulos o que son “punto de entrada” (parámetros, retorno, un ejemplo de uso si ayuda).
- **Beneficio:** Mejor autocompletado y documentación viva sin alterar comportamiento.

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
