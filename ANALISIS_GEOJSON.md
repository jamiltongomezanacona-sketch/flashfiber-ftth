# 📊 Análisis del Contenido GeoJSON

## 📁 Estructura de Directorios

```
geojson/
├── index.json                    # Índice raíz
├── CORPORATIVO/                  # Carpeta corporativa
│   └── [archivos JSON]
└── FTTH/                         # Carpeta principal FTTH
    ├── index.json
    ├── PLANTILLA_FTTH/           # Plantillas vacías
    │   ├── cables/_base.geojson
    │   ├── cierres/_base.geojson
    │   ├── eventos/_base.geojson
    │   ├── rutas/_base.geojson
    │   └── mantenimientos/_base.geojson
    └── SANTA_INES/               # Central Santa Inés
        ├── index.json
        └── SI17/                 # Molécula SI17
            ├── index.json
            ├── cables/
            │   ├── index.json
            │   └── SI17FH144.geojson  # ✅ Archivo con datos
            ├── cierres/
            │   └── index.json
            ├── eventos/
            │   └── index.json
            ├── rutas/
            │   └── index.json
            └── mantenimientos/
                └── index.json
```

---

## 📋 Estructura de Archivos

### 1. **Archivos `index.json`** (Índices de Navegación)

Los archivos `index.json` definen la estructura jerárquica del árbol de capas:

```json
{
  "label": "Nombre de la carpeta",
  "children": [
    {
      "type": "folder",           // Carpeta (tiene hijos)
      "label": "Nombre",
      "index": "ruta/index.json"
    },
    {
      "type": "layer",            // Capa GeoJSON (archivo final)
      "id": "ID_UNICO_CAPA",
      "label": "Etiqueta visible",
      "path": "archivo.geojson",
      "typeLayer": "line",        // "line" o "circle"
      "paint": {
        "line-color": "#00ff90",
        "line-width": 4
      }
    }
  ]
}
```

**Ejemplo real:**
```json
// geojson/FTTH/SANTA_INES/SI17/cables/index.json
{
  "label": "Cables",
  "children": [
    {
      "type": "layer",
      "id": "FTTH_SANTA_INES_SI17_SI17FH144",
      "label": "SI17FH144 · Troncal 144F",
      "path": "SI17FH144.geojson",
      "typeLayer": "line",
      "paint": {
        "line-color": "#00ff90",
        "line-width": 4
      }
    }
  ]
}
```

---

### 2. **Archivos GeoJSON** (Datos Espaciales)

#### **Estructura Estándar GeoJSON:**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "SI17FH144",
        "codigo": "SI17FH144",
        "central": "SANTA_INES",
        "molecula": "SI17",
        "tipo": "TRONCAL",
        "fibras": 144,
        "origen": "KML"
      },
      "geometry": {
        "type": "LineString",     // o "Point", "Polygon", "MultiLineString"
        "coordinates": [
          [-74.08827765238719, 4.562643584670648],
          [-74.0878301579865, 4.562423430762868],
          // ... más coordenadas
        ]
      }
    }
  ]
}
```

#### **Ejemplo Real (SI17FH144.geojson):**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "SI17FH144",
        "codigo": "SI17FH144",
        "central": "SANTA_INES",
        "molecula": "SI17",
        "tipo": "TRONCAL",
        "fibras": 144,
        "origen": "KML"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-74.08827765238719, 4.562643584670648],
          [-74.0878301579865, 4.562423430762868],
          // ... 397 coordenadas más
        ]
      }
    }
  ]
}
```

---

## 🔍 Tipos de Archivos GeoJSON

### **1. Cables** (`cables/*.geojson`)
- **Tipo de geometría:** `LineString` o `MultiLineString`
- **Propiedades comunes:**
  - `id`: Identificador único
  - `codigo`: Código del cable
  - `central`: Central a la que pertenece
  - `molecula`: Molécula asociada
  - `tipo`: Tipo de cable (TRONCAL, DISTRIBUCION, etc.)
  - `fibras`: Número de fibras
  - `origen`: Origen de los datos (KML, manual, etc.)

### **2. Cierres** (`cierres/*.geojson`)
- **Tipo de geometría:** `Point`
- **Propiedades esperadas:**
  - `id`: Identificador único
  - `codigo`: Código del cierre
  - `tipo`: Tipo de cierre (E1, E2, NAP)
  - `central`: Central
  - `molecula`: Molécula
  - `notas`: Observaciones

