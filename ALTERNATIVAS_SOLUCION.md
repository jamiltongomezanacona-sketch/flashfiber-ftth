# 🎯 ALTERNATIVAS PARA SOLUCIONAR EL PROBLEMA DE MAPA NO DISPONIBLE

## 📋 ANÁLISIS DEL PROBLEMA ACTUAL

El código actual tiene múltiples verificaciones y esperas que pueden causar:
- Mensajes de advertencia innecesarios
- Código complejo y difícil de mantener
- Posibles condiciones de carrera

---

## ✅ ALTERNATIVA 1: SIMPLIFICAR Y CONFiar EN EVENTOS (RECOMENDADA)

### Ventajas:
- ✅ Código más simple y limpio
- ✅ Sin verificaciones innecesarias
- ✅ Mejor rendimiento
- ✅ Más fácil de mantener

### Implementación:
```javascript
async function createLayer(layer, basePath) {
  // NO verificar - confiar en que solo se llama cuando el mapa está listo
  const map = App.map;
  if (!map) {
    console.error(`❌ Mapa no disponible para: ${layer.id}`);
    return;
  }

  const id = layer.id;
  const url = basePath + layer.path;
  
  // ... resto del código sin verificaciones de isStyleLoaded()
  
  // Agregar capa directamente sin verificaciones
  try {
    map.addSource(id, { type: "geojson", data: geojson });
    map.addLayer(layerConfig);
    console.log(`✅ Capa ${id} agregada`);
  } catch (error) {
    console.error(`❌ Error agregando capa ${id}:`, error);
  }
}
```

### Cambios necesarios:
1. Eliminar `waitForMap()`
2. Eliminar todas las verificaciones `isStyleLoaded()`
3. Eliminar los `setTimeout` de espera
4. Confiar en que `loadFTTHTree()` solo se llama desde eventos del mapa

---

## 🔄 ALTERNATIVA 2: COLA DE CAPAS PENDIENTES

### Ventajas:
- ✅ Maneja casos donde el mapa no está listo
- ✅ Procesa capas cuando el mapa esté disponible
- ✅ No pierde capas si se llaman antes de tiempo

### Implementación:
```javascript
// Cola global de capas pendientes
const pendingLayers = [];

async function createLayer(layer, basePath) {
  const map = App.map;
  
  if (!map || !map.isStyleLoaded()) {
    // Agregar a cola si el mapa no está listo
    console.log(`📋 Capa ${layer.id} agregada a cola pendiente`);
    pendingLayers.push({ layer, basePath });
    return;
  }
  
  // Procesar capa normalmente
  // ... código de creación de capa
}

// Procesar cola cuando el mapa esté listo
function processPendingLayers() {
  if (!App.map || !App.map.isStyleLoaded()) return;
  
  while (pendingLayers.length > 0) {
    const { layer, basePath } = pendingLayers.shift();
    createLayer(layer, basePath);
  }
}

// Llamar desde eventos del mapa
App.map?.on("load", () => {
  processPendingLayers();
});

App.map?.on("style.load", () => {
  processPendingLayers();
});
```

---

## 🛡️ ALTERNATIVA 3: WRAPPER CON VERIFICACIÓN ÚNICA

### Ventajas:
- ✅ Una sola verificación al inicio
- ✅ Código más limpio que la versión actual
- ✅ Mantiene cierta seguridad

### Implementación:
```javascript
async function createLayer(layer, basePath) {
  // Verificación única al inicio
  const map = App.map;
  if (!map) {
    console.error(`❌ Mapa no disponible`);
    return;
  }
  
  // Si el estilo no está cargado, esperar al evento
  if (!map.isStyleLoaded()) {
    console.log(`⏳ Esperando estilo del mapa para: ${layer.id}`);
    map.once("style.load", () => {
      createLayer(layer, basePath);
    });
    return;
  }
  
  // El mapa está listo - proceder normalmente
  const id = layer.id;
  // ... resto del código sin más verificaciones
}
```

---

## 🎯 RECOMENDACIÓN FINAL

**Usar ALTERNATIVA 1 (Simplificar)** porque:

1. ✅ El código ya usa eventos del mapa (`map.on("load")`)
2. ✅ `loadFTTHTree()` solo se llama cuando el mapa está listo
3. ✅ Elimina complejidad innecesaria
4. ✅ Mejor rendimiento
5. ✅ Más fácil de depurar

### Pasos para implementar:

1. Eliminar función `waitForMap()`
2. Eliminar todas las verificaciones `isStyleLoaded()` dentro de `createLayer`
3. Eliminar los `setTimeout` de espera
4. Simplificar el código de agregar capa
5. Confiar en que los eventos garantizan que el mapa está listo

---

## ⚠️ NOTA IMPORTANTE

Si decides usar la Alternativa 1, asegúrate de que:
- `loadFTTHTree()` SOLO se llama desde `map.on("load")` o `map.on("style.load")`
- No hay otras partes del código que llamen `createLayer` directamente
- El mapa está completamente inicializado antes de cargar capas
