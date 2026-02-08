# Guía de Implementación - Soluciones FlashFiber FTTH

## 🚀 Inicio Rápido

### Paso 1: Configurar Variables de Entorno

```bash
# 1. Copiar archivo de ejemplo
cp .env.example .env

# 2. Editar .env con tus credenciales reales
# (Ya están las credenciales actuales como ejemplo)
```

### Paso 2: Actualizar Configuración

**Modificar `assets/js/config.js`:**
```javascript
window.__FTTH_CONFIG__ = {
  APP_NAME: "Flash Fiber FTTH",
  VERSION: "1.0.0",
  
  // ✅ Si usas Vite, descomenta esto:
  // MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || "",
  
  // ✅ Si NO usas Vite, usa esto (temporal):
  MAPBOX_TOKEN: window.__FTTH_SECRETS__?.MAPBOX_TOKEN || 
    "pk.eyJ1IjoiamFtaWx0b244NCIsImEiOiJjbWpxMjB4eDkydWdmM2RwdTVib3htb284In0.5gk_bRtcnXLshXE9eMeryg",
  
  MAP: {
    STYLE_DEFAULT: "mapbox://styles/mapbox/dark-v11",
    CENTER: [-74.1, 4.65],
    ZOOM: 12,
    PITCH: 45,
    BEARING: -10
  }
};
```

**Crear `config.local.js` (NO versionar):**
```javascript
// Este archivo NO se sube a git
window.__FTTH_SECRETS__ = {
  MAPBOX_TOKEN: "tu_token_real_aqui",
  FIREBASE_API_KEY: "tu_key_real_aqui"
  // ... otras credenciales
};
```

### Paso 3: Estandarizar Firebase

**Buscar y reemplazar en todos los archivos:**
- `10.7.1` → `12.8.0` (o viceversa, según prefieras)

**Archivos a modificar:**
- `assets/js/services/firebase.js`
- `assets/js/services/firebase.db.js`
- `assets/js/services/firebase.storage.js`
- `assets/js/services/firebase.eventos.js`
- `assets/js/services/firebase.cierres.js`
- `assets/js/services/firebase.rutas.js`

### Paso 4: Implementar Error Handler

**En `tool.eventos.js` (línea 477-485):**
```javascript
// ANTES:
for (const file of fotosAntes) {
  const url = await window.FTTH_STORAGE.subirFotoEvento(eventoId, "antes", file);
  if (url) fotosAntesURLs.push(url);
}

// DESPUÉS:
import ErrorHandler from "../utils/errorHandler.js";

const uploadResults = await Promise.allSettled(
  fotosAntes.map(file => 
    ErrorHandler.safeAsync(
      () => window.FTTH_STORAGE.subirFotoEvento(eventoId, "antes", file),
      "subirFotoAntes"
    )
  )
);

uploadResults.forEach((result, index) => {
  if (result.status === "fulfilled" && result.value) {
    fotosAntesURLs.push(result.value);
  } else {
    console.warn(`⚠️ Error subiendo foto antes #${index + 1}:`, result.reason);
  }
});
```

**En `firebase.storage.js`:**
```javascript
import ErrorHandler from "../utils/errorHandler.js";

async function subirFotoEvento(eventoId, tipo, file) {
  return await ErrorHandler.safeAsync(async () => {
    // Validaciones
    const fileValidation = validators.archivo(file);
    if (!fileValidation.valid) {
      throw new Error(fileValidation.error);
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${tipo}_${Date.now()}.${ext}`;
    const path = `eventos/${eventoId}/${filename}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    console.log("📸 Foto subida:", url);
    return url;
  }, "subirFotoEvento", null);
}
```

### Paso 5: Agregar Cleanup de Listeners

**En `firebase.db.js`:**
```javascript
// Al inicio del archivo
const unsubscribeFunctions = {
  eventos: null,
  cierres: null
};

// Modificar escucharEventos:
export function escucharEventos(callback) {
  // Limpiar listener anterior
  if (unsubscribeFunctions.eventos) {
    unsubscribeFunctions.eventos();
  }

  const unsubscribe = onSnapshot(collection(db, EVENTOS_COLLECTION), snap => {
    snap.forEach(d => callback({ id: d.id, ...d.data() }));
  });

  unsubscribeFunctions.eventos = unsubscribe;
  return unsubscribe;
}

// Agregar función de cleanup
export function cleanup() {
  Object.values(unsubscribeFunctions).forEach(unsub => {
    if (unsub && typeof unsub === "function") {
      unsub();
    }
  });
  Object.keys(unsubscribeFunctions).forEach(key => {
    unsubscribeFunctions[key] = null;
  });
}

// Cleanup automático
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("pagehide", cleanup);
}
```

**En `tool.eventos.js`:**
```javascript
let unsubscribeEventos = null;

