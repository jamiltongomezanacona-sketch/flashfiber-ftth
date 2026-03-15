# Migración de Firebase a Supabase | FlashFiber FTTH

Pasos ordenados para cambiar el backend de **Firebase** (Auth, Firestore, Storage) a **Supabase**.

---

## La manera más fácil de migrar lo que falta (datos)

Si la app **ya usa Supabase** y solo te falta **pasar los datos** de Firebase a Supabase:

### 1. Exportar desde Firebase

**Guía paso a paso:** [Exportar Firestore a JSON](EXPORTAR_FIREBASE_A_JSON.md).

- **Recomendado (script automático):** Obtener la clave de cuenta de servicio en Firebase Console → Cuentas de servicio → Generar nueva clave privada; guardar el JSON como `firebase-service-account.json` en la raíz del proyecto (y añadirlo a `.gitignore`). Luego:
  ```bash
  npm install firebase-admin
  node scripts/exportar-firestore-a-json.js
  ```
  Se crea `backup/firestore/AAAA-MM-DD/` con `cierres.json`, `eventos.json`, `eventos_corporativo.json`, `rutas.json`.
- **Manual:** Si tienes pocos documentos, puedes copiar desde Firestore y crear los JSON a mano en una carpeta `backup/firestore/`. Cada archivo: array de objetos `[{ "id": "...", ... }, ...]` u objeto por id `{ "id1": { ... } }`.

### 2. Ejecutar el script de migración

En la raíz del proyecto, con **Node.js** y variables de entorno de Supabase:

**PowerShell (Windows):**

```powershell
$env:SUPABASE_URL="https://TU_PROYECTO.supabase.co"
$env:SUPABASE_ANON_KEY="tu_clave_anon_publica"
node scripts/migrar-firebase-to-supabase.js
```

Por defecto el script busca la carpeta `backup/firestore/`. Para otra ruta:

```powershell
node scripts/migrar-firebase-to-supabase.js --path=backup/firestore/2025-03-12
```

**Bash (Linux/Mac):**

```bash
export SUPABASE_URL="https://TU_PROYECTO.supabase.co"
export SUPABASE_ANON_KEY="tu_clave_anon_publica"
node scripts/migrar-firebase-to-supabase.js
```

El script inserta (o actualiza por `id`) en las tablas `cierres`, `eventos`, `eventos_corporativo` y `rutas`. Los **usuarios** debes crearlos en Supabase → Authentication y en la tabla `usuarios` (mismo `id` que en Auth).

### 3. Comprobar

En **Supabase → Table Editor** revisa que las tablas tengan los registros. Si algo falla, revisa la consola donde ejecutaste el script (errores por RLS, columnas faltantes, etc.).

---

## ✅ Implementación realizada (Paso 4)

La capa de servicios Supabase ya está creada y conectada:

- **`supabase.js`** (raíz): cliente con URL y clave pública.
- **`assets/js/services/supabase.core.js`**: Auth (login, logout, onUserChange), `window.FTTH_CORE`, `window.__USER__`.
- **`assets/js/services/supabase.db.js`**: `obtenerPerfilUsuario`, `cleanup`, `window.FTTH_FIREBASE.db`.
- **`assets/js/services/supabase.cierres.js`**: guardar/escuchar/actualizar/eliminar cierres.
- **`assets/js/services/supabase.eventos.js`**: guardar/escuchar/actualizar/eliminar eventos.
- **`assets/js/services/supabase.eventosCorp.js`**: eventos corporativo.
- **`assets/js/services/supabase.rutas.js`**: rutas (guardar, escuchar, actualizar, eliminar).
- **`assets/js/services/supabase.storage.js`**: fotos de eventos y archivos .SOR → `window.FTTH_STORAGE`.

**Carga actual:** `entry-ftth.js` y las páginas HTML (`index.html`, `pages/home.html`, `pages/configuracion.html`, `pages/mapa-eventos.html`, `pages/reflectometria.html`) cargan ya los scripts de Supabase en lugar de Firebase. El **initializer** acepta tanto Supabase como Firebase (`getFirebaseDB()`).

Para usar solo Supabase: configura `supabase.js` con tu proyecto, crea las tablas y buckets en Supabase (pasos 1 y 2) y, si quieres, elimina los archivos `firebase.*.js` cuando todo funcione.

---

## Resumen de lo que usa Firebase hoy

