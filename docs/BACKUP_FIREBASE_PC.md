# Respaldo de Firebase en tu PC

Puedes respaldar los datos de Firestore y, opcionalmente, los archivos de Storage en tu computadora con el script incluido en el proyecto.

## Primera vez (pasos rápidos)

1. En la raíz del proyecto: `npm install`
2. Firebase Console → proyecto **flashfiber-ftth** → Configuración → Cuentas de servicio → **Generar nueva clave privada**
3. Guardar el JSON descargado en la raíz del proyecto como **`firebase-service-account.json`**
4. En la terminal: `npm run backup:firebase` (solo datos) o `npm run backup:firebase:full` (datos + fotos y .SOR)
5. Revisar la carpeta **`backup/`** en la raíz del proyecto

## Requisitos

1. **Node.js** instalado (ya lo usas para el build).
2. **Cuenta de servicio de Firebase** (clave privada JSON).

## Obtener la clave de la cuenta de servicio

1. Entra a [Firebase Console](https://console.firebase.google.com) y abre el proyecto **flashfiber-ftth**.
2. Ve a **Configuración del proyecto** (ícono de engranaje) → **Cuentas de servicio**.
3. En “Firebase Admin SDK”, pulsa **Generar nueva clave privada** y confirma.
4. Se descargará un archivo JSON. **Renómbralo** a `firebase-service-account.json` y **cópialo en la raíz del proyecto** (donde está `package.json`).
5. Ese archivo **no se sube a git** (está en `.gitignore`). Guárdalo en un lugar seguro y no lo compartas.

## Instalar dependencia del respaldo

Solo hace falta una vez:

```bash
npm install
```

(El proyecto ya incluye `firebase-admin` como devDependency para el script de respaldo.)

## Ejecutar el respaldo

**Solo Firestore** (cierres, eventos, eventos_corporativo, rutas):

```bash
npm run backup:firebase
```

**Firestore + Storage** (fotos de eventos y archivos .SOR de reflectometría):

```bash
npm run backup:firebase:full
```

O directamente:

```bash
node scripts/backup-firebase-to-pc.js
node scripts/backup-firebase-to-pc.js --storage
```

## Dónde se guardan los archivos

Por defecto todo se guarda en la carpeta **`backup`** en la raíz del proyecto:

- `backup/firestore/YYYY-MM-DD/`  
  - `cierres.json`, `eventos.json`, `eventos_corporativo.json`, `rutas.json`
- `backup/storage/YYYY-MM-DD/` (solo si usas `--storage`)  
  - `eventos/` (fotos por evento)  
  - `reflectometria/` (archivos .SOR)

Puedes cambiar la carpeta con la variable de entorno:

```bash
# Windows (PowerShell)
$env:FIREBASE_BACKUP_DIR="C:\MisRespaldos\firebase"; npm run backup:firebase

# Windows (CMD)
set FIREBASE_BACKUP_DIR=C:\MisRespaldos\firebase
npm run backup:firebase
```

## Resumen

| Comando | Qué respalda |
|--------|----------------|
| `npm run backup:firebase` | Solo Firestore (4 colecciones → JSON) |
| `npm run backup:firebase:full` | Firestore + archivos de Storage (fotos y .SOR) |

Sí, **puedes respaldar los datos de Firebase en tu PC** usando este script cada vez que quieras una copia local.
