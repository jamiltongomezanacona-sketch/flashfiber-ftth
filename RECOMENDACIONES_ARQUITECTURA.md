# 📊 Recomendaciones de Arquitectura: Cables Fijos vs Datos Dinámicos

## 📋 Contexto

- **Cables fijos**: ~1200 cables en toda Bogotá (datos estáticos)
- **Datos dinámicos**: Cierres, eventos, rutas de técnicos (cambian frecuentemente)
- **Plataforma**: FlashFiber FTTH con Mapbox + Firebase

---

## 🏗️ Arquitectura Recomendada: Híbrida

### ✅ Ya implementada correctamente:

| Tipo de Dato | Almacenamiento | Razón |
|--------------|----------------|-------|
| **Cables** | GeoJSON estáticos | Son fijos, no cambian frecuentemente |
| **Cierres** | Firebase Firestore | Dinámicos, tiempo real |
| **Eventos** | Firebase Firestore | Dinámicos, tiempo real |
| **Rutas** | Firebase Firestore | Dinámicos, tiempo real |

---

## 🔌 CABLES FIJOS (~1200 cables)

### Recomendación: **Archivos GeoJSON estáticos + CDN**

#### Por qué GeoJSON estáticos:
1. **No cambian frecuentemente** - Una vez montado un cable, su geometría es permanente
2. **Mejor rendimiento** - Carga inicial más rápida que Firebase
3. **Sin costos de lectura** - Firebase cobra por cada lectura de documento
4. **Funciona offline** - Se pueden cachear en Service Worker
5. **Versionado con Git** - Control de cambios en cada cable

#### Estructura optimizada para 1200 cables:

```
geojson/
├── index.json                     # Índice maestro
├── FTTH/
│   ├── index.json
│   ├── ZONA_NORTE/               # Por zonas geográficas
│   │   ├── index.json
│   │   ├── BACHUE/
│   │   │   ├── index.json
│   │   │   └── cables/
│   │   │       ├── index.json
│   │   │       ├── BA01FH144.geojson
│   │   │       ├── BA02FH96.geojson
│   │   │       └── ...
│   │   └── SUBA/
│   │       └── ...
│   ├── ZONA_SUR/
│   │   ├── MUZU/
│   │   └── ...
│   ├── ZONA_CENTRO/
│   │   ├── CHICO/
│   │   ├── SANTA_INES/
│   │   └── ...
│   └── ZONA_OCCIDENTE/
│       └── FONTIBON/
│           └── ...
```

#### Estrategias de carga para 1200 cables:

##### 1. **Carga bajo demanda (Lazy Loading)** ⭐ Recomendado

```javascript
// Solo cargar cables cuando el usuario expande una carpeta/central
async function loadCablesOnDemand(centralId) {
  const url = `geojson/FTTH/${centralId}/cables/index.json`;
  const index = await fetch(url).then(r => r.json());
  
  // Solo cargar las capas de esa central
  for (const layer of index.children) {
    await createLayer(layer, basePath);
  }
}
```

##### 2. **Carga por viewport (solo cables visibles)**

```javascript
// Cargar cables según el área visible del mapa
function loadVisibleCables() {
  const bounds = map.getBounds();
  
  // Consultar qué centrales están en el viewport
  const visibleCentrals = getCentralsInBounds(bounds);
  
  for (const central of visibleCentrals) {
    if (!loadedCentrals.has(central.id)) {
      await loadCablesOnDemand(central.id);
      loadedCentrals.add(central.id);
    }
  }
}

map.on('moveend', loadVisibleCables);
```

##### 3. **Consolidar cables por zona (recomendado para rendimiento)**

En lugar de 1200 archivos individuales, agrupar por zona:

```
geojson/FTTH/
├── cables_zona_norte.geojson    # ~300 cables
├── cables_zona_sur.geojson      # ~300 cables  
├── cables_zona_centro.geojson   # ~300 cables
├── cables_zona_occidente.geojson # ~300 cables
```

**Ventajas:**
- 4 requests HTTP vs 1200
- Mapbox optimiza mejor fuentes grandes
- Más fácil de mantener

