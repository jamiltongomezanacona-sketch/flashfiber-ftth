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
| [FIREBASE_COLECCIONES.md](FIREBASE_COLECCIONES.md) | Colecciones Firestore (cierres, eventos, rutas) y reglas |
| [GUIA_RAPIDA.md](GUIA_RAPIDA.md) | Procesar datos GeoJSON en un paso |
| [README_PROCESAR_DATOS.md](README_PROCESAR_DATOS.md) | Procesamiento de datos GeoJSON (Santa Inés) |
| [IMPLEMENTACION.md](IMPLEMENTACION.md) | Guía de implementación y soluciones |
| [RECOMENDACIONES.md](RECOMENDACIONES.md) | Rendimiento, seguridad, UX y mantenimiento |
| [ANALISIS_Y_MEJORAS.md](ANALISIS_Y_MEJORAS.md) | Análisis del proyecto y checklist de mejoras |

## Estructura del proyecto

Mantener esta organización para que el código siga siendo fácil de mantener.

```
flashfiber-ftth/
├── index.html              # Entrada: login
├── pages/                   # Páginas HTML (home, mapas, configuración)
│   ├── home.html
│   ├── mapa-ftth.html
│   ├── mapa-corporativo.html
│   └── configuracion.html
├── assets/
│   ├── css/                # Estilos (theme, layout, map, panels, search, mobile)
│   ├── icons/              # Iconos PWA (icon-192, icon-512)
│   └── js/
│       ├── app.js          # Estado global de la app
│       ├── config.js       # Configuración (token, capas, constantes)
│       ├── core/           # Inicialización y auth (initializer, auth.guard)
│       ├── map/            # Mapa: init, controls, layers, ftth
│       ├── services/       # Firebase, API, GPS (firebase.*, gps)
│       ├── storage*.js     # Persistencia local (storage, storage.cierres)
│       ├── tools/          # Herramientas: tool.capas, tool.cierres, tool.eventos, etc.
│       ├── ui/             # Interfaz: ui.buscador, ui.layers.tree, ui.login, ui.menu, etc.
│       └── utils/          # Utilidades: centrales, errorHandler, validators, devtools-guard
├── geojson/                # Datos GeoJSON (FTTH, CORPORATIVO, índices); no tocar estructura
├── scripts/                # Scripts Node (ejecutar desde raíz)
│   ├── build-cables-index.js   # Regenerar índice del buscador
│   ├── *-kml-to-geojson.js     # Conversión KML → GeoJSON
│   └── data/               # Procesar/importar datos Santa Inés (crear_y_procesar, setup_and_process, etc.)
├── config.local.example.js # Plantilla de credenciales (copiar a config.local.js)
├── manifest.json           # PWA
├── sw.js                   # Service Worker
└── vercel.json             # Despliegue (rewrites)
```

**Convenciones:**
- **Nuevo JS de la app** → `assets/js/`, dentro de la carpeta que corresponda (`core/`, `map/`, `services/`, `tools/`, `ui/`, `utils/`). Dejar `app.js`, `config.js` y `storage*.js` en la raíz de `assets/js/` (las páginas los cargan por ruta).
- **Nuevos scripts de datos o build** → `scripts/` o `scripts/data/`; no añadir scripts en la raíz.
- **Nueva página** → `pages/`, con **nombre descriptivo** (ej. `mapa-ftth.html`, `configuracion.html`). No usar nombres aleatorios ni UUID.
- **Documentación** → raíz, con nombre claro (`README_*.md`, `GUIA_*.md`, etc.); evitar muchos `.md` de una sola tarea.
- **Credenciales y secretos** → solo en `config.local.js` (en `.gitignore`); no subir a GitHub.

## Despliegue

El proyecto incluye `vercel.json` para despliegue en Vercel. Configura las variables de entorno (Mapbox, Firebase) en el panel de Vercel y no subas `config.local.js`.
