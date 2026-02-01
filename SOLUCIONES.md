# Soluciones Específicas - FlashFiber FTTH

## 🔴 PRIORIDAD CRÍTICA

### 1. Credenciales Expuestas

#### Problema
- Token de Mapbox y API Key de Firebase hardcodeados en el código
- Riesgo de seguridad si el repositorio es público

#### Solución: Variables de Entorno

**Paso 1: Crear archivo `.env.example`**
```env
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiamFtaWx0b244NCIsImEiOiJjbWpxMjB4eDkydWdmM2RwdTVib3htb284In0.5gk_bRtcnXLshXE9eMeryg
VITE_FIREBASE_API_KEY=AIzaSyD3BNTIERRCZy5jRwN-KcIIQLeXFyg9gY4
VITE_FIREBASE_AUTH_DOMAIN=flashfiber-ftth.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=flashfiber-ftth
VITE_FIREBASE_STORAGE_BUCKET=flashfiber-ftth.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=970573359420
VITE_FIREBASE_APP_ID=1:970573359420:web:1254e4024920aeeff7d639
```

**Paso 2: Crear `.gitignore`**
```
.env
.env.local
.env.production
node_modules/
dist/
.DS_Store
```

**Paso 3: Modificar `config.js`**
```javascript
window.__FTTH_CONFIG__ = {
  APP_NAME: "Flash Fiber FTTH",
  VERSION: "1.0.0",
  
  // ✅ Usar variables de entorno (Vite)
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || "",
  
  MAP: {
    STYLE_DEFAULT: "mapbox://styles/mapbox/dark-v11",
    CENTER: [-74.1, 4.65],
    ZOOM: 12,
    PITCH: 45,
    BEARING: -10
  }
};
```

**Paso 4: Modificar `firebase.js`**
```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// ✅ Validar que todas las credenciales estén presentes
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Firebase config incompleto. Verifica variables de entorno.");
}
```

**Alternativa sin Vite (solo HTML/JS):**
Usar un archivo `config.local.js` que se excluya de git:
```javascript
// config.local.js (NO versionar)
window.__FTTH_SECRETS__ = {
  MAPBOX_TOKEN: "tu_token_aqui",
  FIREBASE_API_KEY: "tu_key_aqui"
  // ...
};
```

---

### 2. Versión de Firebase Inconsistente

#### Problema
- `firebase.rutas.js` usa Firebase 12.8.0
- Otros archivos usan Firebase 10.7.1

#### Solución: Estandarizar a una versión

**Opción A: Actualizar todo a 12.8.0 (recomendado)**
```javascript
// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// firebase.db.js
import { collection, addDoc, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDoc }
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// firebase.storage.js
import { getStorage, ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";
```

**Opción B: Crear constante centralizada**
```javascript
// firebase.version.js
export const FIREBASE_VERSION = "12.8.0";
export const FIREBASE_BASE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

// Uso en otros archivos
import { FIREBASE_BASE_URL } from "./firebase.version.js";
import { initializeApp } from `${FIREBASE_BASE_URL}/firebase-app.js`;
```

---

## 🟠 PRIORIDAD ALTA

### 3. Manejo de Errores Incompleto

#### Problema
- Funciones async sin try-catch
- Errores silenciosos
- Mensajes genéricos

#### Solución: Sistema de Manejo de Errores

**Crear `utils/errorHandler.js`**
```javascript
class ErrorHandler {
  static handle(error, context = "") {
    const errorInfo = {
      message: error.message || "Error desconocido",
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };

    // Log detallado en desarrollo
    if (import.meta.env.DEV) {
      console.error(`❌ [${context}]`, errorInfo);
    } else {
      // Solo mensaje en producción
      console.error(`❌ [${context}] ${error.message}`);
    }

    // Enviar a servicio de monitoreo (Sentry, etc.)
    // this.reportToSentry(errorInfo);

    return errorInfo;
  }

  static async safeAsync(fn, context, fallback = null) {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }

  static safeSync(fn, context, fallback = null) {
    try {
      return fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }
}

export default ErrorHandler;
```

