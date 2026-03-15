# Despliegue – Flash Fiber FTTH

Si ves **«ftth-bundle.js no se encuentra (404)»** en producción, el sitio se está sirviendo desde la **raíz del repositorio** en lugar de desde la **carpeta `dist`**.

---

## Qué hacer

### 1. Generar la build

En la raíz del proyecto:

```bash
npm install
npm run build
```

Eso genera la carpeta **`dist/`** con `ftth-bundle.js`, páginas HTML, `config.production.js`, etc.

### 2. Servir la carpeta `dist` como raíz del sitio

El **directorio raíz del sitio** (document root) debe ser **`dist`**, no la raíz del repo.

- **Vercel:** El proyecto ya lleva `vercel.json` con `"outputDirectory": "dist"`.  
  - Comprueba en el dashboard: **Project → Settings → Build & Development Settings**.  
  - **Output Directory** debe ser `dist` (o vacío para que use `vercel.json`).  
  - **Build Command:** `npm run build`.  
  - Si el build falla, no se generará `dist` y seguirás teniendo 404; revisa los logs del deploy.

- **Otro host (Netlify, propio, etc.):**  
  - Configura el **document root** (o “publish directory”) en **`dist`**.  
  - O, tras `npm run build`, sube **el contenido de `dist/`** (no la carpeta `dist`) como raíz del sitio.

### 3. Variables de entorno en producción

Para que el mapa y la app funcionen en producción:

- **Mapbox:** variable `MAPBOX_TOKEN` (o la que use tu build; ver `scripts/write-config-production.js`).
- **Supabase** (si aplica): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (o el mecanismo que use el proyecto).

Sin un build correcto y sin servir desde `dist`, `ftth-bundle.js` no existirá y verás 404 y el mensaje de error de despliegue.
