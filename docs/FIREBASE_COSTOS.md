# Qué dispara el costo en Firebase | FlashFiber FTTH

Listado verificado de **todo lo que puede hacer que se dispare el costo** en el proyecto (Firestore y Storage). Incluye qué se corrigió y qué vigilar.

---

## 1. Firestore – Lecturas (lo que más impacta)

Cada **lectura** de un documento cuenta. Plan gratuito: **50.000 lecturas/día**. Por encima, se factura (~0,06 USD por 100.000 lecturas).

| # | Origen | Qué hace | Costo potencial | Estado |
|---|--------|----------|------------------|--------|
| **1.1** | **Listeners `onSnapshot` (cierres, eventos, eventos_corporativo, rutas)** | Al abrir el mapa o el buscador se suscriben listeners a 4 colecciones. Cada suscripción = **1 lectura por documento** en la carga inicial. Si no hay límite, con 10.000 docs son 40.000 lecturas por una sola apertura. | Muy alto (miles por carga) | ✅ **Limitado** con `FIRESTORE_READ_LIMIT = 500` en `firebase.cierres.js`, `firebase.eventos.js`, `firebase.eventosCorp.js`, `firebase.rutas.js` y en `firebase.db.js`. |
| **1.2** | **Página “Mapa Eventos” (`mapa-eventos.js`)** | `fetchEventos()` hace **getDocs** de `eventos` y **getDocs** de `eventos_corporativo` **sin límite**. Se ejecuta al cargar el mapa y cada vez que el usuario pulsa “Filtrar”. Con muchos documentos = miles de lecturas por carga y por clic. | Muy alto | ✅ **Limitado** con `query(..., limit(2000))` por colección (máx. 2.000 eventos + 2.000 eventos_corporativo por consulta). |
| **1.3** | **Múltiples pestañas o usuarios** | Cada pestaña/ventana que abre el mapa = una carga completa de los 4 listeners (o de la página Mapa Eventos). Más pestañas = lecturas multiplicadas. | Alto | ⚠️ Evitar muchas pestañas abiertas; el límite por colección ya reduce el impacto por carga. |
| **1.4** | **Buscador (`ui.buscador.js`)** | Al inicializar llama a `escucharCierres`, `escucharEventos`, `escucharRutas` para indexar. Usa los mismos listeners que el mapa (singleton); no crea lecturas extra si ya estaban activos, pero si es la primera carga sí suma. | Moderado (una vez por sesión) | ✅ Mismo límite que los listeners (500 por colección). |
| **1.5** | **Perfil de usuario (`obtenerPerfilUsuario`)** | **getDoc** del documento en `usuarios/{uid}`. Se llama al iniciar sesión. | 1 lectura por login | ✅ Despreciable. |
| **1.6** | **Script de backup (`scripts/backup-firebase-to-pc.js`)** | Lee colecciones completas con `db.collection(collName).get()`. Si se ejecuta a menudo, suma muchas lecturas. | Alto si se corre seguido | ⚠️ Ejecutar solo cuando haga falta; no automatizar sin control. |

**Resumen lecturas:** Lo que más disparaba el costo eran (1) listeners sin límite y (2) `getDocs` sin límite en Mapa Eventos. Ambos están ya acotados con `limit()`. Mantener `FIRESTORE_READ_LIMIT` y el límite en `mapa-eventos.js` para no superar el plan gratuito.

---

## 2. Firestore – Escrituras y eliminaciones

Plan gratuito: **20.000 escrituras/día** y **20.000 eliminaciones/día**. El uso normal de la app (montar cierre, reportar evento, guardar ruta, actualizar/eliminar) suele estar muy por debajo.

