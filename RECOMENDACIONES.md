# Recomendaciones | FlashFiber FTTH / GIS Corporativo

## 1. Rendimiento

### GIS FTTH (implementado)
- **Índice plano para buscador**: El buscador usa `geojson/cables-index.json` (un solo fetch). Si no existe o falla, hace fallback al árbol. Para regenerar el índice tras añadir/modificar cables: `node scripts/build-cables-index.js` desde la raíz del proyecto.
- **Carga diferida del consolidado**: El GeoJSON consolidado (cables + cierres E1) se carga 2 segundos después del arranque del mapa en FTTH, para no bloquear la primera pintada. En GIS Corporativo no se ejecuta.
- **Cache de GeoJSON**: Todos los `fetch` de índices y GeoJSON usan `cache: "default"` para que el navegador reutilice respuestas y se reduzcan descargas en visitas repetidas.

### Pendiente / mejoras
- **Carga por central/molécula**: Cargar capas solo al expandir el árbol o al buscar (no todas al inicio).
- **Límite de capas visibles**: Mantener “solo centrales + lo que el usuario eligió”.

### General
- **Mapbox**: Revisar que el estilo por defecto no sea más pesado de lo necesario (ej. `dark-v11` está bien).
- **Firebase**: Mantener reglas de seguridad ajustadas y evitar lecturas masivas innecesarias (por ejemplo, no hacer `get()` de toda la colección si ya usas `onSnapshot`).

---

## 2. Seguridad

- **Credenciales**: Mantener `config.local.js` en `.gitignore` y no subir tokens (Mapbox, Firebase) al repo. En producción usar variables de entorno o un backend que inyecte config.
- **Firebase**: Revisar reglas de Firestore para `eventos` y `eventos_corporativo` (solo usuarios autenticados si aplica). Ver `FIREBASE_EVENTOS_CORPORATIVO.md`.
- **Código de eliminación**: El código para eliminar pines (`DELETE_PIN`) no debería ser el mismo en todos los entornos; en producción considerar rol/admin o backend.
- **Auth**: Si usas Auth Guard, asegurar que las rutas sensibles (mapa, configuración) exijan sesión válida.

---

## 3. Experiencia de usuario (UX)

- **Feedback al guardar**: Tras “Reportar Evento” / “Reportar Evento Corp”, mostrar un breve mensaje de éxito (toast o texto) además del cierre del modal.
- **Estados de carga**: En el buscador y en el árbol de capas, mostrar “Cargando…” o skeleton cuando se estén cargando datos.
- **Errores amigables**: Si Firebase o Mapbox fallan, mostrar un mensaje claro (“No se pudo guardar. Revisa la conexión.”) en lugar de solo consola.
- **Móvil**: El popup de propiedades del pin ya se ajustó; seguir probando en dispositivos reales para zoom, botones y panel de capas.
- **Accesibilidad**: Revisar `aria-label` en botones del mapa y del sidebar; asegurar que el foco no quede atrapado en modales.

---

## 4. Código y mantenimiento

- **Un solo punto de “es Corporativo”**: Usar `window.__GEOJSON_INDEX__` o una variable tipo `window.__FTTH_IS_CORPORATIVO__` de forma consistente para no repetir `!!window.__GEOJSON_INDEX__` en muchos archivos.
- **Nombres de colección Firebase**: Mantener `eventos` (FTTH) y `eventos_corporativo` (Corporativo) documentados en un solo sitio (ej. `FIREBASE_EVENTOS_CORPORATIVO.md` o README).
- **Capas**: Centralizar IDs de capas en `config.js` (ya está en parte); evitar strings mágicos como `"eventos-layer"` o `"CABLES_KML"` repartidos por el código.
- **Tests**: Añadir al menos tests básicos para: construcción del índice del buscador, filtros de capas (Corporativo vs FTTH), y reglas de Firebase si usas emuladores.

---

## 5. Operación y despliegue

- **Variables de entorno**: En Vercel/Netlify (o similar), configurar `MAPBOX_TOKEN` y, si aplica, URLs de Firebase/API. No dejar tokens en el código.
- **Reglas Firestore**: Revisar y publicar las reglas de `eventos_corporativo` en la consola de Firebase tras cualquier cambio.
- **Backup**: Si los GeoJSON (CABLES, FTTH) son fuente de verdad, considerar backup automático o repo aparte; el backup de planos (p. ej. DWG) ya lo manejas por tu lado.
- **Monitoreo**: En producción, tener un mínimo de registro de errores (ej. consola o servicio tipo Sentry) para fallos de mapa o de Firebase.

---

## 6. Próximos pasos sugeridos (prioridad)

| Prioridad | Acción |
|-----------|--------|
| Alta | Documentar y publicar reglas Firestore para `eventos_corporativo` (si no está ya). |
| Alta | Revisar que en producción no queden tokens en el front (config.local / env). |
| Media | Crear índice plano o estrategia de carga diferida para GIS FTTH si la lentitud molesta. |
| Media | Añadir mensaje de éxito al guardar evento (FTTH y Corporativo). |
| Baja | Centralizar detección “Corporativo” y nombres de capas en config. |
| Baja | Tests básicos para buscador y capas. |

---

*Documento generado como guía; ajustar según prioridades del equipo.*
