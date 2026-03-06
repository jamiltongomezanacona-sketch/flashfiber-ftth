# Análisis del proyecto FlashFiber FTTH

## 1. Resumen del proyecto

- **Tipo:** PWA (Progressive Web App) con mapas GIS para FTTH y red corporativa.
- **Stack:** HTML/CSS/JS vanilla, Mapbox GL, Firebase (Auth, Firestore, Storage), sin bundler.
- **Estructura:** Múltiples páginas (`index` login, `home`, `mapa-ftth`, `mapa-corporativo`, `configuracion`), assets en `assets/`, datos GeoJSON en `geojson/`, scripts de procesamiento en raíz y en `scripts/`.

---

## 2. Estructura actual (lo que sí se usa)

| Componente | Uso |
|------------|-----|
| `index.html` | Login; carga Firebase + ui.login.js |
| `pages/home.html` | Panel principal tras login |
| `pages/mapa-ftth.html` | Mapa FTTH (capas, cierres, eventos, rutas, buscador) |
| `pages/mapa-corporativo.html` | Mapa corporativo (centrales, eventos corp) |
| `pages/configuracion.html` | Configuración (credenciales locales) |
| `assets/js/config.js` | Config global (MAPBOX_TOKEN, MAP, etc.) |
| `assets/js/app.js` | Estado global, recarga de capas, PWA SW |
| `assets/js/core/initializer.js` | Orden de carga y alias |
| `assets/js/core/auth.guard.js` | Protección de rutas por sesión |
| `assets/js/services/firebase*.js` | Firebase Auth, DB, Storage, cierres, eventos, rutas |
| `assets/js/map/mapa.*.js` | Inicialización, controles, capas, estilos, lógica FTTH |
| `assets/js/tools/tool.*.js` | GPS, medir, navegar, capas, cierres, eventos, rutas |
| `assets/js/ui/ui.*.js` | Menú, panel, buscador, capas, modales, notificaciones, login |
| `assets/js/utils/centrales.js`, `errorHandler.js`, `validators.js` | Utilidades |
| `assets/js/storage.js`, `storage.cierres.js` | Persistencia local |
| `scripts/build-cables-index.js` | Genera `geojson/cables-index.json` (buscador) |
| `scripts/*-kml-to-geojson.js` | Conversión KML → GeoJSON |
| `sw.js` | Service Worker PWA |
| `manifest.json` | Manifest PWA |
| `vercel.json` | Despliegue (rewrites) |
| `config.local.example.js` | Plantilla de credenciales |

---

## 3. Archivos que no se referencian en la app

- **`assets/js/tools/tool.inventario.js`** y **`assets/js/tools/tool.trazabilidad.js`**: No se cargan en ningún HTML. Son código muerto o funcionalidad futura; se puede eliminar o integrar cuando se use.
- **`assets/js/services/api.js`** y **`assets/js/services/sync.js`**: No aparecen en los `<script>` de las páginas. Revisar si se usan por otros módulos; si no, mover a “pendiente” o eliminar.
- **`mapa.styles.js`**: Define `getMapStyle()` pero no está cargado como script en las páginas; la lógica de estilos puede estar en otro módulo. Verificar si algo llama a `getMapStyle`; si no, unificar en el módulo que cambie el estilo del mapa.

---

## 4. Recomendaciones de mejora

### 4.1 Código y mantenibilidad

- **Centralizar constantes:** `CENTRAL_PREFIX`, `generarMoleculas`, IDs de capas (`LAYER_CIERRES`, `LAYER_EVENTOS`, etc.) están duplicados en varios archivos. Crear (o ampliar) un módulo compartido, p. ej. `assets/js/constants.js` o en `config.js`, y usarlo en tools y UI.
- **Uso de ErrorHandler y validators:** Aún se usa mucho `try/catch` + `console`; en operaciones async críticas (Firebase, fetch, capas) usar `ErrorHandler.handle()` / `ErrorHandler.safeAsync()` y validadores antes de guardar (coordenadas, formularios).
- **Magic numbers:** Llevar a config o constantes: debounce de búsqueda, retries, número de moléculas, resultados máximos, duración de flyTo, etc.
- **Token Mapbox:** En producción no dejar token por defecto en código; si no hay `config.local.js` o variable de entorno, mostrar mensaje claro y no inicializar el mapa (o pantalla “Configuración requerida”).

### 4.2 Accesibilidad (a11y)