| Servicio Firebase | Uso en el proyecto | Equivalente en Supabase |
|------------------|-------------------|-------------------------|
| **Firebase Auth** | Login (email/contraseña), `window.__USER__`, perfil en Firestore | Supabase Auth |
| **Firestore** | Colecciones: `cierres`, `eventos`, `eventos_corporativo`, `rutas`, `usuarios` | Supabase (PostgreSQL) + Realtime |
| **Firebase Storage** | Fotos de eventos, archivos .SOR (reflectometría) | Supabase Storage |

**APIs globales que hay que mantener o reemplazar:**

- `window.FTTH_CORE` → auth, login, logout, onUserChange
- `window.FTTH_FIREBASE` → guardar/escuchar/actualizar/eliminar cierres, eventos, eventosCorp, rutas; `obtenerPerfilUsuario`, `cleanup`
- `window.FTTH_STORAGE` → subirFotoEvento, subirArchivoSOR, listarArchivosSOR, eliminarArchivoSOR

---

## Paso 1: Crear proyecto y base de datos en Supabase

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto (o usa uno existente).
2. En **Settings → API** anota:
   - **Project URL** (ej: `https://xxxx.supabase.co`)
   - **anon public** key (clave pública).
3. En **SQL Editor** ejecuta el script completo que está en el repo:
   - **`scripts/supabase-schema.sql`**: crea tablas `usuarios`, `cierres`, `eventos`, `eventos_corporativo`, `rutas`, activa Realtime, RLS e índices.
   - Si alguna tabla ya existe, puedes comentar su `CREATE TABLE` o usar migraciones.
   - Si al añadir tablas a `supabase_realtime` sale "already member of publication", puedes ignorarlo.
4. En **Authentication → Providers** activa **Email** y, si quieres, desactiva “Confirm email” en desarrollo.

---

## Paso 2: Configurar Storage en Supabase

1. En **Storage** crea dos buckets con estos **nombres exactos** (los usa el código):
   - **`eventos`** → para fotos de eventos (ruta interna: `{eventoId}/{filename}`).
   - **`reflectometria`** → para archivos .SOR (ruta interna: `{userId}/{filename}`).
2. Marca los buckets como **públicos** si quieres usar `getPublicUrl()` (como en `supabase.storage.js`), o configura políticas para que `authenticated` pueda leer/escribir.

#### Políticas de Storage recomendadas (Dashboard → Storage → bucket → Policies)

- **Bucket `eventos`:**  
  - **INSERT**: `auth.role() = 'authenticated'`  
  - **SELECT**: `auth.role() = 'authenticated'` (o público si el bucket es público)  
  - Ruta: cualquier path bajo `eventos/` (p. ej. `{eventoId}/*`).

- **Bucket `reflectometria`:**  
  - **INSERT**: `auth.uid()::text = (storage.foldername(name))[1]` (solo en su carpeta `{userId}/`)  
  - **SELECT** / **DELETE**: mismo criterio, usuario solo ve/borra sus archivos.  
  - Ruta: `{userId}/*`.

Si marcas el bucket como **público**, las URLs generadas con `getPublicUrl()` funcionan sin políticas SELECT; aun así conviene restringir INSERT/DELETE a autenticados (o por carpeta en reflectometria).

---

## Paso 3: Configurar credenciales (supabase.js)

1. Instala la dependencia si falta:
   ```bash
   npm install @supabase/supabase-js
   ```
2. Configura URL y clave de Supabase de una de estas formas:
   - **Opción A – Variables de entorno (recomendado para producción):**  
     Crea `.env` en la raíz (y añádela a `.gitignore`) con:
     ```
     VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
     VITE_SUPABASE_ANON_KEY=tu_clave_anon_publica
     ```
     El archivo `supabase.js` ya lee `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` cuando existen.
   - **Opción B – config.local.js:**  
     En `window.__FTTH_SECRETS__.SUPABASE` define `url` y `anonKey`. `supabase.js` los usa si no hay variables Vite.
   - **Opción C – por defecto:**  
     Edita en `supabase.js` los valores `'https://TU_PROYECTO.supabase.co'` y `'TU_CLAVE_PUBLICABLE'` por los de tu proyecto.

---

## Paso 4: Crear capa de servicios Supabase (sustitutos de Firebase)

Crear nuevos archivos que expongan la **misma API global** que usa la app (`window.FTTH_CORE`, `window.FTTH_FIREBASE`, `window.FTTH_STORAGE`) pero usando el cliente de Supabase.

