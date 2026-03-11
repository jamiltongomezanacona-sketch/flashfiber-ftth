# Límites y umbrales – ¿Cuántos datos más hasta que se bloquee?

Resumen de los límites actuales en el código y a partir de qué volumen de datos la app puede bloquearse o degradarse **tal como está**.

---

## 1. Buscador (ui.buscador.js)

| Dato | Límite en código | ¿Se bloquea? |
|------|------------------|----------------|
| **Caché de búsqueda** | `SEARCH_CACHE_MAX = 50` entradas. Al llegar a 50 se borra la más antigua (FIFO). | **No.** El caché no crece indefinidamente. |
| **Resultados mostrados** | Direcciones: hasta `GEOCODE_LIMIT` (5). Índice (cables, centrales, cierres, eventos): hasta `SEARCH_MAX_RESULTS` (20), más “relacionados” por cable. Total en DOM suele ser &lt; 50 ítems. | **No.** Hay tope y pocos nodos DOM. |
| **Índice en memoria** | `searchIndex`: centrales + cables + cierres + eventos. Sin tope; crece con lo que venga de GeoJSON y Firebase. | Con **miles** de cables + cierres + eventos, el filtrado en cada tecleo puede notarse (~100–300 ms). No suele “bloquear” la UI porque hay debounce 300 ms. |

**Conclusión:** El buscador está acotado (caché 50, resultados mostrados ~20–50). Hace falta **muchos** elementos en el índice (miles) para notar lentitud; no hay un “número mágico” que bloquee.

---

## 2. Cierres y eventos en el mapa (tool.cierres.js / tool.eventos.js)

| Dato | Límite en código | ¿Se bloquea? |
|------|------------------|----------------|
| **Cantidad en `App.data.cierres` / `App.data.eventos`** | **Ninguno.** Se añaden todos los que llegan de Firebase. | Con **~500–1000** puntos, cada `setData` (cada 400 ms en rachas) puede tardar 50–200 ms. Con **~2000–5000+** puntos, el mapa puede volverse lento al mover/zoom y al actualizar la capa. |
| **Throttle setData** | 400 ms: solo un `setData` cada 400 ms aunque lleguen muchos eventos. | Evita bloqueos por muchas actualizaciones seguidas; no limita el **tamaño** del FeatureCollection. |

**Conclusión:** No hay límite de “cuántos cierres/eventos”. El cuello de botella es **Mapbox** (símbolos + datos en una sola capa). Orden de magnitud: **por encima de ~1000–2000** puntos en la misma capa se puede notar; **5000+** es cuando más riesgo de sensación de “bloqueo” o tirones.

---

## 3. GeoJSON consolidado y capas (mapa.layers.js)

| Dato | Límite en código | ¿Se bloquea? |
|------|------------------|----------------|
| **Consolidado pre-generado** | Un solo archivo; sin tope de features. | Con **~1000** features (como ahora) va bien. Con **~5000–10000+** la carga inicial y el dibujado pueden tardar varios segundos. |
| **Capas dinámicas (árbol)** | Cada capa puede tener cientos de features; sin tope en código. | Igual que arriba: muchas features por capa = más tiempo de `addSource`/`addLayer` y de render. |
| **Centrales, MUZU, CHICO** | Sin tope. | Típicamente son decenas o pocas centenas; no suelen ser el problema. |

**Conclusión:** El límite es de **rendimiento** (tiempo de carga y de frame), no un “bloqueo” fijo. A partir de **varios miles** de features en total (o por capa) la app puede sentirse lenta.

---

## 4. Firebase (Firestore / Storage)

### 4.1 Uso y costo (lecturas Firestore)

Si en la consola de Firebase ves que se **superó la cuota gratuita de lecturas** (p. ej. "73k en los últimos 7 días") y aparece costo del proyecto:

- **Causa:** La app usa `onSnapshot` en colecciones completas (cierres, eventos, eventos_corporativo, rutas). Cada vez que se abre el mapa o un panel que escucha una colección, Firestore cobra **1 lectura por documento** en la carga inicial. Varias pestañas o muchos usuarios multiplican las lecturas.
- **Qué hacer:**
  1. **Consola Firebase** → **Uso y facturación** → Revisar "Operaciones de lectura" y poner una **alerta de presupuesto** en Google Cloud (Cloud Billing → Alertas).
  2. En los servicios Firebase (`firebase.cierres.js`, `firebase.eventos.js`, etc.) se puede usar un **límite por colección** (`FIRESTORE_READ_LIMIT`). Con límite (p. ej. 2000), la carga inicial de cada listener cobra como máximo esa cantidad de lecturas por colección.
  3. Cerrar pestañas del mapa cuando no se usen y evitar muchas sesiones con listeners activos.

### 4.2 Límites por colección

| Dato | Límite | ¿Se bloquea? |
|------|--------|----------------|
| **Documentos en colección** | Límite de Firestore: 1 M de documentos por colección. En la app no hay paginación: se escucha la colección entera. | Con **miles** de documentos, cada cambio dispara un snapshot grande; el cuello de botella pasa a ser el **cliente** (procesar y pintar en mapa), no “bloqueo” de Firebase. |
| **Tamaño de documento** | 1 MB por documento. | Si cada cierre/evento es pequeño (&lt; 1 KB), hace falta **muy grande** número de documentos para acercarse al límite. |
| **Storage (fotos)** | Límites de uso/cuota del proyecto. | No hay límite en código por “cuántas fotos más”; el bloqueo sería por cuota o por ancho de banda. |

**Conclusión:** Para que “se bloquee” por datos, haría falta un volumen muy alto (decenas de miles de cierres/eventos y/o fotos). Lo que antes suele fallar es el **rendimiento del mapa y de la UI**, no un límite duro de Firebase en el cliente.

---

## 5. Resumen: “¿Cuántos datos más para que se bloquee?”

- **Buscador:** Caché y resultados ya limitados (50 y ~20–50). Hace falta **muchos** ítems en el índice (miles) para notar lentitud; no hay un número concreto que “bloquee”.
- **Cierres/eventos en mapa:** Sin límite en código. Orden de magnitud: **~1000–2000** puntos = puede notarse; **~5000+** = riesgo claro de tirones o sensación de bloqueo.
- **GeoJSON / capas:** Sin tope en código. **Varios miles** de features (p. ej. 5000–10000+) = carga y render más lentos.
- **Firebase:** Límites de servicio muy altos; en la práctica el límite es el rendimiento del cliente (mapa + UI), no un “bloqueo” por número de documentos.

Si quieres **evitar** bloqueos o degradación con más datos, los puntos a reforzar son: **límite o paginación de cierres/eventos en mapa** (p. ej. mostrar solo los de la vista o un máximo por capa) y/o **virtualización o límite de resultados** en el buscador si el índice crece mucho.
