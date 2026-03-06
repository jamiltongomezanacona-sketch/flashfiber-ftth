# Depuración de código – Cambios enumerados

Lista de cambios propuestos para depurar y mejorar el proyecto. Aplicar en el orden indicado o por lotes según prioridad.

---

## 1. **tool.eventos.js – Unificar generación de moléculas**

- **Ubicación:** `assets/js/tools/tool.eventos.js` (aprox. líneas 747-756).
- **Problema:** CUNI usa un array hardcodeado `CU01..CU45` y el resto usa `generarMoleculas(prefijo)`. Como en `centrales.js` ya existe `CU: 45` y `MU: 45`, la lista se puede generar siempre con `generarMoleculas(prefijo)`.
- **Cambio:** Sustituir el bloque condicional `prefijo === "CU" ? Array.from(...) : generarMoleculas(prefijo)` por una sola llamada `generarMoleculas(prefijo)`.
- **Beneficio:** Menos duplicación y una sola fuente de verdad para el número de moléculas por central.

---

## 2. **centrales.js – Quitar `export {}` redundante**

- **Ubicación:** `assets/js/utils/centrales.js` (última línea).
- **Problema:** El archivo es IIFE y expone todo en `window.__FTTH_CENTRALES__`. El `export {}` solo sirve para que el bundler lo trate como módulo; no exporta nada real.
- **Cambio:** Mantener `export {}` (el bundle lo importa como módulo) o, si el bundler no lo exige, eliminarlo. Opcional: documentar en comentario que el `export {}` es solo para compatibilidad con el entry ESM.
- **Beneficio:** Código más claro; evita dudas sobre si hay un export real.

---

## 3. **build-cables-index.js – Evitar warning en BA01**

- **Ubicación:** `scripts/build-cables-index.js` (función `walkTree`, cuando lee capas).
- **Problema:** Para BACHUE/BA01, `node.path` puede ser la cadena `"cables"` (carpeta) en lugar de un archivo `.geojson`, y se llama `fs.readFileSync(filePath)` con una ruta de directorio → error "EISDIR: illegal operation on a directory".
- **Cambio:** Antes de leer, comprobar que el `node.path` termina en `.geojson` (o que `fs.statSync(filePath).isFile()`), y si es directorio, omitir o hacer `continue` sin intentar leer.
- **Beneficio:** El script termina sin warnings y no intenta leer carpetas como si fueran archivos.

---

## 4. **Consola – Reducir logs en producción (opcional)**

- **Ubicación:** Múltiples archivos (`tool.eventos.js`, `mapa.init.js`, `ui.buscador.js`, `mapa.layers.js`, etc.).
- **Problema:** Hay muchos `console.log` / `console.warn` útiles en desarrollo pero ruidosos en producción.
- **Cambio:** Envolver logs de depuración en un helper, por ejemplo `if (window.__FTTH_DEBUG__) console.log(...)` o usar `config.js` con `DEBUG: false` y un pequeño wrapper. No eliminar `console.error` ni avisos críticos.
- **Beneficio:** Menos ruido en consola para usuarios finales; depuración sigue disponible con un flag.

---

## 5. **Constantes para timeouts de “Copiar coordenada”**

- **Ubicación:** `mapa.init.js` (1500 ms), `tool.eventos.js` (1500 ms), `tool.cierres.js` (1500 ms), `tool.navegacion.js` (2000 ms).
- **Problema:** El tiempo que se muestra “¡Copiado!” está repetido como número mágico en varios sitios.
- **Cambio:** Definir una constante compartida, por ejemplo en `config.js`: `UI_COPY_FEEDBACK_MS = 1500`, y usarla en todos los botones de copiar coordenadas.
- **Beneficio:** Un solo lugar para cambiar el feedback y comportamiento uniforme.

---

## 6. **tool.rutas.js – Reemplazar timeouts fijos por evento “map ready”**

- **Ubicación:** `assets/js/tools/tool.rutas.js` (aprox. líneas 357, 362, 371): `setTimeout(startFirebaseRutasSync, 800)` y `500`.
- **Problema:** Se usa un retraso arbitrario para dar tiempo a que el mapa/Firebase estén listos.
- **Cambio:** Si existe un evento tipo `ftth-map-ready` o similar, suscribirse a él para llamar a `startFirebaseRutasSync` en lugar de depender de 500/800 ms.
- **Beneficio:** Menos fragilidad ante carga lenta y código más predecible.

---

## 7. **mapa.layers.js – Constantes para retrasos de carga**

- **Ubicación:** `assets/js/map/mapa.layers.js`: varios `setTimeout(..., 100)`, `500`, `1000`, `1500`, `2000`, `2800`.
- **Problema:** Números mágicos para reintentos y visibilidad de capas.
- **Cambio:** Definir constantes al inicio del módulo (o en config), por ejemplo `LOAD_RETRY_DELAY_MS`, `ENFORCE_VISIBILITY_DELAY_MS`, etc., y usarlas en los `setTimeout`.
- **Beneficio:** Más legible y fácil de ajustar sin tocar varias líneas.

---

## 8. **Referencias a “HITHUB” / “HIIT HUB” (documentación)**

- **Ubicación:** Solo en mensajes del usuario; no hay texto “HITHUB” o “HIIT HUB” en el código.
- **Cambio:** Ninguno en código. Si en algún README o comentario aparece “HITHUB”, corregir a “GitHub”.
- **Beneficio:** Consistencia en la documentación.

---

## Resumen por prioridad

| # | Prioridad | Esfuerzo | Impacto |
|---|-----------|----------|---------|
| 1 | Alta     | Bajo     | Menos duplicación, lógica centralizada |
| 2 | Baja     | Muy bajo | Claridad del módulo |
| 3 | Alta     | Bajo     | Script sin warnings |
| 4 | Media    | Medio    | Mejor experiencia en producción |
| 5 | Media    | Bajo     | Mantenibilidad |
| 6 | Media    | Medio    | Robustez al cargar mapa |
| 7 | Baja     | Bajo     | Legibilidad y configuración |
| 8 | Baja     | Muy bajo | Solo docs si aplica |

Recomendación: aplicar primero **1**, **2** y **3**; luego **5** y **7** si se quiere unificar constantes; **4** y **6** cuando se priorice producción y carga del mapa.