#### Optimización con Vector Tiles (para máximo rendimiento):

Si necesitas máximo rendimiento con 1200+ cables:

```javascript
// Convertir GeoJSON a MBTiles con tippecanoe
// tippecanoe -o cables.mbtiles -zg --drop-densest-as-needed cables.geojson

// Usar Mapbox Tileset
map.addSource('cables-all', {
  type: 'vector',
  url: 'mapbox://tu-usuario.cables-bogota'
});
```

---

## 🔥 DATOS DINÁMICOS (Firebase Firestore)

### ✅ Cierres, Eventos, Rutas → Firebase (ya implementado correctamente)

#### Por qué Firebase para datos dinámicos:

1. **Tiempo real** - `onSnapshot()` actualiza automáticamente
2. **Multi-usuario** - Varios técnicos trabajan simultáneamente
3. **Sincronización** - Cambios se reflejan inmediatamente
4. **Offline** - Firestore tiene cache offline integrado
5. **CRUD completo** - Crear, leer, actualizar, eliminar

#### Estructura de colecciones optimizada:

```
Firestore Database
├── cierres/
│   ├── {cierreId}
│   │   ├── codigo: "CE-001"
│   │   ├── tipo: "E1" | "E2" | "NAP"
│   │   ├── central: "SANTA_INES"
│   │   ├── molecula: "SI17"
│   │   ├── lat: 4.562537
│   │   ├── lng: -74.088195
│   │   ├── notas: "..."
│   │   ├── createdAt: timestamp
│   │   ├── createdBy: "uid_tecnico"
│   │   └── estado: "activo" | "inactivo"
│   └── ...
│
├── eventos/
│   ├── {eventoId}
│   │   ├── tipo: "corte" | "vandalismo" | "mantenimiento"
│   │   ├── estado: "CRITICO" | "PROVISIONAL" | "RESUELTO"
│   │   ├── central: "SANTA_INES"
│   │   ├── cableId: "SI17FH144"        # ← Relación con cable fijo
│   │   ├── lat: 4.562
│   │   ├── lng: -74.088
│   │   ├── tecnico: "Juan Pérez"
│   │   ├── impacto: "50 usuarios"
│   │   ├── fotos: ["url1", "url2"]
│   │   ├── createdAt: timestamp
│   │   └── resolvedAt: timestamp | null
│   └── ...
│
├── rutas/
│   ├── {rutaId}
│   │   ├── nombre: "Ruta mantenimiento SI17"
│   │   ├── tipo: "mantenimiento" | "instalacion"
│   │   ├── central: "SANTA_INES"
│   │   ├── geojson: "{...}"  # LineString serializado
│   │   ├── distancia: 2500
│   │   ├── tecnico: "Carlos López"
│   │   ├── estado: "planificada" | "en_curso" | "completada"
│   │   ├── createdAt: timestamp
│   │   └── completedAt: timestamp | null
│   └── ...
│
└── usuarios/
    └── {uid}
        ├── nombre: "..."
        ├── email: "..."
        ├── rol: "admin" | "tecnico" | "supervisor"
        └── activo: true
```

