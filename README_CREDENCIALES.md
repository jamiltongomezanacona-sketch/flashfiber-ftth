# 🔐 Protección de Credenciales - FlashFiber FTTH

## ✅ Implementación Completada

Las credenciales ahora están protegidas usando un sistema de archivos locales que **NO se versionan en git**.

## 📋 Archivos Modificados

1. ✅ `config.local.example.js` - Plantilla con estructura (SÍ se versiona)
2. ✅ `assets/js/config.js` - Modificado para usar credenciales locales
3. ✅ `assets/js/services/firebase.js` - Modificado para usar credenciales locales
4. ✅ `.gitignore` - Actualizado para excluir `config.local.js`
5. ✅ `pages/mapa-ftth.html` - Actualizado para cargar config.local.js

## 🚀 Cómo Usar

### Paso 1: Crear tu archivo de credenciales

```bash
# Copiar la plantilla
cp config.local.example.js config.local.js
```

### Paso 2: Editar config.local.js

Abre `config.local.js` y completa con tus credenciales reales:

```javascript
window.__FTTH_SECRETS__ = {
  // 🔑 Token de Mapbox
  MAPBOX_TOKEN: "tu_token_real_aqui",
  
  // 🔥 Configuración de Firebase
  FIREBASE: {
    apiKey: "tu_api_key_real",
    authDomain: "tu_auth_domain",
    projectId: "tu_project_id",
    storageBucket: "tu_storage_bucket",
    messagingSenderId: "tu_messaging_sender_id",
    appId: "tu_app_id"
  }
};
```

### Paso 3: Verificar que funciona

1. Abre la consola del navegador (F12)
2. Deberías ver: `🔥 Firebase Core inicializado`
3. Si ves advertencias sobre credenciales, verifica que `config.local.js` esté correcto

## 🔒 Seguridad

### ✅ Lo que está protegido:

- ✅ `config.local.js` está en `.gitignore` → **NO se sube a git**
- ✅ `config.local.example.js` es solo una plantilla (sin credenciales reales)
- ✅ Los valores por defecto en el código son solo para desarrollo local

### ⚠️ Importante:

1. **NUNCA** subas `config.local.js` a git
2. **NUNCA** compartas `config.local.js` públicamente
3. Cada desarrollador debe crear su propio `config.local.js`
4. En producción, usa variables de entorno del servidor

## 🧪 Verificación

### Verificar que config.local.js NO está en git:

```bash
git status
# No debería aparecer config.local.js

git ls-files | grep config.local
# No debería mostrar nada
```

### Verificar que funciona:

1. Abre `pages/mapa-ftth.html` en el navegador
2. Abre la consola (F12)
3. Escribe: `window.__FTTH_SECRETS__`
4. Deberías ver tu objeto de configuración

## 📝 Estructura de Archivos

```
flashfiber-ftth/
├── config.local.example.js    ← Plantilla (SÍ se versiona)
├── config.local.js            ← Tus credenciales (NO se versiona)
├── .gitignore                 ← Excluye config.local.js
└── assets/js/
    ├── config.js              ← Usa window.__FTTH_SECRETS__
    └── services/
        └── firebase.js         ← Usa window.__FTTH_SECRETS__
```

## 🔄 Migración desde Código Hardcodeado

Si ya tienes credenciales en el código:

1. **Extrae las credenciales** de `config.js` y `firebase.js`
2. **Crea `config.local.js`** usando `config.local.example.js` como base
3. **Pega tus credenciales** en `config.local.js`
4. **Verifica** que todo funciona
5. **Opcional:** Elimina los valores hardcodeados del código (ya tienen fallback)

## 🆘 Solución de Problemas

### Error: "MAPBOX_TOKEN no encontrado"

**Causa:** `config.local.js` no existe o no tiene `MAPBOX_TOKEN`

**Solución:**
1. Crea `config.local.js` desde `config.local.example.js`
2. Completa el campo `MAPBOX_TOKEN`

### Error: "Firebase config incompleto"

**Causa:** `config.local.js` no tiene la sección `FIREBASE` completa

**Solución:**
1. Abre `config.local.js`
2. Verifica que tenga todos los campos de Firebase
3. Compara con `config.local.example.js`

### Advertencia: "Usando configuración por defecto"

**Causa:** No se encontró `config.local.js` o `window.__FTTH_SECRETS__`

**Solución:**
1. Verifica que `config.local.js` existe en la raíz del proyecto
2. Verifica que se carga antes de `config.js` en el HTML
3. Revisa la consola para errores de carga

## 📚 Próximos Pasos

Una vez que esto funcione, puedes:

1. ✅ Eliminar los valores hardcodeados del código (opcional, ya tienen fallback)
2. ✅ Configurar variables de entorno en el servidor de producción
3. ✅ Implementar rotación de credenciales
4. ✅ Agregar validación más estricta

## 🔗 Referencias

- [Git Ignore Patterns](https://git-scm.com/docs/gitignore)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Mapbox Token Management](https://docs.mapbox.com/accounts/guides/tokens/)

---

**¿Preguntas?** Revisa los archivos modificados o consulta la documentación en `SOLUCIONES.md`