| Archivo actual (Firebase) | Archivo nuevo (Supabase) | Contenido |
|---------------------------|--------------------------|-----------|
| `firebase.js` | `supabase.auth.js` (o integrar en un solo `supabase.core.js`) | Inicializar cliente, login/logout, `onAuthStateChange` → rellenar `window.__USER__` usando tabla `usuarios`. |
| `firebase.db.js` | `supabase.db.js` | Funciones para cierres y eventos (guardar, escuchar, actualizar, eliminar) usando `supabase.from('cierres')`, `supabase.from('eventos')` y **Realtime** (`supabase.channel()`). |
| `firebase.cierres.js` | Integrar en `supabase.db.js` o `supabase.cierres.js` | Misma API: `guardarCierre`, `escucharCierres`, `actualizarCierre`, `eliminarCierre`. |
| `firebase.eventos.js` | Integrar en `supabase.db.js` o `supabase.eventos.js` | `guardarEvento`, `escucharEventos`, `actualizarEvento`, `eliminarEvento`. |
| `firebase.eventosCorp.js` | `supabase.eventosCorp.js` | `guardarEventoCorp`, `escucharEventosCorp`, etc. |
| `firebase.rutas.js` | `supabase.rutas.js` | `guardarRuta`, `escucharRutas`, `actualizarRuta`, `eliminarRuta`. |
| `firebase.storage.js` | `supabase.storage.js` | `subirFotoEvento`, `subirArchivoSOR`, `listarArchivosSOR`, `eliminarArchivoSOR` con `supabase.storage.from('eventos')` y `from('reflectometria')`. |

Importante: mantener los mismos nombres de función y la misma forma de los datos (por ejemplo, callbacks con `{ id, ...data }`) para no tocar aún el resto del código (buscador, mapa, paneles, etc.).

---

## Paso 5: Migrar datos existentes de Firestore a Supabase

1. **Exportar desde Firebase (backup local):**
   ```bash
   npm run backup:firebase
   ```
   Esto genera en `backup/firestore/YYYY-MM-DD/` los archivos: `cierres.json`, `eventos.json`, `eventos_corporativo.json`, `rutas.json`.  
   (Requiere `firebase-service-account.json` en la raíz del proyecto.)

2. **Importar a Supabase con el script de migración:**
   - Define las variables de entorno con la URL y la clave anon de tu proyecto Supabase:
     ```bash
     set SUPABASE_URL=https://TU_PROYECTO.supabase.co
     set SUPABASE_ANON_KEY=tu_clave_anon_publica
     ```
     En PowerShell:
     ```powershell
     $env:SUPABASE_URL="https://TU_PROYECTO.supabase.co"
     $env:SUPABASE_ANON_KEY="tu_clave_anon_publica"
     ```
   - Ejecuta el script (usa el backup más reciente en `backup/firestore/`):
     ```bash
     npm run migrate:firebase-to-supabase
     ```
   - Para usar una carpeta de backup concreta:
     ```bash
     node scripts/migrar-firebase-to-supabase.js --path=backup/firestore/2025-03-11
     ```
   - El script inserta en las tablas `cierres`, `eventos`, `eventos_corporativo` y `rutas`. Los **usuarios** hay que crearlos en Supabase Auth y en la tabla `usuarios` a mano (el script lo indica al final).

3. **Comprobar:** En Supabase → Table Editor revisa que las tablas tengan los registros migrados.

---

## Paso 6: Migrar usuarios de Firebase Auth a Supabase Auth

- Opción A: **Recrear usuarios a mano** en Supabase (Dashboard → Authentication → Users) con el mismo email/contraseña (o invitaciones).
- Opción B: **Script de migración**: usar Firebase Admin SDK para listar usuarios y Supabase Admin API (o import) para crearlos en Supabase. Supabase permite importar usuarios con hash de contraseña en algunos planes.

Actualizar la tabla `usuarios` en Supabase con los mismos `id` (UUID) que `auth.users.id` para que `obtenerPerfilUsuario(uid)` siga funcionando.

---

## Paso 7: Migrar archivos de Firebase Storage a Supabase Storage

1. Listar/descargar archivos desde Firebase Storage (por ejemplo con el script de backup que incluye `--storage`).
2. Subirlos a los buckets de Supabase manteniendo la misma estructura de rutas (`eventos/{eventoId}/...`, `reflectometria/{userId}/...`) para que las URLs o paths que guardes en BD sigan siendo válidos.