### **3. Eventos** (`eventos/*.geojson`)
- **Tipo de geometría:** `Point`
- **Propiedades esperadas:**
  - `id`: Identificador único
  - `tipo`: Tipo de evento
  - `accion`: Acción realizada
  - `estado`: Estado (CRITICO, PROVISIONAL, RESUELTO)
  - `central`: Central
  - `molecula`: Molécula
  - `impacto`: Impacto
  - `tecnico`: Técnico responsable
  - `notas`: Observaciones

### **4. Rutas** (`rutas/*.geojson`)
- **Tipo de geometría:** `LineString`
- **Propiedades esperadas:**
  - `id`: Identificador único
  - `nombre`: Nombre de la ruta
  - `tipo`: Tipo de ruta
  - `central`: Central
  - `longitud_m`: Longitud en metros
  - `estado`: Estado de la ruta
  - `tecnico`: Técnico responsable

### **5. Mantenimientos** (`mantenimientos/*.geojson`)
- **Tipo de geometría:** `Point` o `LineString`
- **Propiedades esperadas:**
  - `id`: Identificador único
  - `tipo`: Tipo de mantenimiento
  - `fecha`: Fecha del mantenimiento
  - `descripcion`: Descripción

---

## 📊 Estadísticas del Proyecto

### **Archivos Totales:**
- **GeoJSON:** 7 archivos `.geojson`
- **JSON (índices):** 527 archivos `index.json`
- **Total:** ~534 archivos

### **Estructura por Central:**
- **SANTA_INES:** ✅ Tiene datos (SI17 con cable SI17FH144)
- **Otras centrales:** Estructura creada pero archivos vacíos (plantillas)

### **Archivos con Datos Reales:**
1. ✅ `geojson/FTTH/SANTA_INES/SI17/cables/SI17FH144.geojson`
   - Tipo: LineString
   - Propiedades: id, codigo, central, molecula, tipo, fibras, origen
   - Coordenadas: ~398 puntos
   - Estado: ✅ Activo y cargado en el mapa

### **Archivos Vacíos (Sin Datos):**
- ⚠️ `geojson/FTTH/SANTA_INES/SI17/cierres/index.json` - Sin children
- ⚠️ `geojson/FTTH/SANTA_INES/SI17/eventos/index.json` - Sin children
- ⚠️ `geojson/FTTH/SANTA_INES/SI17/rutas/index.json` - Sin children
- ⚠️ `geojson/FTTH/PLANTILLA_FTTH/*/_base.geojson` - FeatureCollection vacío

**Nota:** Los archivos de cierres, eventos y rutas se están guardando en Firebase, no en archivos GeoJSON estáticos.

---

## 🔧 Cómo se Carga en la Aplicación

### **1. Carga Inicial:**
```javascript
// assets/js/map/mapa.layers.js
loadFTTHTree() → carga geojson/index.json
  ↓
walkNode() → recorre recursivamente los children
  ↓
createLayer() → carga cada archivo .geojson
  ↓
map.addSource() + map.addLayer() → muestra en el mapa
```

### **2. Estructura de Carga:**
1. **Raíz:** `geojson/index.json`
2. **Nivel 1:** `geojson/FTTH/index.json`
3. **Nivel 2:** `geojson/FTTH/SANTA_INES/index.json`
4. **Nivel 3:** `geojson/FTTH/SANTA_INES/SI17/index.json`
5. **Nivel 4:** `geojson/FTTH/SANTA_INES/SI17/cables/index.json`
6. **Archivo final:** `geojson/FTTH/SANTA_INES/SI17/cables/SI17FH144.geojson`

---

## ✅ Validaciones y Recomendaciones

### **1. Estructura Correcta:**
- ✅ Los `index.json` tienen estructura válida
- ✅ Los archivos `.geojson` siguen el estándar GeoJSON
- ✅ Las propiedades están bien definidas

### **2. Archivos Vacíos:**
- ⚠️ Muchos archivos `_base.geojson` están vacíos (solo `{"type": "FeatureCollection", "features": []}`)
- 💡 **Recomendación:** Estos archivos vacíos no deberían cargarse en el mapa para evitar errores

### **3. Propiedades Recomendadas:**