// Al inicializar (línea ~250):
unsubscribeEventos = FB.escucharEventos((evt) => {
  addEventoToMap(evt);
});

// Modificar función stop():
function stop() {
  active = false;
  App.map.off("click", handleMapClick);
  App.map.getCanvas().style.cursor = "";
  closeModal();
  
  // ✅ Limpiar listener
  if (unsubscribeEventos) {
    unsubscribeEventos();
    unsubscribeEventos = null;
  }
  
  console.log("🛑 Montar Evento DESACTIVADO");
}
```

### Paso 6: Eliminar Archivos No Usados

```bash
# Eliminar auth.js
rm assets/js/auth.js

# Verificar que no haya referencias
grep -r "auth.js" .
# Si hay referencias, eliminarlas también
```

### Paso 7: Mejorar index.html

**Agregar fallback HTML:**
```html
<body>
  <!-- Fallback si JS está deshabilitado -->
  <noscript>
    <div style="display: flex; align-items: center; justify-content: center; 
                min-height: 100vh; background: #0a1929; color: #e6f7ff; 
                font-family: system-ui; padding: 2rem; text-align: center;">
      <div>
        <h1>JavaScript Requerido</h1>
        <p>Esta aplicación requiere JavaScript para funcionar.</p>
        <a href="pages/home.html" 
           style="color: #00e5ff; text-decoration: underline;">
          Intentar acceder directamente
        </a>
      </div>
    </div>
  </noscript>

  <script>
    window.location.href = "pages/home.html";
  </script>
</body>
```

## 📝 Orden Recomendado de Implementación

### Día 1-2: Crítico
1. ✅ Crear `.gitignore` y `.env.example`
2. ✅ Eliminar `auth.js`
3. ✅ Agregar fallback HTML

### Día 3-4: Seguridad
1. ✅ Mover credenciales a variables de entorno
2. ✅ Estandarizar versión de Firebase

### Día 5-7: Robustez
1. ✅ Implementar `ErrorHandler`
2. ✅ Aplicar en funciones críticas
3. ✅ Agregar validaciones

### Semana 2: Optimización
1. ✅ Implementar cleanup de listeners
2. ✅ Mejorar Service Worker
3. ✅ Agregar sistema de logging

## 🧪 Testing

Después de cada cambio, verificar:

1. **Funcionalidad básica:**
   - ✅ Cargar mapa
   - ✅ Crear evento
   - ✅ Crear cierre
   - ✅ Guardar ruta

2. **Manejo de errores:**
   - ✅ Desconectar internet → verificar mensajes
   - ✅ Subir archivo muy grande → verificar validación
   - ✅ Coordenadas inválidas → verificar validación

3. **Memory leaks:**
   - ✅ Abrir/cerrar herramientas múltiples veces
   - ✅ Verificar en DevTools → Memory → no debe crecer

## ⚠️ Notas Importantes

1. **Backup:** Hacer commit antes de cambios grandes
2. **Testing:** Probar cada cambio antes del siguiente
3. **Compatibilidad:** Verificar que funcione en Chrome, Firefox, Safari
4. **Móvil:** Probar en dispositivos reales

## 🔗 Recursos

- [Firebase Docs](https://firebase.google.com/docs)
- [Mapbox Docs](https://docs.mapbox.com/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
