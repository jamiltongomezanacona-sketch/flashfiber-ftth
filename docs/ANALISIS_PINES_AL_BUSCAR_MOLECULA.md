# Análisis: pines visibles al primer clic en molécula

## Problema

Al buscar una molécula (ej. SI03, CO35), dar clic en el resultado y hacer zoom:
- **Sí aparece:** el cable (línea en el mapa).
- **No aparecen a la primera:** los pines (cierres, eventos, comentarios).
- **Sí aparecen:** si el usuario vuelve a escribir la misma molécula y vuelve a dar clic.

Se quiere que **en el primer clic** ya se vean cable + todos los pines, para **todas las moléculas**.

---

## Causas identificadas

### 1. **Capas de cierres/eventos aún no creadas**
- Las capas `cierres-layer` y `eventos-layer` se crean en `tool.cierres` y `tool.eventos` cuando el mapa dispara `"load"` (estilo cargado).
- Si el usuario busca y hace clic **antes** de que el estilo haya cargado (o antes de que los tools hayan ejecutado `initLayer()`), `App.map.getLayer(LAYER_CIERRES)` devuelve `false` y no se aplica ni visibilidad ni filtro.
- Hoy hay reintentos a 400 ms, 900 ms y 2000 ms; si las capas se crean después de 2000 ms (red/device lento), los pines no llegan a aplicarse.

### 2. **Datos de Supabase aún no recibidos**
- Los cierres/eventos llegan por Supabase Realtime y por la carga inicial (`fetchInitialCierres` / `fetchInitialEventos`).
- Si el usuario hace clic **antes** de que llegue la primera tanda de datos, la capa existe pero el `source` está vacío: se aplica filtro y visibilidad pero no se dibuja ningún pin.
- Cuando más tarde llegan los datos, se hace `refreshLayer()` y se dispara `ftth-cierres-layer-refreshed` / `ftth-eventos-layer-refreshed` para reaplicar el filtro. Si el listener del buscador se registró **después** de ese primer refresh, no reaplica y los pines siguen ocultos hasta un segundo clic.

### 3. **Orden de ejecución en el primer clic**
- Se llama a `setSelectedMoleculaForPins(result.id, { fromSearch: true })` de forma síncrona tras hacer clic.
- Si en ese momento `!App.map.isStyleLoaded()`, se programa un único re-intento en `map.once("load", ...)` y no se aplica nada hasta que dispare `"load"`. Si en ese momento las capas aún no existen (porque los tools las crean en el mismo `"load"`), vuelve a darse el caso de la causa 1.

### 4. **Un solo reaplicado al recibir datos**
- Solo se reaplica al recibir `ftth-cierres-layer-refreshed` / `ftth-eventos-layer-refreshed`. Si esos eventos se disparan antes de que el buscador haya registrado los listeners (init asíncrono), el primer “refill” de datos no provoca reaplicación y los pines no se muestran hasta que el usuario interactúa de nuevo (p. ej. segundo clic en la misma molécula).

---

## Soluciones propuestas (enumeradas)

### Solución 1: Aplicar filtro de pines cuando el mapa esté en estado "idle"
- Tras hacer clic en resultado tipo molécula, además de aplicar de inmediato, programar **una aplicación cuando el mapa dispare `"idle"`** (estilo cargado y primer frame pintado).
- Así se aplica filtro/visibilidad de pines cuando las capas ya suelen existir y el mapa está estable.
- **Archivos:** `ui.buscador.js` (en el bloque `result.type === "molecula"`).

### Solución 2: Reintentos más numerosos y escalonados
- Aumentar reintentos (p. ej. 200, 400, 800, 1500, 3000, 5000 ms) cuando `pinsLayersApplied === 0`.
- Reduce la probabilidad de que las capas se creen después del último reintento.
- **Archivos:** `ui.buscador.js` (función `setSelectedMoleculaForPins`).

### Solución 3: Asegurar que las capas existan al seleccionar molécula desde búsqueda
- Exponer `initLayer` o `ensureLayer` en `App.tools.cierres` y `App.tools.eventos`.
- Antes (o justo después) de llamar a `setSelectedMoleculaForPins` desde el clic en molécula/cable, llamar a esos métodos si las capas no existen, para crearlas de inmediato en lugar de depender solo de reintentos.
- **Archivos:** `tool.cierres.js`, `tool.eventos.js`, `ui.buscador.js`.

### Solución 4: Reaplicar filtro de pines tras "idle" con pequeño retraso
- Tras aplicar en el clic, hacer `map.once("idle", () => setTimeout(() => setSelectedMoleculaForPins(...), 100))` para dar tiempo a que los sources se rellenen y las capas se pinten.
- Complementa la Solución 1 y ayuda cuando los datos llegan justo después del primer paint.
- **Archivos:** `ui.buscador.js`.

### Solución 5: Forzar refresh de capas tras aplicar filtro por molécula
- Después de `setSelectedMoleculaForPins` en el flujo de búsqueda, disparar un evento (o llamar a `refreshLayer` si se expone) para cierres y eventos, de modo que el mapa vuelva a pintar con el filtro ya aplicado.
- Útil cuando los datos ya están en memoria pero el render no ha actualizado.
- **Archivos:** `ui.buscador.js`, opcionalmente `tool.cierres.js` / `tool.eventos.js` si se expone un “refresh” desde el buscador.

### Solución 6: Registrar listeners de "layer-refreshed" lo antes posible
- Registrar los listeners `ftth-cierres-layer-refreshed` y `ftth-eventos-layer-refreshed` en cuanto exista el buscador (p. ej. al inicio del init del buscador), antes de cargar cierres/eventos/rutas, para no perder el primer refresh.
- **Archivos:** `ui.buscador.js` (orden dentro de `init`).

### Solución 7: Pre-cargar capas al enfocar el buscador o al mostrar resultados
- Al abrir el panel de búsqueda o al recibir la primera lista de resultados que incluya una molécula, llamar a `ensureLayer` / `initLayer` de cierres y eventos (si están expuestos) para que las capas existan antes del primer clic.
- **Archivos:** `ui.buscador.js`, y tools si exponen init/ensure.

### Solución 8: Unificar aplicación en "idle" + reintentos + reaplicar en "layer-refreshed"
- Combinar: (a) aplicar pines en el clic; (b) aplicar de nuevo en `map.once("idle", ...)` con un pequeño `setTimeout`; (c) mantener reintentos si `pinsLayersApplied === 0`; (d) mantener y asegurar listeners de `ftth-*-layer-refreshed` para reaplicar cuando lleguen datos.
- Da robustez frente a capas creadas tarde, datos tardíos y orden de carga del buscador.
- **Archivos:** `ui.buscador.js`, y opcionalmente tools para Solución 3.

---

## Recomendación de implementación

- **Fase 1 (rápida):** Solución 1 + Solución 4 + Solución 6 (aplicar en "idle", reaplicar con delay, y listeners de layer-refreshed registrados pronto).
- **Fase 2 (más robusta):** Solución 2 (más reintentos) y Solución 3 (forzar creación de capas desde el buscador).
- **Fase 3 (opcional):** Solución 5 o 7 si sigue habiendo casos donde los pines no aparecen a la primera.

Con esto se cubren todas las moléculas porque la lógica es la misma para cualquier valor de `_selectedMoleculaForPins` (SI03, CO35, etc.).
