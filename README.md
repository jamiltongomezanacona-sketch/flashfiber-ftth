# Flash Fiber FTTH

PWA de mapas GIS para red FTTH y red corporativa: visualización de centrales, cables, cierres, eventos y rutas. Incluye login con Firebase, Mapbox GL y soporte offline (PWA).

## Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Node.js (solo para scripts de procesamiento de datos y de construcción)
- Cuenta Mapbox y proyecto Firebase (Auth + Firestore + Storage)

## Inicio rápido

### 1. Credenciales

- Copia `config.local.example.js` → `config.local.js`
- Edita `config.local.js` con tu token Mapbox y configuración Firebase  
- **Detalle:** [README_CREDENCIALES.md](README_CREDENCIALES.md)

### 2. Servir la app

Sirve la raíz del proyecto con cualquier servidor estático (por ejemplo desde la raíz):

```bash
npx serve .
# o: python -m http.server 8080
```

Abre en el navegador la URL que indique el servidor (p. ej. `http://localhost:3000`). La entrada es la pantalla de login (`index.html`).

### 3. Procesar datos GeoJSON (Santa Inés)

Si necesitas importar o actualizar datos GeoJSON:

- **Guía rápida:** [GUIA_RAPIDA.md](GUIA_RAPIDA.md)
- **Detalle:** [README_PROCESAR_DATOS.md](README_PROCESAR_DATOS.md)

Resumen: desde la raíz del proyecto, `node scripts/data/crear_y_procesar.js` (pegar JSON y Ctrl+Z + Enter) o `node scripts/data/setup_and_process.js` si ya tienes `datos_santa_ines.json`.

### 4. Regenerar índice del buscador (cables)

Tras añadir o cambiar cables en `geojson/`:

```bash
node scripts/build-cables-index.js
```

## Documentación

| Documento | Contenido |
|-----------|------------|
| [README_CREDENCIALES.md](README_CREDENCIALES.md) | Configuración de Mapbox y Firebase |
| [GUIA_RAPIDA.md](GUIA_RAPIDA.md) | Procesar datos GeoJSON en un paso |
| [README_PROCESAR_DATOS.md](README_PROCESAR_DATOS.md) | Procesamiento de datos GeoJSON (Santa Inés) |
| [IMPLEMENTACION.md](IMPLEMENTACION.md) | Guía de implementación y soluciones |
| [RECOMENDACIONES.md](RECOMENDACIONES.md) | Rendimiento, seguridad, UX y mantenimiento |
| [ANALISIS_Y_MEJORAS.md](ANALISIS_Y_MEJORAS.md) | Análisis del proyecto y checklist de mejoras |

## Estructura breve

- `index.html` — Login
- `pages/` — Home, mapa FTTH, mapa corporativo, configuración
- `assets/js/` — Lógica (config, mapa, tools, UI, servicios Firebase)
- `geojson/` — Datos GeoJSON (FTTH, corporativo, índices)
- `scripts/` — Build (índice de cables) y conversión KML→GeoJSON
- `scripts/data/` — Scripts para procesar/importar datos Santa Inés

## Despliegue

El proyecto incluye `vercel.json` para despliegue en Vercel. Configura las variables de entorno (Mapbox, Firebase) en el panel de Vercel y no subas `config.local.js`.
