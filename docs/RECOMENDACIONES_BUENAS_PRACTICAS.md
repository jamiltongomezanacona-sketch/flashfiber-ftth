# Recomendaciones de buenas prácticas – FlashFiber FTTH

Barrido del proyecto (estructura, seguridad, rendimiento, accesibilidad, errores, mantenibilidad, testing, SEO/PWA). Ítems accionables enumerados con prioridad y esfuerzo.

---

## 1. Estructura

| # | Recomendación | Prioridad | Esfuerzo | Impacto |
|---|----------------|-----------|----------|---------|
| 1.1 | Añadir `description` en `package.json` y, si aplica, `repository`/`keywords` para claridad del proyecto. | Baja | Bajo | Mejor documentación y descubribilidad. |
| 1.2 | En `vercel.json`, `outputDirectory` es `"."`. Confirmar que el build copia o expone `dist/ftth-bundle.js` en la raíz (o ajustar rewrites/rutas) para que las páginas que cargan `/dist/ftth-bundle.js` lo encuentren en producción. | Alta | Bajo | Evitar 404 del bundle en producción. |
| 1.3 | Unificar convención de rutas en `entry-ftth.js`: coherencia con `vite.config.js` (root `"."`, input `assets/js/entry-ftth.js`). | Media | Bajo | Menos confusión y errores de rutas. |
| 1.4 | Documentar en README o ARCHITECTURE.md el flujo de carga (config → initializer → Firebase → app → mapa → tools → ui) descrito en `entry-ftth.js`. | Baja | Bajo | Facilita onboarding y mantenimiento. |

---

## 2. Seguridad

| # | Recomendación | Prioridad | Esfuerzo | Impacto |
|---|----------------|-----------|----------|---------|
| 2.1 | Eliminar credenciales Firebase por defecto en código: en `firebase.js` y `config.local.example.js` no incluir `apiKey` ni datos reales; dejar placeholders y exigir `config.local.js` o variables de entorno. | Alta | Bajo | Evitar exposición de credenciales. |
| 2.2 | En `write-config-production.js`, no escribir `config.production.js` con token vacío sin fallar el build o advertir (p. ej. `process.exit(1)` si `!token` en producción). | Alta | Bajo | Evitar despliegues sin configuración. |
| 2.3 | En `ui.buscador.js`, escapar siempre el texto antes de `highlightMatch` y asignar a `innerHTML` (función `escapeHtml` compartida) para evitar XSS si `displayName` llegara de fuentes no confiables. | Alta | Medio | Mitigar XSS en resultados de búsqueda. |
| 2.4 | En `highlightMatch`, escapar el string de búsqueda antes de `new RegExp(query, "gi")` para evitar metacaracteres que rompan la regex. | Media | Bajo | Evitar errores y comportamiento inesperado. |
| 2.5 | Añadir reglas de Firebase (Firestore y Storage) en el proyecto (`firestore.rules`, `storage.rules`) y documentar su ubicación. | Alta | Medio | Control de acceso y seguridad en backend. |

---

## 3. Rendimiento

| # | Recomendación | Prioridad | Esfuerzo | Impacto |
|---|----------------|-----------|----------|---------|
| 3.1 | En `mapa-ftth.html`, añadir `defer` explícito al script del bundle para consistencia con Mapbox/Turf/config. | Media | Bajo | Orden de carga predecible. |
| 3.2 | Valorar code-splitting o lazy load por ruta: cargar `tool.diseno-mapa.js`, `tool.rutas.js` o módulos pesados solo al abrir el panel (dynamic `import()`). | Media | Alto | Menor tiempo de carga inicial. |
| 3.3 | El caché del buscador (`searchResultCache`) no tiene límite; añadir máximo (p. ej. LRU ~50–100 entradas) para no crecer indefinidamente. | Baja | Bajo | Menor uso de memoria. |
| 3.4 | Revisar `fetch(..., { cache: "default" })` en buscador y tool.capas; usar `cache: "reload"` solo donde se necesiten datos más frescos. | Baja | Bajo | Equilibrio rendimiento / datos actualizados. |
| 3.5 | Documentar el debounce de resize (150 ms) en `app.js` y mantener un único punto de configuración si se añaden más debounces. | Baja | Bajo | Consistencia y mantenibilidad. |

---

## 4. Accesibilidad

| # | Recomendación | Prioridad | Esfuerzo | Impacto |
|---|----------------|-----------|----------|---------|
| 4.1 | En `mapa-ftth.html` y `mapa-corporativo.html`, el input de búsqueda principal debería tener `aria-label` (ej. "Buscar direcciones, cables, cierres o eventos"). | Media | Bajo | Mejor contexto para lectores de pantalla. |
| 4.2 | Paneles (capas, diseño de mapa, evento): gestionar foco al abrir/cerrar (focus trap o devolver foco al botón) y, si son modales, `aria-modal="true"`, `role="dialog"`, `aria-labelledby`/`aria-describedby`. | Media | Medio | Navegación por teclado y AT coherente. |
| 4.3 | Revisar contraste de texto en botones y badges respecto a fondos oscuros para WCAG 2.1 AA (mín. 4.5:1 texto normal). | Media | Medio | Accesibilidad visual. |
| 4.4 | Listas con `role="listbox"`/`role="option"`: añadir navegación por teclado (flechas, Enter para seleccionar) además del clic. | Media | Medio | Uso sin ratón. |
| 4.5 | Mantener `aria-live="polite"` en actualizaciones de coordenadas y evitar actualizaciones demasiado frecuentes. | Baja | Bajo | Buen uso de live regions. |

