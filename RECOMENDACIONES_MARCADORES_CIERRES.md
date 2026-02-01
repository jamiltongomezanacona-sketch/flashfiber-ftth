# 🎯 Recomendaciones: Marcadores de Cierres Estilo Google Maps

## ✅ Implementado

### 1. **Iconos SVG Personalizados**
- Forma de pin estilo Google Maps
- Sombra para dar profundidad
- Colores diferenciados por tipo:
  - **E1 (Derivación)**: Azul (#2196F3)
  - **E2 (Splitter)**: Naranja (#FF9800)
  - **NAP**: Verde (#4CAF50)
  - **Sin tipo**: Gris (#9E9E9E)

### 2. **Etiquetas en Marcadores**
- Muestra código o molécula (máximo 4 caracteres)
- Etiqueta blanca con borde del color del tipo
- Texto legible y contrastado

### 3. **Tamaños Adaptativos**
- Zoom 10: 60% del tamaño
- Zoom 15: 100% del tamaño
- Zoom 20: 140% del tamaño
- Mejora la visibilidad según el nivel de zoom

### 4. **Interactividad**
- Cursor pointer al pasar sobre marcadores
- Click para editar cierre
- Iconos siempre visibles (no se ocultan al solaparse)

---

## 🚀 Mejoras Adicionales Recomendadas

### 1. **Clustering de Marcadores** (Alta Prioridad)
Cuando hay muchos cierres en un área pequeña, agruparlos:

```javascript
// En initLayer(), agregar clustering:
App.map.addSource(SOURCE_ID, {
  type: "geojson",
  data: { type: "FeatureCollection", features: [] },
  cluster: true,
  clusterRadius: 50,
  clusterMaxZoom: 14
});

// Capa de clusters
App.map.addLayer({
  id: "cierres-clusters",
  type: "circle",
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#FF9800",
    "circle-radius": [
      "step",
      ["get", "point_count"],
      20,  // Radio base
      10, 25,  // 10+ cierres: 25px
      50, 35   // 50+ cierres: 35px
    ],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#fff"
  }
});

// Texto en clusters
App.map.addLayer({
  id: "cierres-cluster-count",
  type: "symbol",
  source: SOURCE_ID,
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    "text-size": 12
  },
  paint: {
    "text-color": "#fff"
  }
});
```

### 2. **Popup Informativo** (Media Prioridad)
Mostrar información al hacer click (similar a eventos):

```javascript
App.map.on("click", LAYER_ID, (e) => {
  const f = e.features?.[0];
  if (!f) return;
  
  const props = f.properties || {};
  const html = `
    <div class="popup" style="min-width:200px">
      <b>🔒 Cierre:</b> ${props.codigo || "N/A"}<br>
      <b>📦 Tipo:</b> ${props.tipo || "N/A"}<br>
      <b>🏢 Central:</b> ${props.central || "N/A"}<br>
      <b>🧬 Molécula:</b> ${props.molecula || "N/A"}<br>
      <b>📝 Notas:</b> ${props.notas || "Sin notas"}
      <hr>
      <button id="btnEditCierrePopup" class="popup-btn">
        ✏️ Editar
      </button>
    </div>
  `;
  
  new mapboxgl.Popup({ closeButton: true })
    .setLngLat(e.lngLat)
    .setHTML(html)
    .addTo(App.map);
    
  // Event listener para editar
  setTimeout(() => {
    document.getElementById("btnEditCierrePopup")
      ?.addEventListener("click", () => {
        abrirEdicionCierre(props);
      });
  }, 100);
});
```

### 3. **Animación al Agregar** (Baja Prioridad)
Efecto de aparición suave:

```javascript
// En addCierreToMap(), después de agregar:
const marker = App.map.getSource(SOURCE_ID);
if (marker) {
  // Animación de escala
  App.map.setPaintProperty(LAYER_ID, "icon-size", [
    "interpolate",
    ["linear"],
    ["zoom"],
    10, 0.6,
    15, 1.0,
    20, 1.4
  ]);
  
  // Efecto de "bounce" (opcional con CSS)
  // Se puede agregar con animaciones CSS en el icono
}
```

### 4. **Filtros por Tipo** (Alta Prioridad)
Permitir mostrar/ocultar tipos específicos:

```javascript
// Agregar controles de filtro en el sidebar
function filterByTipo(tipo) {
  if (!tipo) {
    // Mostrar todos
    App.map.setFilter(LAYER_ID, null);
  } else {
    // Filtrar por tipo
    App.map.setFilter(LAYER_ID, ["==", ["get", "tipo"], tipo]);
  }
}

// UI en sidebar:
// ☑️ E1 - Derivación
// ☑️ E2 - Splitter  
// ☑️ NAP
```

### 5. **Búsqueda de Cierres** (Media Prioridad)
Buscador para encontrar cierres por código o molécula:

```javascript
function buscarCierres(termino) {
  const resultados = App.data.cierres.filter(c => {
    const props = c.properties || {};
    const busqueda = termino.toLowerCase();
    return (
      props.codigo?.toLowerCase().includes(busqueda) ||
      props.molecula?.toLowerCase().includes(busqueda) ||
      props.central?.toLowerCase().includes(busqueda)
    );
  });
  
  // Zoom a resultados
  if (resultados.length > 0) {
    const bounds = new mapboxgl.LngLatBounds();
    resultados.forEach(r => {
      bounds.extend(r.geometry.coordinates);
    });
    App.map.fitBounds(bounds, { padding: 50 });
  }
}
```

### 6. **Estados Visuales** (Media Prioridad)
Si los cierres tienen estados (activo, inactivo, pendiente):

```javascript
function getColorByEstado(estado) {
  switch (estado) {
    case "ACTIVO": return "#4CAF50"; // Verde
    case "INACTIVO": return "#9E9E9E"; // Gris
    case "PENDIENTE": return "#FFC107"; // Amarillo
    default: return getColorByTipo(tipo);
  }
}

// Agregar borde o indicador visual según estado
```

### 7. **Exportar/Importar Cierres** (Baja Prioridad)
Funcionalidad para exportar cierres a GeoJSON o CSV:

```javascript
function exportarCierres() {
  const geojson = {
    type: "FeatureCollection",
    features: App.data.cierres
  };
  
  const blob = new Blob([JSON.stringify(geojson, null, 2)], 
    { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cierres-${new Date().toISOString()}.geojson`;
  a.click();
}
```

---

## 🎨 Personalización de Colores

Si quieres cambiar los colores de los tipos, modifica la función `getColorByTipo()`:

```javascript
function getColorByTipo(tipo) {
  switch (tipo) {
    case "E1": return "#YOUR_COLOR"; // Tu color personalizado
    case "E2": return "#YOUR_COLOR";
    case "NAP": return "#YOUR_COLOR";
    default: return "#YOUR_COLOR";
  }
}
```

**Paleta de colores sugerida:**
- **E1**: `#2196F3` (Azul Material)
- **E2**: `#FF9800` (Naranja Material)
- **NAP**: `#4CAF50` (Verde Material)
- **Alternativa**: `#9C27B0` (Morado), `#F44336` (Rojo), `#00BCD4` (Cyan)

---

## 📱 Optimización Móvil

Los marcadores ya están optimizados para móvil con:
- Tamaños adaptativos según zoom
- Touch targets adecuados (icon-allow-overlap: true)
- Cursor pointer para mejor UX

**Mejora adicional para móvil:**
- Aumentar tamaño mínimo en móvil
- Agregar vibración al tocar (si está disponible)

---

## 🔧 Troubleshooting

### Los iconos no aparecen
1. Verificar que `App.map.isStyleLoaded()` sea true
2. Revisar consola para errores de carga de imágenes
3. Asegurar que los iconos se carguen antes de refrescar la capa

### Los colores no se aplican
1. Verificar que `cierre.tipo` tenga un valor válido
2. Revisar la función `getColorByTipo()`

### El texto no se muestra
1. Verificar que `cierre.codigo` o `cierre.molecula` existan
2. El texto se limita a 4 caracteres para legibilidad

---

## 📊 Rendimiento

**Optimizaciones implementadas:**
- Cache de iconos cargados (`loadedIcons`)
- Carga asíncrona de iconos
- Tamaños adaptativos según zoom

**Mejoras futuras:**
- Lazy loading de iconos (cargar solo cuando son visibles)
- Debounce en refreshLayer() si hay muchos cambios
- Virtualización de marcadores en áreas grandes

---

## ✅ Checklist de Implementación

- [x] Iconos SVG personalizados
- [x] Colores por tipo
- [x] Etiquetas con código/molécula
- [x] Tamaños adaptativos
- [x] Interactividad (click, hover)
- [ ] Clustering (recomendado)
- [ ] Popup informativo (recomendado)
- [ ] Filtros por tipo (recomendado)
- [ ] Búsqueda de cierres (opcional)
- [ ] Exportar/Importar (opcional)

---

**Última actualización:** 2026-01-28
**Versión:** 1.0
