# Font Awesome – Iconos usados en el proyecto (B.6)

El proyecto carga Font Awesome completo desde CDN (`all.min.css`), lo que implica ~1 MB de CSS. Para reducir tamaño y dependencia externa se recomienda usar **solo los iconos utilizados**.

## Lista actual (58 iconos)

Generada con `npm run list:fa-icons`:

```
fa-arrow-left
fa-bars
fa-bolt
fa-box
fa-boxes
fa-building
fa-chart-area
fa-chart-line
fa-check-double
fa-clipboard-list
fa-cloud-arrow-up
fa-cog
fa-cube
fa-dna
fa-download
fa-envelope
fa-eye
fa-eye-slash
fa-file-alt
fa-file-pdf
fa-filter
fa-flag
fa-folder-open
fa-home
fa-image
fa-key
fa-list
fa-location-crosshairs
fa-lock
fa-map-marked-alt
fa-map-marker-alt
fa-map-pin
fa-mobile-alt
fa-network-wired
fa-note-sticky
fa-pen
fa-pen-to-square
fa-plus
fa-rotate-left
fa-rotate-right
fa-route
fa-ruler
fa-save
fa-search
fa-signature
fa-sliders-h
fa-spin
fa-spinner
fa-sync-alt
fa-tag
fa-times
fa-trash-alt
fa-upload
fa-user
fa-user-cog
fa-users
fa-users-cog
fa-waveform-lines
```

**Utilidades:** `fa-spin` (animación de spinner).

**Nota:** En Font Awesome 6 algunos nombres cambiaron (ej. `fa-file-alt` → `fa-file-lines`, `fa-sliders-h` → `fa-sliders`). Al crear el subset usar la versión que cargue el proyecto (actualmente 6.5.0).

## Cómo crear un subset

### Opción 1: Font Awesome Custom Download

1. Ir a [Font Awesome → Download](https://fontawesome.com/download).
2. Descargar **Free for Web** y, si existe, usar la herramienta de personalización para elegir solo los iconos de la lista anterior.
3. Sustituir en el proyecto el `<link>` del CDN por la hoja de estilos y fuentes descargadas (self-host en `/assets/fonts/` o similar).

### Opción 2: Self-host solo Solid

Si se usa solo el estilo **Solid** (`fas`):

- Generar un CSS que incluya únicamente las reglas `.fa-*` y `::before` para los 58 iconos (y `fa-spin`).
- Las fuentes WOFF2 de Font Awesome Solid se pueden copiar desde el paquete `@fortawesome/fontawesome-free` y servir estáticamente; el CSS se construye filtrando `all.min.css` por los nombres de clase usados (script de build opcional).

### Opción 3: CDN con subset (si el proveedor lo permite)

Algunos CDNs permiten parámetros para cargar solo ciertos iconos; revisar la documentación del CDN actual.

## Actualizar la lista

Tras añadir o quitar iconos en HTML/JS, regenerar la lista:

```bash
npm run list:fa-icons
```

O directamente:

```bash
node scripts/list-fontawesome-icons.js
```

## Referencia

- **B.6** en `docs/ANALISIS_PROFUNDO_BUENAS_PRACTICAS_RENDERIZADO.md`: Subset de Font Awesome o self-host.
- Font Awesome 6 docs: https://fontawesome.com/docs
