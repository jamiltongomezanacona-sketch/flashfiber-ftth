# Mapbox en producción – que el mapa funcione

Si el mapa no carga en **www.flasfiber.com** (o tu dominio), el token de Mapbox no está llegando al navegador. Haz **una** de estas dos cosas.

---

## Opción 1: Usas Vercel (recomendado)

1. Entra en **[Vercel](https://vercel.com)** → tu proyecto **flashfiber-ftth**.
2. **Settings** → **Environment Variables**.
3. Añade:
   - **Key:** `MAPBOX_TOKEN`
   - **Value:** tu token de Mapbox (empieza por `pk.eyJ...`)
   - **Environment:** marca **Production** (y Preview si quieres).
4. Guarda y ve a **Deployments** → en el último deploy, menú **⋯** → **Redeploy**.

En cada deploy, el build ejecuta `npm run build`, que genera `config.production.js` con ese token. No subas el token a GitHub.

---

## Opción 2: No usas Vercel (FTP, cPanel, otro hosting)

1. En tu PC, en la carpeta del proyecto, abre terminal.
2. Ejecuta (sustituye `TU_TOKEN_AQUI` por tu token de Mapbox, el que tienes en config.local.js):

   **Windows (PowerShell):**
   ```powershell
   $env:MAPBOX_TOKEN="TU_TOKEN_AQUI"; node scripts/write-config-production.js
   ```

   **Windows (CMD):**
   ```cmd
   set MAPBOX_TOKEN=TU_TOKEN_AQUI
   node scripts/write-config-production.js
   ```

   **Mac/Linux:**
   ```bash
   MAPBOX_TOKEN="TU_TOKEN_AQUI" node scripts/write-config-production.js
   ```

3. Se crea el archivo **config.production.js** en la raíz del proyecto.
4. Sube **solo** ese archivo a la **raíz** de tu sitio (mismo nivel que `index.html`) por FTP o el administrador de archivos de tu hosting. No lo subas a GitHub.

---

## Comprobar

- Abre la web del mapa y recarga con **Ctrl+F5**.
- En la pestaña **Network**, comprueba que **config.production.js** responde **200** (no 404).
- El mapa debería cargar. Si no, revisa que el token en Mapbox esté activo y, si quieres, restringido por URL a tu dominio.