---

## Paso 8: Cambiar los scripts cargados en el HTML

En **todas** las páginas que cargan Firebase, sustituir los `<script>` de Firebase por los de Supabase, por ejemplo:

**Antes:**

```html
<script type="module" src="assets/js/services/firebase.js"></script>
<script type="module" src="assets/js/services/firebase.db.js"></script>
<!-- y en algunas páginas: -->
<script type="module" src="assets/js/services/firebase.storage.js"></script>
```

**Después:**

```html
<script type="module" src="supabase.js"></script>
<script type="module" src="assets/js/services/supabase.core.js"></script>
<script type="module" src="assets/js/services/supabase.db.js"></script>
<!-- y donde haga falta: -->
<script type="module" src="assets/js/services/supabase.storage.js"></script>
```

Archivos a revisar para este cambio:

- `index.html`
- `pages/reflectometria.html`
- `pages/configuracion.html`
- `pages/mapa-eventos.html`
- `pages/mapa-corporativo.html`
- Cualquier otro HTML que cargue `firebase.js` o `firebase.db.js`.

---

## Paso 9: Actualizar referencias a Firebase en el código

- **auth.guard.js** y **ui.login.js**: dejar de esperar “Firebase” y usar “Supabase” (por ejemplo comprobar `window.FTTH_CORE` o una variable `window.SUPABASE_READY` que marque que Supabase Auth está listo).
- **configuracion.html**: cambiar el texto y el badge de “Firebase” a “Supabase”; mismo flujo (conectado / no conectado).
- **ui.buscador.js**, **ui.rutas.js**, **tool.rutas.js**, **tool.cierres.js**, **tool.eventos.js**, **mapa.init.js**, **mapa-eventos.js**: ya usan `window.FTTH_FIREBASE` y `window.FTTH_STORAGE`; si los nuevos módulos Supabase exponen la misma API en esas variables, no hace falta cambiar lógica, solo asegurar que se carguen los scripts de Supabase en lugar de Firebase.
- **sw.js**: quitar la exclusión de dominios Firebase del cache y añadir, si aplica, exclusión para `*.supabase.co` para que las peticiones a la API vayan siempre a red.

---

## Paso 10: Eliminar dependencias y scripts de Firebase

1. En `package.json` quitar `firebase-admin` (y cualquier otro paquete Firebase del front si se añadió).
2. Opcional: dejar de ejecutar `backup:firebase` y `backup:firebase:full` o sustituirlos por scripts de backup de Supabase (export de tablas + Storage).
3. Cuando todo funcione con Supabase, eliminar o archivar los archivos:
   - `assets/js/services/firebase.js`
   - `assets/js/services/firebase.db.js`
   - `assets/js/services/firebase.cierres.js`
   - `assets/js/services/firebase.eventos.js`
   - `assets/js/services/firebase.eventosCorp.js`
   - `assets/js/services/firebase.rutas.js`
   - `assets/js/services/firebase.storage.js`
   - `scripts/backup-firebase-to-pc.js` (o mover a una carpeta `legacy/`).

---

## Paso 11: Documentación y configuración

1. Actualizar **README.md** y **docs**: sustituir referencias a Firebase por Supabase (credenciales, configuración, límites).
2. Actualizar **docs/FIREBASE_COLECCIONES.md** → renombrar o reemplazar por algo como **docs/SUPABASE_TABLAS.md** con el esquema de tablas y políticas RLS.
3. En **config.local.js** / variables de entorno: quitar `FIREBASE` y añadir `SUPABASE_URL` y `SUPABASE_ANON_KEY` (y usarlos en `supabase.js`).

---

## Pruebas y checklist

Después de ejecutar el schema, crear buckets y configurar `supabase.js`:

1. **Primer usuario:** En Supabase → **Authentication → Users** crea un usuario (email + contraseña). Luego en **Table Editor → usuarios** inserta una fila con `id` = UUID del usuario recién creado (cópialo desde Authentication), `email`, `nombre` y `activo = true`.
2. **Login:** Abre la app (p. ej. `index.html` o la URL del mapa), inicia sesión con ese usuario. Debe redirigir al mapa y en consola ver algo como "Usuario cargado".
3. **Cierres:** Abre "Montar Cierre", rellena y guarda. Comprueba en Table Editor → `cierres` que aparece el registro y en el mapa el pin.
4. **Eventos:** "Reportar Evento", guardar y ver en tabla `eventos` y en el mapa.
5. **Rutas:** "Montar Ruta" → dibujar → "Guardar en Firebase" (el botón puede seguir diciendo Firebase). Comprobar en tabla `rutas`.
6. **Realtime:** Abre la app en dos pestañas; al crear/editar un cierre o evento en una, la otra debe actualizar el mapa sin recargar.
7. **Reflectometría** (si usas la página): subir un .SOR y listar en la misma página; el bucket `reflectometria` debe tener la carpeta del usuario.