| # | Origen | Qué hace | Costo potencial |
|---|--------|----------|------------------|
| **2.1** | Guardar cierre (`guardarCierre`) | 1 escritura por cierre. | Bajo |
| **2.2** | Guardar evento / evento corp (`guardarEvento`, `guardarEventoCorp`) | 1 escritura por evento. | Bajo |
| **2.3** | Guardar ruta (`guardarRuta`) | 1 escritura por ruta. | Bajo |
| **2.4** | Actualizar cierre/evento/ruta | 1 escritura por actualización. | Bajo |
| **2.5** | Eliminar cierre/evento/ruta | 1 eliminación por borrado. | Bajo |

Ninguno de estos suele “disparar” el costo si el uso es operativo normal. Solo habría riesgo con scripts o bots que escriban/borren en masa.

---

## 3. Firebase Storage

Coste por **almacenamiento** (GB/mes), **descargas** (ancho de banda) y **operaciones** (list, getDownloadURL, etc.). Plan gratuito tiene cuota limitada según región.

| # | Origen | Qué hace | Costo potencial |
|---|--------|----------|------------------|
| **3.1** | **Subir foto de evento** (`subirFotoEvento`) | `uploadBytes` + `getDownloadURL`. Por cada foto: escritura + 1 URL. | Bajo por foto; alto si se suben muchas fotos grandes. |
| **3.2** | **Subir archivo .SOR** (`subirArchivoSOR`) | `uploadBytes` + `getDownloadURL`. Archivos hasta 20 MB. | Moderado si hay muchos .SOR grandes. |
| **3.3** | **Listar archivos .SOR** (`listarArchivosSOR`) | `listAll(ref)` + por cada archivo `getMetadata` + `getDownloadURL`. Si el usuario tiene muchos archivos, son muchas operaciones por carga del panel. | Puede subir con muchos archivos (p. ej. 100+ por usuario). |
| **3.4** | **Eliminar .SOR** (`eliminarArchivoSOR`) | `deleteObject`. | Bajo. |

Para no disparar costos en Storage: evitar subir grandes volúmenes de fotos/.SOR sin necesidad y vigilar que `listarArchivosSOR` no se llame en bucle (una vez por apertura del panel está bien).

---

## 4. Resumen: qué hace que se dispare el costo

1. **Lecturas Firestore sin límite** – listeners y getDocs leyendo colecciones completas. ✅ Corregido con `FIRESTORE_READ_LIMIT` y límite en `mapa-eventos.js`.
2. **Muchas cargas del mapa o de Mapa Eventos** – cada carga (o cada “Filtrar”) consume lecturas hasta el límite configurado. ⚠️ Controlar número de usuarios/pestañas y de clics en “Filtrar”.
3. **Script de backup ejecutado a menudo** – lee todas las colecciones. ⚠️ Usar solo cuando haga falta.
4. **Storage: muchas subidas y listados** – fotos, .SOR y listar muchos archivos. ⚠️ Uso normal bajo; vigilar si crece mucho el número de archivos o el tamaño.

---

## 5. Dónde está el límite en el código

| Archivo | Constante / uso | Valor actual |
|---------|------------------|--------------|
| `assets/js/services/firebase.cierres.js` | `FIRESTORE_READ_LIMIT` | 500 |
| `assets/js/services/firebase.eventos.js` | `FIRESTORE_READ_LIMIT` | 500 |
| `assets/js/services/firebase.eventosCorp.js` | `FIRESTORE_READ_LIMIT` | 500 |
| `assets/js/services/firebase.rutas.js` | `FIRESTORE_READ_LIMIT` | 500 |
| `assets/js/services/firebase.db.js` | `FIRESTORE_READ_LIMIT` (listeners cierres/eventos) | 500 |
| `assets/js/pages/mapa-eventos.js` | `FIRESTORE_READ_LIMIT` (getDocs por colección) | 2000 |

Si reduces estos valores, bajan las lecturas por carga y es más fácil no superar el plan gratuito; si los subes, aumenta el uso y el riesgo de costo.

---

*Documento generado a partir de la revisión del proyecto para control de costos en Firebase.*
