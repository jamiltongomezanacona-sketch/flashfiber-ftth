# Estructura del encarpetado

## Resumen
Este documento describe la estructura de carpetas y archivos principales del
proyecto para ubicar rapidamente cada tipo de recurso.

## Arbol principal (raiz)
```
/workspace
  assets/
    css/
    icons/
    js/
      core/
      map/
      services/
      tools/
      ui/
      utils/
      app.js
      config.js
      storage.js
      storage.cierres.js
  geojson/
  pages/
  config.local.example.js
  index.html
  manifest.json
  sw.js
  vercel.json
  *.md
```

## Descripcion por carpeta

### assets/
Recursos estaticos del frontend.

- **assets/css/**: hojas de estilo (layout, tema, responsive, paneles).
- **assets/icons/**: iconos PWA.
- **assets/js/**: logica de la aplicacion.
  - **core/**: inicializacion y arranque.
  - **map/**: capas, estilos y controles del mapa.
  - **services/**: integraciones (api, firebase, gps, sync).
  - **tools/**: herramientas funcionales (capas, rutas, medicion, etc.).
  - **ui/**: componentes de interfaz (menu, paneles, modales, notificaciones).
  - **utils/**: utilidades comunes (validadores, manejo de errores).
  - **app.js**: punto de entrada del frontend.
  - **config.js**: configuracion de la app.
  - **storage.js** / **storage.cierres.js**: persistencia local.

### geojson/
Datos geoespaciales del proyecto en formato GeoJSON/JSON.

### pages/
Vistas HTML secundarias (por ejemplo, home y mapa ftth).

## Archivos clave en la raiz
- **index.html**: entrada principal de la app.
- **manifest.json**: configuracion PWA.
- **sw.js**: service worker.
- **vercel.json**: despliegue en Vercel.
- **config.local.example.js**: plantilla de configuracion local.
- **Documentacion**: archivos `*.md` con analisis y tareas.

## Convenciones de nombres
- **mapa.*.js**: modulos del mapa.
- **firebase.*.js**: modulos de servicios Firebase.
- **tool.*.js**: herramientas de funcionalidad.
- **ui.*.js**: componentes de interfaz.