---

## 5. Manejo de errores

| # | Recomendación | Prioridad | Esfuerzo | Impacto |
|---|----------------|-----------|----------|---------|
| 5.1 | Estandarizar `ErrorHandler.handle` y `ErrorHandler.getUserMessage` en flujos críticos (guardar cierre/evento, subida de archivos, Firebase); evitar solo `console.error` o `catch` vacío. | Alta | Medio | Errores visibles y trazables. |
| 5.2 | Evitar `catch (e) {}` o `catch (_) {}` sin al menos log o `ErrorHandler.handle`; sustituir por manejo mínimo. | Alta | Bajo | Mejor diagnóstico y resiliencia. |
| 5.3 | Reutilizar `validators` en todos los formularios que envíen datos a Firebase y mostrar al usuario el `error` del validador. | Media | Medio | Validación consistente y mensajes claros. |
| 5.4 | En `ErrorHandler.getUserMessage`, ampliar mapeo de códigos Firebase (`permission-denied`, `unauthenticated`, `quota-exceeded`) con mensajes en español accionables. | Media | Bajo | Mejor UX ante fallos de red/auth/cuota. |

---

## 6. Mantenibilidad

| # | Recomendación | Prioridad | Esfuerzo | Impacto |
|---|----------------|-----------|----------|---------|
| 6.1 | Extraer utilidad global `escapeHtml` (p. ej. `utils/dom.js` o `utils/sanitize.js`) y usarla en tool.cierres, tool.eventos y reflectometria; evitar duplicación. | Alta | Bajo | Un solo punto para XSS y menos duplicación. |
| 6.2 | Sustituir números mágicos en `mapa.layers.js` (timeouts, colores) por constantes con nombre al inicio del módulo o en `config.js`. | Media | Medio | Código más legible y fácil de ajustar. |
| 6.3 | Añadir JSDoc a funciones públicas y módulos que aún no lo tienen (mapa.layers, ui.buscador, tool.capas). | Media | Medio | Mejor IDE, refactors y onboarding. |
| 6.4 | Documentar en README o comentarios el propósito de `window.__FTTH_APP__`, `window.__FTTH_VALIDATORS__`, `window.ErrorHandler` y otros globales. | Baja | Bajo | Mantenimiento más seguro. |

---

## 7. Testing

| # | Recomendación | Prioridad | Esfuerzo | Impacto |
|---|----------------|-----------|----------|---------|
| 7.1 | Introducir runner de tests (Jest o Vitest) y al menos un test smoke que importe el bundle o entry y compruebe que no lanza en carga. | Media | Medio | Detección de regresiones en integración. |
| 7.2 | Añadir tests unitarios para `validators.js` (coordenadas, archivo, texto, email, codigoCierre). | Alta | Bajo | Validaciones correctas y refactors seguros. |
| 7.3 | Añadir tests para `centrales.js` (`generarMoleculas`, prefijos). | Media | Bajo | Misma ventaja que 7.2. |
| 7.4 | Testear `ErrorHandler.getUserMessage` con distintos tipos de error para asegurar mensajes esperados. | Baja | Bajo | Mensajes de error consistentes. |

---

## 8. SEO y PWA

| # | Recomendación | Prioridad | Esfuerzo | Impacto |
|---|----------------|-----------|----------|---------|
| 8.1 | Añadir en todas las páginas principales `<meta name="description" content="...">` con descripción única por página. | Media | Bajo | Mejor SEO y preview en redes/búsqueda. |
| 8.2 | En mapa-ftth y mapa-corporativo enlazar manifest y `theme-color` como en index.html para PWA consistente. | Media | Bajo | Misma experiencia de “app” en todas las rutas. |
| 8.3 | Revisar que el service worker incluya en caché la ruta real del bundle en producción (`/dist/ftth-bundle.js`) para que el mapa funcione offline. | Alta | Bajo | PWA útil en mapa FTTH. |
| 8.4 | Valorar `start_url` en manifest según estado de auth o documentar el flujo esperado al instalar la PWA. | Baja | Bajo | Comportamiento de instalación más claro. |

---

## Resumen por prioridad

| Prioridad | Cantidad | Ítems |
|-----------|----------|--------|
| **Alta** | 10 | 1.2, 2.1, 2.2, 2.3, 2.5, 5.1, 5.2, 6.1, 7.2, 8.3 |
| **Media** | 18 | 1.3, 2.4, 3.1, 3.2, 4.1–4.4, 5.3, 5.4, 6.2, 6.3, 7.1, 7.3, 8.1, 8.2 |
| **Baja** | 10 | 1.1, 1.4, 3.3–3.5, 4.5, 6.4, 7.4, 8.4 |

---

*Documento generado a partir del barrido del código en febrero 2026. Aplicar de forma incremental.*
