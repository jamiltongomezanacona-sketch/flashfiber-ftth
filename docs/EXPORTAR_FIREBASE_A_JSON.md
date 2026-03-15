# Exportar Firestore a JSON (paso a paso)

Guía para sacar las colecciones **cierres**, **eventos**, **eventos_corporativo** y **rutas** de Firebase Firestore y guardarlas en archivos JSON, listas para migrar a Supabase.

---

## Opción A: Script automático (recomendado)

### 1. Obtener la clave de cuenta de servicio de Firebase

1. Entra en [Firebase Console](https://console.firebase.google.com) e inicia sesión.
2. Selecciona tu **proyecto** (el que tiene Firestore con cierres, eventos, rutas).
3. Haz clic en el **engranaje** (Configuración del proyecto) junto a “Descripción general del proyecto”.
4. Ve a la pestaña **Cuentas de servicio** (Service accounts).
5. En la sección “Firebase Admin SDK”, haz clic en **Generar nueva clave privada** (o “Generate new private key”) y confirma.
6. Se descargará un archivo JSON (algo como `nombre-proyecto-firebase-adminsdk-xxxxx.json`).
7. **Copia o mueve** ese archivo a la **raíz de tu proyecto** FlashFiber y **renómbralo** a:
   ```text
   firebase-service-account.json
   ```
8. Añade ese nombre a **.gitignore** para no subirlo a Git:
   ```text
   firebase-service-account.json
   ```

### 2. Instalar la dependencia

En la raíz del proyecto (donde está `package.json`):

```bash
npm install firebase-admin
```

### 3. Ejecutar el script de exportación

En la misma carpeta, en la terminal:

**PowerShell (Windows):**

```powershell
node scripts/exportar-firestore-a-json.js
```

**Bash (Linux/Mac):**

```bash
node scripts/exportar-firestore-a-json.js
```

Por defecto el script crea una carpeta con la fecha de hoy y guarda ahí los JSON:

```text
backup/firestore/AAAA-MM-DD/
  cierres.json
  eventos.json
  eventos_corporativo.json
  rutas.json
```

Para elegir otra carpeta de salida:

```powershell
node scripts/exportar-firestore-a-json.js --out=backup/firestore/mi-export
```

### 4. Si el script no encuentra la clave

Puedes indicar la ruta del JSON con una variable de entorno:

**PowerShell:**

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\completa\firebase-service-account.json"
node scripts/exportar-firestore-a-json.js
```

**Bash:**

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/ruta/completa/firebase-service-account.json"
node scripts/exportar-firestore-a-json.js
```

### 5. Siguiente paso: migrar a Supabase

Cuando tengas los JSON en `backup/firestore/AAAA-MM-DD/` (o la carpeta que hayas usado), sigue la guía de migración:

```powershell
$env:SUPABASE_URL="https://TU_PROYECTO.supabase.co"
$env:SUPABASE_ANON_KEY="tu_clave_anon"
node scripts/migrar-firebase-to-supabase.js --path=backup/firestore/AAAA-MM-DD
```

(Sustituye `AAAA-MM-DD` por la fecha de la carpeta que generó el script.)

---

## Opción B: Exportar manualmente desde Firebase Console

Firestore en la consola **no tiene** un botón “Exportar colección a JSON”. Solo puedes ver y editar documentos. Para sacar los datos “a mano” tienes estas alternativas.

### B1. Pocos documentos (copiar y pegar)

1. En [Firebase Console](https://console.firebase.google.com) → tu proyecto → **Firestore Database**.
2. Abre la colección (por ejemplo **cierres**).
3. Para cada documento puedes anotar o copiar los campos.
4. Crea en tu PC una carpeta, por ejemplo `backup/firestore/manual/`.
5. Crea un archivo `cierres.json` con un array de objetos, un objeto por documento, por ejemplo:

```json
[
  {
    "id": "abc123",
    "codigo": "CIERRE-001",
    "tipo": "Caja",
    "central": "Central Norte",
    "molecula": "MOL-01",
    "notas": "Sin notas",
    "lat": 4.123456,
    "lng": -74.654321,
    "createdBy": "user@email.com",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

6. Repite para **eventos** → `eventos.json`, **eventos_corporativo** → `eventos_corporativo.json`, **rutas** → `rutas.json`.
7. Usa el mismo formato: array de objetos con los campos que tengas en Firestore (el script de migración acepta tanto camelCase como snake_case).

Solo es práctico si tienes **muy pocos** documentos.

### B2. Firebase CLI (export completo a Google Cloud)

Firebase ofrece exportar toda la base a **Google Cloud Storage**, no a archivos JSON sueltos en tu PC:

1. Instala [Firebase CLI](https://firebase.google.com/docs/cli) y haz login: `firebase login`.
2. En la consola de Google Cloud del mismo proyecto, activa **Cloud Storage** y crea un bucket.
3. Ejecuta:

```bash
firebase firestore:export gs://TU_BUCKET/backup
```

Eso genera un formato interno (no JSON por colección). Para tener `cierres.json`, `eventos.json`, etc., lo más sencillo es usar la **Opción A** con el script.

### B3. Extensión o herramienta externa

Puedes buscar en Chrome Web Store extensiones tipo “Firestore Export” que permitan exportar una colección a JSON. Si usas una, guarda los archivos en:

```text
backup/firestore/
  cierres.json
  eventos.json
  eventos_corporativo.json
  rutas.json
```

Cada archivo debe ser un **array de objetos** `[{ ... }, { ... }]` (o un objeto cuyas claves son los id y los valores los documentos). El script de migración acepta ambos formatos.

---

## Formato de los JSON que espera la migración

- **Por archivo:** un **array** de documentos: `[{ "id": "...", "codigo": "...", ... }, ...]`.
- **O** un **objeto** con id como clave: `{ "idDoc1": { "codigo": "...", ... }, "idDoc2": { ... } }`.
- Campos en **camelCase** (Firestore): `createdAt`, `createdBy`, `serverTime`, etc. El script los convierte a **snake_case** para Supabase (`created_at`, `created_by`, `server_time`).

Si una colección no existe en Firestore (por ejemplo aún no tienes `eventos_corporativo`), el script de exportación escribirá un array vacío `[]`; la migración simplemente no insertará filas en esa tabla.