**Aplicar en `firebase.storage.js`**
```javascript
import ErrorHandler from "../utils/errorHandler.js";

async function subirFotoEvento(eventoId, tipo, file) {
  return await ErrorHandler.safeAsync(async () => {
    if (!eventoId || !file) {
      throw new Error("eventoId y file son requeridos");
    }

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      throw new Error("El archivo debe ser una imagen");
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("La imagen no puede exceder 5MB");
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

**Aplicar en `tool.eventos.js` (subida de fotos)**
```javascript
// Antes (líneas 477-485)
for (const file of fotosAntes) {
  const url = await window.FTTH_STORAGE.subirFotoEvento(eventoId, "antes", file);
  if (url) fotosAntesURLs.push(url);
}

// Después
const uploadResults = await Promise.allSettled(
  fotosAntes.map(file => 
    window.FTTH_STORAGE.subirFotoEvento(eventoId, "antes", file)
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

---

### 4. Eliminar archivo `auth.js` no utilizado

#### Solución
```bash
# Eliminar archivo
rm assets/js/auth.js

# Verificar referencias
grep -r "auth.js" .
# Si hay referencias, eliminarlas también
```

---

### 5. Fallback HTML en `index.html`

#### Problema
- Si JavaScript está deshabilitado, página en blanco

#### Solución
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Flash Fiber FTTH | Acceso</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#00e5ff">
</head>
<body>
  <!-- ✅ Fallback visible si JS está deshabilitado -->
  <noscript>
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0a1929; color: #e6f7ff; font-family: system-ui; padding: 2rem; text-align: center;">
      <div>
        <h1>JavaScript Requerido</h1>
        <p>Esta aplicación requiere JavaScript para funcionar.</p>
        <p>Por favor, habilita JavaScript en tu navegador.</p>
        <a href="pages/home.html" style="color: #00e5ff; text-decoration: underline;">
          Intentar acceder directamente
        </a>
      </div>
    </div>
  </noscript>

  <!-- Redirección automática con JS -->
  <script>
    // Redirección inmediata
    window.location.href = "pages/home.html";
  </script>
</body>
</html>
```

---

### 6. Memory Leaks - Cleanup de Listeners

#### Problema
- `escucharEventos` y `escucharCierres` no tienen unsubscribe

#### Solución: Sistema de Cleanup

**Modificar `firebase.db.js`**
```javascript
// Almacenar unsubscribe functions
const unsubscribeFunctions = {
  eventos: null,
  cierres: null,
  rutas: null
};

export function escucharEventos(callback) {
  // ✅ Limpiar listener anterior si existe
  if (unsubscribeFunctions.eventos) {
    unsubscribeFunctions.eventos();
  }

  const unsubscribe = onSnapshot(collection(db, EVENTOS_COLLECTION), snap => {
    snap.forEach(d => callback({ id: d.id, ...d.data() }));
  });

  unsubscribeFunctions.eventos = unsubscribe;
  return unsubscribe; // ✅ Retornar para cleanup manual
}

// ✅ Función de cleanup global
export function cleanup() {
  Object.values(unsubscribeFunctions).forEach(unsub => {
    if (unsub && typeof unsub === "function") {
      unsub();
    }
  });
  // Limpiar referencias
  Object.keys(unsubscribeFunctions).forEach(key => {
    unsubscribeFunctions[key] = null;
  });
}

// ✅ Cleanup automático al cerrar página
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("pagehide", cleanup);
}
```

**Aplicar en `tool.eventos.js`**
```javascript
let unsubscribeEventos = null;

// Al inicializar
FB.escucharEventos((evt) => {
  addEventoToMap(evt);
});

// Guardar referencia si retorna unsubscribe
if (FB.escucharEventos.returnsUnsubscribe) {
  unsubscribeEventos = FB.escucharEventos((evt) => {
    addEventoToMap(evt);
  });
}

// Cleanup al desactivar tool
function stop() {
  active = false;
  App.map.off("click", handleMapClick);
  App.map.getCanvas().style.cursor = "";
  closeModal();
  
  // ✅ Limpiar listener de Firebase
  if (unsubscribeEventos) {
    unsubscribeEventos();
    unsubscribeEventos = null;
  }
  
  console.log("🛑 Montar Evento DESACTIVADO");
}
```

---

## 🟡 PRIORIDAD MEDIA

### 7. Refactorizar Variables Globales

#### Solución: Sistema de Módulos

**Crear `core/app.js` (refactorizado)**
```javascript
class FTTHApp {
  constructor() {
    this.map = null;
    this.ready = false;
    this.tools = {};
    this.data = {
      eventos: [],
      rutas: [],
      cierres: []
    };
  }

  setMap(mapInstance) {
    this.map = mapInstance;
    this.ready = true;
    this.log("Mapa registrado");
    
    this.map.on("style.load", () => {
      this.map.resize();
      this.reloadAllLayers?.();
    });
  }

  log(msg) {
    console.log("🧠 FTTH:", msg);
  }

  reloadAllLayers() {
    this.log("🔄 Recargando capas...");
    this.reloadEventos?.();
    this.reloadRutas?.();
    this.reloadCierres?.();
  }
}

// ✅ Singleton pattern
let appInstance = null;

export function getApp() {
  if (!appInstance) {
    appInstance = new FTTHApp();
  }
  return appInstance;
}

// ✅ Compatibilidad con código existente
if (typeof window !== "undefined") {
  window.__FTTH_APP__ = getApp();
}

export default getApp;
```

**Uso en otros archivos**
```javascript
// Antes
const App = window.__FTTH_APP__;

// Después
import { getApp } from "../core/app.js";
const App = getApp();
```

---

### 8. Eliminar Workarounds con setInterval

#### Problema
- `app.js` línea 63-68: setInterval para crear alias de DB

#### Solución: Sistema de Inicialización

**Crear `core/init.js`**
```javascript
import { getApp } from "./app.js";
import { getDB } from "./firebase.js";

class Initializer {
  constructor() {
    this.ready = false;
    this.listeners = [];
  }

  async init() {
    // Esperar a que Firebase esté listo
    await this.waitForFirebase();
    
    // Configurar alias
    this.setupAliases();
    
    // Notificar listeners
    this.ready = true;
    this.listeners.forEach(callback => callback());
  }

  async waitForFirebase(maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
      const db = getDB();
      if (db) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Firebase no se inicializó a tiempo");
  }

  setupAliases() {
    const db = getDB();
    if (db && !window.__FTTH_DB__) {
      window.__FTTH_DB__ = db;
      console.log("✅ Alias __FTTH_DB__ creado");
    }
  }

  onReady(callback) {
    if (this.ready) {
      callback();
    } else {
      this.listeners.push(callback);
    }
  }
}

export const initializer = new Initializer();

// Auto-inicializar
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initializer.init().catch(err => {
      console.error("❌ Error inicializando:", err);
    });
  });
}
```

**Modificar `app.js`**
```javascript
// Eliminar setInterval (líneas 63-68)
// Reemplazar con:
import { initializer } from "./core/init.js";