#### Índices recomendados en Firestore:

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "eventos",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "central", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "eventos",
      "queryScope": "COLLECTION", 
      "fields": [
        { "fieldPath": "estado", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "cierres",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "central", "order": "ASCENDING" },
        { "fieldPath": "molecula", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 📊 Comparativa de Costos

### Escenario: 1200 cables + 100 cierres + 50 eventos activos

| Dato | Almacenamiento | Lecturas/día | Costo mensual estimado |
|------|----------------|--------------|------------------------|
| **Cables (GeoJSON)** | Archivos estáticos | 0 (gratis) | $0 |
| **Cierres (Firebase)** | Firestore | ~5000 | ~$0.30 |
| **Eventos (Firebase)** | Firestore | ~10000 | ~$0.60 |
| **Rutas (Firebase)** | Firestore | ~2000 | ~$0.12 |
| **TOTAL** | - | - | **~$1/mes** |

### Si TODOS los cables estuvieran en Firebase:

| Dato | Lecturas/día | Costo mensual |
|------|--------------|---------------|
| **1200 cables** | ~50000+ | **~$30+/mes** |

**Conclusión**: Mantener cables en GeoJSON estático ahorra ~$30/mes

---

## 🔧 Mejoras Recomendadas para tu Código

### 1. Agregar carga bajo demanda

```javascript
// En mapa.layers.js - Modificar loadFTTHTree()
async function loadFTTHTree(options = { lazyLoad: true }) {
  const { lazyLoad } = options;
  
  if (lazyLoad) {
    // Solo cargar índices, no los GeoJSON
    await loadIndexOnly(ROOT_INDEX, "../geojson/");
  } else {
    // Carga completa (actual)
    await walkNode(root, "../geojson/");
  }
}

async function loadIndexOnly(indexUrl, basePath) {
  const res = await fetch(indexUrl, { cache: "no-store" });
  const index = await res.json();
  
  // Registrar carpetas pero NO cargar archivos GeoJSON aún
  for (const child of index.children || []) {
    if (child.type === "folder") {
      App.__registeredFolders = App.__registeredFolders || new Map();
      App.__registeredFolders.set(child.label, {
        index: basePath + child.index,
        loaded: false
      });
    }
  }
}
```

### 2. Agregar relación cables ↔ eventos

```javascript
// Al crear un evento, relacionarlo con el cable afectado
async function guardarEventoConCable(evento) {
  const payload = {
    ...evento,
    cableId: evento.cableId || null,      // ID del cable afectado
    cableCodigo: evento.cableCodigo || null, // Código visible
    // ... resto de datos
  };
  
  return await addDoc(collection(db, "eventos"), payload);
}
```

### 3. Agregar filtros por estado en eventos

```javascript
// Filtrar eventos activos solamente
function escucharEventosActivos(callback) {
  const q = query(
    collection(db, "eventos"),
    where("estado", "!=", "RESUELTO"),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, snapshot => {
    snapshot.docChanges().forEach(change => {
      callback({ id: change.doc.id, ...change.doc.data() });
    });
  });
}
```

---

## 🎯 Resumen de Recomendaciones

### Para CABLES (1200 fijos):

| Recomendación | Prioridad | Impacto |
|---------------|-----------|---------|
| ✅ Mantener en GeoJSON estáticos | **Alta** | Costos, rendimiento |
| ⭐ Implementar carga bajo demanda | **Alta** | Tiempo de carga |
| 🔧 Agrupar por zonas geográficas | **Media** | Organización |
| 🚀 Considerar Vector Tiles (futuro) | **Baja** | Escalabilidad |

### Para DATOS DINÁMICOS:

| Recomendación | Prioridad | Impacto |
|---------------|-----------|---------|
| ✅ Mantener en Firebase (ya implementado) | **Alta** | Tiempo real |
| ⭐ Agregar índices compuestos | **Alta** | Consultas rápidas |
| 🔧 Relacionar eventos con cables | **Media** | Trazabilidad |
| 🔧 Filtrar por estado en listeners | **Media** | Rendimiento |

---

## 📈 Escalabilidad Futura

### Cuando llegues a 5000+ cables:

1. **Migrar a Vector Tiles** (Mapbox Tilesets)
2. **Implementar clustering** para visualización
3. **Usar Firestore subcollections** para eventos por cable

### Cuando llegues a 10000+ eventos:

1. **Implementar paginación** en consultas
2. **Archivar eventos resueltos** (mover a colección histórica)
3. **Usar Cloud Functions** para agregaciones

---

## ✅ Conclusión

**Tu arquitectura actual es correcta** para el escenario de 1200 cables en Bogotá:

- **Cables fijos → GeoJSON estáticos** ✅ (costo $0, buen rendimiento)
- **Cierres → Firebase** ✅ (tiempo real, multi-usuario)
- **Eventos → Firebase** ✅ (tiempo real, estado dinámico)
- **Rutas → Firebase** ✅ (tiempo real, GPS tracking)

La única mejora importante sería implementar **carga bajo demanda** para los cables, evitando cargar los 1200 cables al inicio.

---

**Última actualización:** $(date +%Y-%m-%d)  
**Versión:** 1.0