- Añadir `aria-label` a botones solo con icono (GPS, Medir, Capas, Limpiar mapa).
- Resultados del buscador: usar `role="listbox"` / `role="option"` o botones por resultado para teclado y lectores de pantalla.

### 4.3 Estilos y HTML

- Mover estilos inline de los controles del mapa (p. ej. en `mapa-ftth.html`) a clases en CSS (ej. `.map-controls .map-control-btn`) y reducir `!important`.

### 4.4 Rendimiento y buenas prácticas

- En `ui.buscador.js`, el `document.addEventListener("click", ...)` para cerrar resultados no se elimina; si la app crece (varias instancias/SPA), considerar registrar el listener solo cuando el buscador esté activo y quitarlo al cerrar.
- Mantener un solo punto para “es corporativo” (p. ej. `window.__GEOJSON_INDEX__` o `window.__FTTH_IS_CORPORATIVO__`) en lugar de repetir la comprobación en muchos archivos.

### 4.5 Scripts de datos en la raíz

- Hay muchos scripts de procesamiento en la raíz: `crear_archivo_completo.js`, `crear_y_procesar.js`, `create_data_file*.js`, `process_*.js`, `save_*.js`, `setup_and_process.js`, `import_santa_ines_data.js`, `verificar_y_corregir.js`. Varios hacen flujos similares.
- **Recomendación:** Mover todos a `scripts/data/` (o similar) y dejar 1–2 puntos de entrada documentados (p. ej. `crear_y_procesar.js` + `setup_and_process.js`). Mantener solo `scripts/build-cables-index.js` en `scripts/` porque es el que regenera el índice del buscador.

### 4.6 Documentación

- Mantener un solo README principal en la raíz (si no existe, crearlo) con: requisitos, `config.local.js`, variables de entorno, cómo ejecutar la app y cómo procesar datos (enlace a GUIA_RAPIDA o README_PROCESAR_DATOS).
- Conservar: `README_CREDENCIALES.md`, `README_PROCESAR_DATOS.md`, `GUIA_RAPIDA.md`, `RECOMENDACIONES.md`, `RECOMENDACIONES_MEJORA.md`, `IMPLEMENTACION.md`. El resto de .md de “tareas completadas”, “soluciones” puntuales y análisis antiguos se han eliminado para reducir ruido.

### 4.7 Despliegue y seguridad

- En Vercel/Netlify usar variables de entorno para Mapbox y Firebase; no subir `config.local.js`.
- Revisar reglas de Firestore para `eventos` y `eventos_corporativo` (solo usuarios autenticados si aplica).

---

## 5. Archivos eliminados en esta limpieza

- **Documentación:** Más de 25 archivos .md redundantes (notas de “completado”, diagnósticos antiguos, soluciones puntuales, análisis ya cubiertos en RECOMENDACIONES y RECOMENDACIONES_MEJORA).
- **Scripts duplicados:** `crear_archivo_completo.js`, `create_data_file_from_object.js`, `save_and_process.js`, `save_geojson_data.js` (sus flujos están cubiertos por `crear_y_procesar.js`, `create_data_file.js` y `setup_and_process.js`).
- No se han eliminado datos (`geojson/`, `datos_santa_ines.json`). Los scripts restantes de procesamiento (`process_*.js`, `import_santa_ines_data.js`, `verificar_y_corregir.js`) se pueden mover a `scripts/data/` más adelante si se desea dejar la raíz más limpia.

---

## 6. Checklist rápido post-limpieza

- [x] Revisar si `api.js` y `sync.js` se usan; si no, eliminarlos o marcar como pendiente. **Hecho:** eliminados (estaban vacíos y no referenciados).
- [x] Revisar si `mapa.styles.js` se usa; si no, unificar estilos en el módulo que cambie el estilo del mapa. **Hecho:** eliminado; `config.js` ahora tiene `MAP.STYLES` (dark, streets, satellite) y `ui.panel.js` / `mapa.init.js` usan esa config.
- [x] Decidir si `tool.inventario.js` y `tool.trazabilidad.js` se van a usar; si no, eliminarlos. **Hecho:** eliminados (estaban vacíos y no referenciados).
- [x] Mover scripts de procesamiento de la raíz a `scripts/data/` y actualizar GUIA_RAPIDA / README_PROCESAR_DATOS. **Hecho:** todos en `scripts/data/`, rutas con ROOT; docs actualizadas.
- [x] Añadir README principal en la raíz con inicio rápido y enlaces a credenciales e implementación. **Hecho:** creado `README.md`.