initializer.onReady(() => {
  console.log("✅ Sistema inicializado");
});
```

---

### 9. Mejorar Service Worker

#### Solución: Service Worker Completo

**Modificar `sw.js`**
```javascript
const CACHE_NAME = "flashfiber-ftth-v3";
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/pages/home.html",
  "/pages/mapa-ftth.html",
  "/assets/css/theme.css",
  "/assets/css/layout.css",
  "/assets/css/app-ui.css",
  "/assets/css/map.css",
  "/assets/css/panels.css",
  "/assets/css/mobile.css",
  "/assets/js/app.js",
  "/assets/js/config.js"
];

// ✅ Instalación
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(err => console.error("Error cacheando assets:", err))
  );
});

// ✅ Activación
self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => k !== CACHE_NAME)
            .map(k => {
              console.log("🗑️ Eliminando cache antiguo:", k);
              return caches.delete(k);
            })
        )
      )
    ])
  );
});

// ✅ Estrategia: Network First, Cache Fallback
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  
  // Excluir Firebase y Mapbox de cache
  if (event.request.url.includes("firebase") || 
      event.request.url.includes("mapbox")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // ✅ Cachear respuesta exitosa
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // ✅ Fallback a cache
        return caches.match(event.request)
          .then(cached => {
            if (cached) return cached;
            
            // ✅ Fallback a página offline
            if (event.request.mode === "navigate") {
              return caches.match(OFFLINE_URL);
            }
            
            return new Response("Sin conexión", { 
              status: 503,
              statusText: "Service Unavailable"
            });
          });
      })
  );
});
```

---

## 🟢 PRIORIDAD BAJA

### 10. Sistema de Logging

**Crear `utils/logger.js`**
```javascript
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor() {
    this.level = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
  }

  debug(...args) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.log("🔍", ...args);
    }
  }

  info(...args) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log("ℹ️", ...args);
    }
  }

  warn(...args) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn("⚠️", ...args);
    }
  }

  error(...args) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error("❌", ...args);
    }
  }
}

