# Análisis de rendimiento y buenas prácticas – Flash Fiber FTTH

Resumen de hallazgos tras revisar la carga inicial, red, eventos, código y configuración del proyecto.

---

## 1. Carga inicial y bloqueo de render

### Problemas

- **Scripts síncronos al final del body:** En `pages/mapa-ftth.html` hay ~25 `<script src="...">` sin `defer` ni `async`. El navegador los descarga y ejecuta en orden y bloquea el render hasta que terminen.
- **CSS en head:** 6 hojas (Font Awesome, Mapbox, theme, mobile, layout, map, panels, search). Todas son render-blocking.
- **Sin bundling:** No hay un build (Vite, Webpack, etc.), así que no hay minificación ni tree-shaking; el peso total de JS es alto.

### Recomendaciones

- Añadir **`defer`** a todos los scripts que no dependan del orden de ejecución inmediato (p. ej. Mapbox, Turf, módulos de mapa/tools). Mantener sin `defer` solo los que deban ejecutarse en orden (config, initializer, app).
- Valorar **cargar Font Awesome** solo cuando haga falta o usar un subset (solo los iconos usados).
- A medio plazo: **build con Vite o similar** para minificar, code-split por ruta y reducir tamaño total.

---

## 2. Red y fetches

### Problemas

- **Buscador – índice de cables:** En `ui.buscador.js`, `walkTreeForCables()` recorre el árbol y hace **un `fetch()` por cada archivo GeoJSON de cable** (decenas o más). Además se usa `cache: "no-store"`, por lo que no se aprovecha la caché del navegador.
- **Muchos GeoJSON:** Hay 500+ archivos en `geojson/`. Tanto el buscador como `mapa.layers.js` (consolidación) pueden disparar muchas peticiones.
- **Service Worker:** En `sw.js` se excluyen las peticiones a `geojson` del cacheado útil en algunos casos; los JSON/GeoJSON podrían cachearse para evitar repetir descargas.

### Recomendaciones

- **Índice de cables único:** Generar (en build o con un script) un único JSON con la lista de cables y metadatos (id, nombre, layerId, coordenadas, molécula). El buscador cargaría solo ese archivo en lugar de un fetch por cable.
- **Quitar `cache: "no-store"`** en los fetch de GeoJSON del buscador (o usar `default` / `force-cache` con revalidación) para aprovechar caché del navegador.
- **Cache en Service Worker** para GeoJSON estáticos: estrategia “cache first” o “stale-while-revalidate” para `/geojson/**`.
- En **mapa.layers.js**, la consolidación ya evita duplicados con `loadedUrls`; mantener ese patrón y evitar fetches redundantes en otras partes.

---

## 3. Event listeners y ciclo de vida del mapa

### Problemas

- **Varios `map.on("click", ...)`:** Cierres, eventos, rutas, medición y navegación registran listeners sobre el mismo mapa. Si algún módulo se inicializa más de una vez (p. ej. tras `style.load`), se pueden **acumular listeners** sin hacer `.off()` antes.
- **Re-inicialización en `style.load`:** En `tool.cierres.js`, `tool.eventos.js`, `tool.medicion.js`, `tool.rutas.js` se llama de nuevo a la lógica de capas o de click cuando el estilo se recarga. Si no se desregistran los listeners anteriores, se duplican.
- **`setInterval` en árbol de capas:** En `ui.layers.tree.js` hay un `setInterval(..., 500)` que puede ejecutarse hasta 10 segundos para “esperar capas consolidadas”. Aumenta uso de CPU y complejidad.

### Recomendaciones

- Antes de registrar listeners en `style.load`, **guardar referencias a los handlers** y llamar a `map.off("click", handler)` (o el evento que sea) para evitar duplicados.
- Centralizar **un solo listener de `map.on("click")`** que reparta por capa/objetivo (delegación), o asegurar que cada tool solo se registre una vez y se desregistre al desactivarse.
- Sustituir el `setInterval` del árbol por **una promesa o un callback** cuando `App.__ftthLayerIds` esté listo (p. ej. evento personalizado o flag que el módulo de capas dispare al terminar de cargar).

---

## 4. Malas prácticas de código

### Problemas

- **Token Mapbox en código:** En `config.js` hay un token por defecto en claro. Aunque existe `config.local.js` para producción, es fácil que se suba el token en algún clone. Debe estar solo en variables de entorno o en `config.local` (ya en .gitignore).
- **Muchos `console.log` en producción:** Facilita fugas de información y algo de overhead. Mejor no depender de ellos en producción.
- **Estado global en `window`:** `__FTTH_APP__`, `__FTTH_CONFIG__`, `__FTTH_DB__`, `FTTH_FIREBASE`, etc. Funciona, pero dificulta pruebas y mantenimiento. Un único namespace (p. ej. `window.FTTH`) reduce colisiones.
- **Inicialización con bucles de espera:** Varios módulos usan `for (let i = 0; i < maxAttempts; i++) { await new Promise(resolve => setTimeout(resolve, 100)); }` para esperar a `App.map`. Aumenta la latencia percibida; mejor un sistema de “ready” (evento o promesa) que el resto de módulos escuchen.
- **IDs en popups:** Se pasó a `data-pin-action` para evitar conflictos; bien. Revisar que no queden otros `getElementById` sobre elementos generados dinámicamente que puedan repetirse.

