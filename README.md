# Flash Fiber FTTH

**Sistema de información geográfica (GIS)** para la gestión de red FTTH y red corporativa. Aplicación web progresiva (PWA) con mapas interactivos, autenticación y soporte offline.

---

## Descripción

Flash Fiber FTTH permite visualizar y gestionar:

- **Red FTTH:** centrales, cables, cierres, eventos y rutas sobre mapa.
- **Red corporativa:** centrales y eventos con capas KML/GeoJSON.
- **Buscador unificado:** cables, cierres, eventos y direcciones (geocodificación).
- **Herramientas:** medición, GPS, navegación, capas, registro de eventos y cierres.

**Stack:** HTML/CSS/JS (sin framework), Mapbox GL JS, Firebase (Auth, Firestore, Storage), Vite para el bundle del mapa.

---

## Requisitos

| Requisito | Descripción |
|-----------|-------------|
| Navegador | Chrome, Firefox, Edge o Safari (actualizado) |
| Node.js | Solo para scripts de build y procesamiento de datos |
| Servicios | Cuenta [Mapbox](https://www.mapbox.com/) y proyecto [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage) |

---

## Inicio rápido

### 1. Configurar credenciales

```bash
cp config.local.example.js config.local.js
```

Edite `config.local.js` con su token de Mapbox y la configuración de Firebase.  
Detalle: [Credenciales y configuración](docs/README_CREDENCIALES.md).

### 2. Ejecutar la aplicación

Desde la raíz del proyecto:

```bash
npx serve .
```

Abrir en el navegador la URL indicada (por ejemplo `http://localhost:3000`). La entrada es la pantalla de login (`index.html`).

### 3. Build para producción (opcional)

```bash
npm install
npm run build
```

El comando genera el bundle en `dist/` y el GeoJSON consolidado. Para desplegar, configure las variables de entorno y use el resultado de `npm run build` según su plataforma.

---

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `node scripts/build-cables-index.js` | Regenerar el índice del buscador tras añadir o modificar cables en `geojson/`. |
| `node scripts/build-consolidado-geojson.js` | Regenerar el GeoJSON consolidado (carga inicial del mapa). |
| `node scripts/data/crear_y_procesar.js` | Importar datos GeoJSON desde stdin (procesamiento Santa Inés). |
| `node scripts/data/setup_and_process.js` | Procesar el archivo `datos_santa_ines.json` existente. |

Guías: [Guía rápida](docs/GUIA_RAPIDA.md) · [Procesamiento de datos](docs/README_PROCESAR_DATOS.md).

---

## Documentación

La documentación está en la carpeta **[docs/](docs/)**. Resumen:

| Sección | Documentos |
|---------|------------|
| **Configuración** | [Credenciales](docs/README_CREDENCIALES.md), [Firebase](docs/FIREBASE_COLECCIONES.md) |
| **Datos** | [Guía rápida](docs/GUIA_RAPIDA.md), [Procesar datos](docs/README_PROCESAR_DATOS.md) |
| **Desarrollo** | [Implementación](docs/IMPLEMENTACION.md), [Recomendaciones](docs/RECOMENDACIONES.md), [Análisis y mejoras](docs/ANALISIS_Y_MEJORAS.md) |

Índice completo: [docs/README.md](docs/README.md).

---

## Estructura del proyecto

```
flashfiber-ftth/
├── index.html                 # Entrada: login
├── pages/                     # Páginas (home, mapas, configuración)
├── assets/
│   ├── css/                   # Estilos
│   ├── icons/                 # Iconos PWA
│   └── js/                    # Lógica de la aplicación (core, map, services, tools, ui, utils)
├── geojson/                   # Datos GeoJSON (FTTH, corporativo, índices)
├── scripts/                   # Scripts de build y procesamiento (Node.js)
│   ├── build-cables-index.js
│   ├── build-consolidado-geojson.js
│   └── data/                  # Procesamiento de datos Santa Inés
├── docs/                      # Documentación
├── config.local.example.js    # Plantilla de credenciales (copiar a config.local.js)
├── manifest.json              # PWA
├── sw.js                      # Service Worker
└── vercel.json                # Configuración de despliegue (Vercel)
```

- **Código de la app** → `assets/js/` (no añadir scripts en la raíz).
- **Documentación** → `docs/`. En la raíz solo este README.
- **Credenciales** → `config.local.js` (en `.gitignore`; no versionar).

---

## Despliegue

El proyecto incluye configuración para **Vercel**. En el panel del proyecto:

1. **Variables de entorno:** defina `MAPBOX_TOKEN` (y las que requiera Firebase si aplica).
2. El build ejecuta `node scripts/write-config-production.js` y genera `config.production.js` con el token, de modo que el mapa funcione sin editar archivos a mano.
3. Restrinja el token de Mapbox por URL en [Mapbox Access Tokens](https://account.mapbox.com/access-tokens/) (por ejemplo `https://su-dominio.com/*`).

No suba `config.local.js` ni archivos con secretos al repositorio.

---

## Licencia y soporte

Proyecto de uso interno. Para dudas sobre configuración o despliegue, consulte la documentación en [docs/](docs/).