export const logger = new Logger();
export default logger;
```

**Uso**
```javascript
// Antes
console.log("🧠 FTTH:", msg);

// Después
import logger from "../utils/logger.js";
logger.debug("FTTH:", msg);
```

---

### 11. Validación de Datos Centralizada

**Crear `utils/validators.js`**
```javascript
export const validators = {
  coordenadas(lng, lat) {
    if (typeof lng !== "number" || typeof lat !== "number") {
      return { valid: false, error: "Coordenadas deben ser números" };
    }
    if (lng < -180 || lng > 180) {
      return { valid: false, error: "Longitud fuera de rango (-180 a 180)" };
    }
    if (lat < -90 || lat > 90) {
      return { valid: false, error: "Latitud fuera de rango (-90 a 90)" };
    }
    return { valid: true };
  },

  archivo(file, maxSize = 5 * 1024 * 1024) {
    if (!file) {
      return { valid: false, error: "Archivo requerido" };
    }
    if (!file.type.startsWith("image/")) {
      return { valid: false, error: "Debe ser una imagen" };
    }
    if (file.size > maxSize) {
      return { valid: false, error: `Tamaño máximo: ${maxSize / 1024 / 1024}MB` };
    }
    return { valid: true };
  },

  texto(texto, minLength = 1, maxLength = 500) {
    if (!texto || typeof texto !== "string") {
      return { valid: false, error: "Texto requerido" };
    }
    const trimmed = texto.trim();
    if (trimmed.length < minLength) {
      return { valid: false, error: `Mínimo ${minLength} caracteres` };
    }
    if (trimmed.length > maxLength) {
      return { valid: false, error: `Máximo ${maxLength} caracteres` };
    }
    return { valid: true, value: trimmed };
  }
};
```

---

## 📋 Checklist de Implementación

### Fase 1: Crítico (Esta semana)
- [ ] Crear `.gitignore` y `.env.example`
- [ ] Mover credenciales a variables de entorno
- [ ] Estandarizar versión de Firebase
- [ ] Eliminar `auth.js`
- [ ] Agregar fallback HTML

### Fase 2: Alta (Próximas 2 semanas)
- [ ] Implementar `ErrorHandler`
- [ ] Aplicar try-catch en funciones críticas
- [ ] Implementar cleanup de listeners
- [ ] Mejorar validación de datos

### Fase 3: Media (Este mes)
- [ ] Refactorizar variables globales
- [ ] Eliminar setInterval workarounds
- [ ] Mejorar Service Worker
- [ ] Implementar sistema de logging

### Fase 4: Baja (Mejoras continuas)
- [ ] Limpiar código comentado
- [ ] Estandarizar nombres
- [ ] Reemplazar alerts
- [ ] Agregar JSDoc

---

## 🔧 Herramientas Recomendadas

1. **Vite** - Para variables de entorno y build
2. **ESLint** - Para mantener calidad de código
3. **Prettier** - Para formato consistente
4. **Sentry** - Para monitoreo de errores en producción
5. **TypeScript** - Para tipado estático (opcional pero recomendado)