### Recomendaciones

- **Token:** No dejar valor por defecto en el repo; exigir `config.local.js` o variable de entorno en producción.
- **Logs:** Usar un pequeño wrapper que en producción no llame a `console.log` (o solo en modo “debug”).
- **Estado global:** Agrupar en `window.FTTH = { app, config, db, firebase }` y migrar referencias poco a poco.
- **Espera a App.map:** Un único “map ready” (evento o promesa) y que cada módulo se suscriba una vez, sin bucles de 100 ms.

---

## 5. DOM y actualización de UI

### Problemas

- **`innerHTML` para listas:** En el buscador y en el árbol de capas se usa `innerHTML` para renderizar listas completas. Cada asignación fuerza reflow y puede ser costosa con muchos elementos.
- **Recrear todo el árbol:** Si el árbol se vuelve a pintar entero en cada cambio, con muchas capas el coste sube.

### Recomendaciones

- Para listas muy largas (p. ej. muchos resultados de búsqueda), considerar **solo renderizar los visibles** (virtualización) o limitar el número de nodos mostrados.
- Usar **DocumentFragment** al construir varios nodos y luego un solo `appendChild` para reducir reflows.
- Evitar actualizar el árbol completo si solo cambia el estado de una capa (checkbox); actualizar solo ese nodo cuando sea posible.

---

## 6. Firebase

### Comportamiento actual

- **onSnapshot** para cierres y eventos mantiene escuchas en tiempo real; es adecuado para datos que cambian seguido.
- No se observa paginación ni límite en las lecturas; si la colección crece mucho, el coste de lecturas y el tamaño de datos en cliente pueden crecer.

### Recomendaciones

- Valorar **límite o paginación** en las consultas (p. ej. `limit(50)` y “cargar más”) si el número de cierres/eventos puede ser muy alto.
- Asegurar **índices** en Firestore para las consultas que se usen (por central, molécula, etc.) para evitar lecturas lentas.

---

## 7. Service Worker y caché

### Problemas

- **STATIC_ASSETS** incluye pocos JS (app, config, errorHandler, validators); el resto de scripts no se cachean en la instalación.
- Las peticiones a `geojson` se manejan con “network first”; en conexiones lentas cada visita puede volver a descargar muchos GeoJSON.

### Recomendaciones

- Incluir en precache (o en una estrategia de “cache first”) los JS y CSS críticos de la página del mapa para que la segunda carga sea más rápida.
- Para GeoJSON estáticos, **cachear en SW** con “cache first” y versión/cache name que se invalide al desplegar una nueva versión.

---

## 8. Resumen de prioridades

| Prioridad | Acción |
|----------|--------|
| Alta     | Índice único de cables para el buscador (un fetch en lugar de N). |
| Alta     | Añadir `defer` a scripts no críticos y evitar re-registrar listeners en `style.load` sin `.off()`. |
| Media    | Quitar `cache: "no-store"` en fetches de GeoJSON del buscador; cachear GeoJSON en SW. |
| Media    | Sustituir `setInterval` del árbol de capas por evento/callback de “capas listas”. |
| Media    | Reducir o envolver `console.log` en producción; no dejar token por defecto en repo. |
| Baja     | Namespace único en `window`; DocumentFragment/virtualización en listas grandes; build con minificación y code-split. |

---

## 9. Checklist rápido

- [x] Scripts con `defer` donde sea posible (aplicado en mapa-ftth.html: libs, config, app, mapa, tools, UI).
- [x] Un solo fetch para el índice de cables del buscador (cables-index.json + script `node scripts/build-cables-index.js`; fallback al árbol). Ejecutar el script cuando se añadan o cambien cables en geojson.
- [x] Listeners del mapa desregistrados antes de volver a registrarlos en `style.load` (tool.cierres.js y tool.eventos.js: referencias a handlers y .off() antes de .on()).
- [x] Árbol de capas sin setInterval: evento `ftth-consolidated-layers-ready` desde mapa.layers.js y mapa.ftth.js; fallback setTimeout 10 s.
- [x] Sin token Mapbox por defecto en el código versionado (config.js usa SECRETS.MAPBOX_TOKEN solo; config.local.example.js documenta DEBUG).
- [ ] Service Worker cacheando GeoJSON estáticos y más assets críticos.
- [x] Logs en producción: CONFIG.DEBUG y __FTTH_LOG__(level, ...) para reducir ruido; sin token hardcodeado.
- [ ] Árbol de capas sin `setInterval` de espera larga.

Este documento se puede usar como guía para ir aplicando mejoras de rendimiento y buenas prácticas de forma incremental.