#### **Para Cables:**
```json
{
  "id": "string (requerido)",
  "codigo": "string (requerido)",
  "central": "string (requerido)",
  "molecula": "string (requerido)",
  "tipo": "TRONCAL | DISTRIBUCION | etc.",
  "fibras": "number",
  "origen": "KML | MANUAL | etc.",
  "fecha_creacion": "ISO 8601",
  "estado": "ACTIVO | INACTIVO"
}
```

#### **Para Cierres:**
```json
{
  "id": "string (requerido)",
  "codigo": "string (requerido)",
  "tipo": "E1 | E2 | NAP",
  "central": "string (requerido)",
  "molecula": "string (requerido)",
  "notas": "string",
  "fecha_creacion": "ISO 8601",
  "estado": "ACTIVO | INACTIVO"
}
```

#### **Para Eventos:**
```json
{
  "id": "string (requerido)",
  "tipo": "string (requerido)",
  "accion": "string",
  "estado": "CRITICO | PROVISIONAL | RESUELTO",
  "central": "string",
  "molecula": "string",
  "impacto": "string",
  "tecnico": "string",
  "notas": "string",
  "createdAt": "ISO 8601",
  "fotos_antes": "array de URLs",
  "fotos_despues": "array de URLs"
}
```

#### **Para Rutas:**
```json
{
  "id": "string (requerido)",
  "nombre": "string (requerido)",
  "tipo": "distribucion | troncal | etc.",
  "central": "string",
  "longitud_m": "number",
  "estado": "planificada | ejecutada | etc.",
  "tecnico": "string",
  "fecha": "ISO 8601",
  "notas": "string"
}
```

---

## 🐛 Problemas Potenciales

### **1. Archivos Vacíos:**
- Los archivos `_base.geojson` vacíos pueden causar errores al intentar cargarlos
- **Solución:** Verificar si `features.length > 0` antes de crear la capa

### **2. Coordenadas Inválidas:**
- Verificar que las coordenadas estén en formato `[longitud, latitud]`
- Validar que estén dentro de rangos válidos (longitud: -180 a 180, latitud: -90 a 90)

### **3. Propiedades Faltantes:**
- Algunos archivos pueden no tener todas las propiedades esperadas
- **Solución:** Usar valores por defecto o validar antes de usar

### **4. IDs Duplicados:**
- Verificar que los IDs de las capas sean únicos
- **Solución:** Generar IDs únicos basados en la ruta del archivo

---

## 📝 Recomendaciones de Mejora

### **1. Validación de GeoJSON:**
```javascript
function validateGeoJSON(geojson) {
  if (!geojson.type || geojson.type !== "FeatureCollection") {
    return { valid: false, error: "Tipo inválido" };
  }
  
  if (!Array.isArray(geojson.features)) {
    return { valid: false, error: "Features debe ser un array" };
  }
  
  if (geojson.features.length === 0) {
    return { valid: false, error: "Archivo vacío" };
  }
  
  // Validar coordenadas
  geojson.features.forEach(feature => {
    if (!feature.geometry || !feature.geometry.coordinates) {
      return { valid: false, error: "Geometría inválida" };
    }
  });
  
  return { valid: true };
}
```

### **2. Filtrar Archivos Vacíos:**
```javascript
// En createLayer()
if (!geojson.features || geojson.features.length === 0) {
  console.warn("⚠️ Archivo GeoJSON vacío, omitiendo:", id);
  return;
}
```

### **3. Normalizar Propiedades:**
```javascript
function normalizeProperties(props) {
  return {
    id: props.id || props.codigo || "SIN_ID",
    codigo: props.codigo || props.id || "",
    central: props.central || "SIN_CENTRAL",
    molecula: props.molecula || "",
    tipo: props.tipo || "SIN_TIPO",
    // ... más propiedades con valores por defecto
  };
}
```

### **4. Generar IDs Únicos:**
```javascript
function generateLayerId(basePath, fileName) {
  return basePath
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toUpperCase() + "_" + fileName.replace(".geojson", "");
}
```

---

## 🔗 Referencias

- **Estándar GeoJSON:** https://geojson.org/
- **Especificación RFC 7946:** https://tools.ietf.org/html/rfc7946
- **Mapbox GeoJSON:** https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson

---

**Última actualización:** 2026-01-28  
**Versión:** 1.0