Si algo falla, revisa la consola del navegador (errores de Supabase, 401, 403) y en Supabase → **Logs** (Auth, Postgres, Realtime).

---

## Verificación post-migración (correcciones realizadas)

Tras revisar todo el proyecto se detectaron y corrigieron estos puntos:

### 1. **`assets/js/pages/mapa-eventos.js`** (fallo crítico)
- **Problema:** Seguía importando Firebase (`firebase.db.js`, `getDocs`, `collection`, `query`, `limit`) y llamaba a `fetchEventosFromFirestore()`. La página Mapa de eventos fallaba al cargar.
- **Solución:** Se reescribió para usar Supabase: `getSupabase()` desde `window.FTTH_FIREBASE?.db`, `fetchEventosFromSupabase()` con `supabase.from('eventos')` y `supabase.from('eventos_corporativo')`, mapeo de `created_at`/`created_by` a `createdAt`/`createdBy` para el filtro y el popup.

### 2. **`assets/js/services/supabase.core.js`** – compatibilidad con `auth.currentUser`
- **Problema:** Código como `tool.cierres.js` usa `window.FTTH_CORE?.auth?.currentUser`. En Supabase Auth no existe `currentUser` síncrono.
- **Solución:** En el callback de `onUserChange` se asigna `window.FTTH_CORE.auth.currentUser = user` (o `null` al cerrar sesión) para mantener la misma API.

### 3. **Textos y comentarios Firebase → Supabase**
- **auth.guard.js**, **ui.login.js**: comentarios "Firebase" sustituidos por "Supabase".
- **pages/home.html**: comentario "Firebase Core" → "Supabase Core".
- **pages/configuracion.html**: etiqueta "Firebase" → "Supabase", meta "Auth, Firestore, Storage" → "Auth, DB, Storage"; instrucciones del modal de usuarios actualizadas a Supabase Dashboard y tabla `usuarios`.
- **pages/mapa-eventos.html**, **pages/mapa-corporativo.html**: textos de botones "Firebase" → "Supabase" / "la nube".
- **assets/js/ui/ui.rutas.js**: mensaje "Firebase no disponible" → "Supabase no disponible".
- **assets/js/entry-ftth.js**: comentario de orden de carga actualizado a Supabase.

### Archivos que siguen mencionando Firebase (sin impacto funcional)
- **Scripts de migración/backup:** `scripts/migrar-firebase-to-supabase.js`, `scripts/backup-firebase-to-pc.js` (usan Firebase por diseño).
- **Servicios Firebase antiguos:** `firebase.*.js` siguen en el repo pero la app ya no los carga; se pueden eliminar cuando se confirme que todo funciona con Supabase.
- **tool.rutas.js**, **tool.cierres.js**: mensajes tipo "guardado en Firebase" / "Firebase no disponible"; la lógica usa `window.FTTH_FIREBASE`, que ahora es la API de Supabase. Opcional: cambiar los textos a "nube" o "Supabase".
- **config.local.example.js**: sigue con ejemplo de configuración Firebase; útil si se mantiene el script de backup.

---

## Orden sugerido de implementación

1. Paso 1 y 2 (Supabase proyecto, tablas, Storage).  
2. Paso 3 (supabase.js).  
3. Paso 4 (crear todos los módulos Supabase que exponen la misma API que Firebase).  
4. Paso 8 y 9 (cambiar scripts en HTML y referencias “Firebase” → “Supabase”).  
5. Probar login, cierres, eventos, rutas y reflectometría en desarrollo.  
6. Paso 5, 6 y 7 (migración de datos, usuarios y archivos).  
7. Paso 10 y 11 (limpieza y documentación).

Si quieres, el siguiente paso puede ser implementar **Paso 4** en tu repo (por ejemplo `supabase.core.js` + `supabase.db.js` con la misma API que `FTTH_FIREBASE` y `FTTH_CORE`).
