# Análisis: por qué los cambios sugeridos no se ven

Este documento explica **por qué los cambios en el código pueden no reflejarse** en la app (local o Vercel) y cómo comprobarlo.

---

## 1. El código que editas no es el que carga el navegador

### Cómo funciona el proyecto

- La página **mapa-ftth** carga un **único script**: `/ftth-bundle.js`.
- Ese archivo **no existe en el repo** como tal. Se **genera** en el paso de build:
  - **Vite** toma `assets/js/entry-ftth.js` y hace bundle de todos sus `import` (ui.buscador.js, mapa.layers.js, tool.cierres.js, etc.).
  - El resultado se escribe en **`dist/ftth-bundle.js`**.
- En **producción (Vercel)** se sirve la carpeta **`dist/`** (Output Directory = `dist`). El navegador pide `/ftth-bundle.js`, que en realidad es `dist/ftth-bundle.js`.

### Conclusión

- Si **solo** editas archivos en `assets/js/` y **no vuelves a hacer build**, los cambios **no** están en `ftth-bundle.js`.
- Si en **Vercel** el build falla o no se ejecuta, se sirve un `ftth-bundle.js` viejo.

### Qué hacer

1. **Local:** después de cambiar código, ejecutar:
   ```bash
   npm run build
   ```
   y abrir la app sirviendo el contenido de **`dist/`** (no la raíz del repo).
2. **Vercel:** comprobar que cada deploy ejecuta `npm run build` y que el build termina en verde. En el deploy que está en "Current" debe aparecer el commit que incluye tus cambios.

---

## 2. Caché del navegador o del Service Worker

- El HTML en `dist/` incluye algo como:
  - `src="/ftth-bundle.js?v=XXXX"`
- El script `scripts/cache-bust-dist.js` pone un `?v=...` (timestamp o `VERCEL_BUILD_ID`) para que cada nuevo build tenga una URL distinta y el navegador no use un JS viejo en caché.

Si aun así ves comportamiento viejo:

- **Hard refresh:** Ctrl+Shift+R (o Cmd+Shift+R en Mac).
- **Desactivar caché** en DevTools (pestaña Network) y recargar.
- Comprobar si el **Service Worker** está cacheando `ftth-bundle.js` (Application → Service Workers). Dar de baja o “Update on reload” y recargar.

---

## 3. Orden de ejecución al buscar una molécula

Al escribir "SI03" (o CO36, SI05, etc.) y hacer clic en el resultado de tipo **molécula**, el flujo es:

1. `selectResult(result)` con `result.type === "molecula"`, `result.id === "SI03"`.
2. Se debe:
   - Marcar que hay molécula seleccionada (`App._selectedMoleculaForPins = result.id`) **antes** de llamar a `enforceOnlyCentralesVisible()`, para que no oculte otra vez los pines.
   - Poner `__cablesExplicitlyVisible = true`.
   - Llamar a `enforceOnlyCentralesVisible()` (que ya no oculta cierres/eventos si hay molécula seleccionada).
   - Filtrar `geojson-lines` por `_molecula` y poner la capa visible.
   - Llamar a `setSelectedMoleculaForPins(result.id, { keepCablesVisible: true, fromSearch: true })` (visibilidad y filtro de cierres/eventos/geojson-points).
   - Llamar a `showPinsWhenCableActivated(null, result.id)` (solo centrales en visible; cierres/eventos los controla `setSelectedMoleculaForPins`).

Si `_selectedMoleculaForPins` se asignaba **después** de `enforceOnlyCentralesVisible()`, en ese momento aún no había “molécula seleccionada” y se podían ocultar los pines. En el código se ha corregido asignando `App._selectedMoleculaForPins = result.id` **antes** de `enforceOnlyCentralesVisible()` en el bloque `result.type === "molecula"`.

---

## 4. Comprobar que el bundle incluye tus cambios

### En local

1. `npm run build`
2. Buscar en `dist/ftth-bundle.js` un texto que solo exista en tu cambio (por ejemplo un comentario o un string que hayas añadido). Si no está, el build no está usando los últimos archivos.

### En Vercel

1. En el deploy "Current", abrir el commit y ver que es el que tiene tus cambios.
2. En la pestaña del deploy, revisar que el **build** terminó correctamente (Build Logs).
3. En la app en producción, DevTools → Network → recargar y abrir la petición a `ftth-bundle.js?v=...`. Comprobar que la URL tiene un `v` distinto al de antes del último deploy.

---

## 5. Resumen de comprobaciones

| Comprobación | Dónde |
|--------------|--------|
| Build local correcto | `npm run build` sin errores; existe `dist/ftth-bundle.js` y está actualizado |
| Deploy Vercel correcto | Deploy en "Current" corresponde al commit con los cambios; build en verde |
| Caché | Hard refresh; sin caché en DevTools; Service Worker actualizado o desactivado |
| Orden molécula | `App._selectedMoleculaForPins = result.id` antes de `enforceOnlyCentralesVisible()` en el bloque `result.type === "molecula"` |
| No ocultar pines | `enforceOnlyCentralesVisible` no pone cierres/eventos en "none" cuando `App._selectedMoleculaForPins` tiene valor |
| Solo centrales en showPinsWhenCableActivated | En `ui.layers.tree.js` solo se pone en visible la capa de centrales, no cierres/eventos |

Si todo lo anterior es correcto y aún no se ven los cambios, el siguiente paso es reproducir el flujo (buscar molécula, clic) con la consola del navegador abierta y revisar errores o llamadas que no se ejecuten (p. ej. condiciones que fallen).
