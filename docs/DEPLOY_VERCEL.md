# Despliegue en Vercel | FlashFiber FTTH

El proyecto está configurado para desplegarse en **Vercel** conectado al repositorio de GitHub. Así se asegura que los cambios (incluido el control de costos de Firebase) estén en producción.

---

## Cómo funciona

1. **Repositorio:** El código está en GitHub (`main`).
2. **Vercel:** Si el proyecto está vinculado al repo, cada **push a `main`** puede disparar un deploy automático (según la configuración del proyecto).
3. **Build:** Vercel ejecuta `npm run build`, que:
   - Genera el bundle del mapa (`npx vite build` → `dist/ftth-bundle.js`).
   - Regenera el GeoJSON consolidado.
   - Genera `config.production.js` con la variable de entorno `MAPBOX_TOKEN`.
4. **Resultado:** Se sirve la raíz del proyecto (HTML, `pages/`, `assets/`, `dist/`) en tu dominio.

Los archivos de **control de costos Firebase** (límites de lecturas, caché en Mapa Eventos) forman parte del código; al desplegar, esa versión es la que se sirve.

---

## Asegurar que producción tiene el último código

### Si Vercel está conectado a GitHub

1. Entra en **[Vercel](https://vercel.com)** e inicia sesión.
2. Abre el proyecto **flashfiber-ftth**.
3. Ve a **Deployments**.
4. Comprueba que el último deploy corresponde al último commit de `main` (el que incluye “Control de costos Firebase…”).
5. Si el último deploy es anterior al push:
   - En la fila del último deploy, abre el menú **⋯** (tres puntos).
   - Elige **Redeploy**.
   - Confirma. Se volverá a ejecutar el build con el código actual de `main`.

### Si no usas Vercel

Ejecuta en tu PC (en la raíz del proyecto):

```bash
npm run build
```

Luego sube a tu hosting la carpeta completa (raíz del proyecto, con `dist/`, `assets/`, `pages/`, etc.) por FTP o el método que uses. Así los archivos con límites de Firestore y caché de Mapa Eventos serán los que se sirvan.

---

## Variables de entorno en Vercel

Para que el mapa y la config de producción funcionen, en Vercel → **Settings** → **Environment Variables** debe estar definida:

| Variable        | Uso                          |
|----------------|------------------------------|
| `MAPBOX_TOKEN` | Token de Mapbox para el mapa |

Opcional: si usas otro nombre o variables para Firebase en build, añádelas también en **Environment Variables**.

---

## Comprobar que el control de costos está activo

1. Abre en producción la página del **mapa FTTH** o **Mapa Eventos**.
2. Abre las herramientas de desarrollador (F12) → pestaña **Network**.
3. Recarga la página (Ctrl+F5).
4. Verifica que se cargan `ftth-bundle.js` y/o `mapa-eventos.js` desde tu dominio (no 404).
5. En **Firebase Console** → **Firestore** → **Uso**, en los días siguientes deberías ver menos lecturas si el tráfico es similar (límites y caché activos).
