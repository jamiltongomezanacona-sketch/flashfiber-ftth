# 🔧 Solución: Los datos no se ven en el mapa

## ❌ Problema Identificado

1. **Archivo `datos_santa_ines.json` está VACÍO** (0 features)
2. **No se crearon los archivos GeoJSON** (SI01_cierres.geojson, etc.)
3. **Los índices están vacíos** (sin children)
4. **El mapa no puede cargar capas sin datos**

## ✅ Solución Paso a Paso

### Paso 1: Guardar los datos

**Opción A: Usando el script (Recomendado)**
```bash
node crear_y_procesar.js
```
Luego:
1. Pega los datos JSON completos que proporcionaste al inicio
2. Presiona **Ctrl+Z + Enter** (Windows)

**Opción B: Manualmente**
1. Abre `datos_santa_ines.json` en un editor
2. Reemplaza el contenido con los datos JSON completos
3. Guarda el archivo

### Paso 2: Procesar los datos

Si usaste la Opción A, los datos se procesan automáticamente.

Si usaste la Opción B, ejecuta:
```bash
node setup_and_process.js
```

### Paso 3: Verificar

Ejecuta:
```bash
node verificar_y_corregir.js
```

Deberías ver:
- ✅ Archivo tiene datos (X features)
- ✅ Archivos GeoJSON creados
- ✅ Índices actualizados

### Paso 4: Recargar el mapa

1. Recarga la página del mapa (F5)
2. Abre la consola del navegador (F12)
3. Verifica que no haya errores
4. Las capas deberían aparecer en el panel lateral

## 🔍 Verificación en el Navegador

1. Abre la consola (F12)
2. Busca mensajes como:
   - `✅ GeoJSON cargado: X features`
   - `🌳 Árbol FTTH procesado`
3. Si ves errores 404, significa que los archivos no se crearon
4. Si ves "GeoJSON vacío", significa que los archivos están vacíos

## ⚠️ Problemas Comunes

### "GeoJSON vacío, omitiendo"
- **Causa**: Los archivos GeoJSON están vacíos
- **Solución**: Verifica que `datos_santa_ines.json` tenga datos y reprocesa

### "HTTP 404"
- **Causa**: Los archivos no existen
- **Solución**: Ejecuta `node setup_and_process.js` para crearlos

### "No se encontraron features"
- **Causa**: El archivo de datos está vacío
- **Solución**: Guarda los datos JSON completos en `datos_santa_ines.json`

## 📝 Formato del Archivo de Datos

El archivo `datos_santa_ines.json` debe tener este formato:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-74.08814589693468, 4.562510732351684, 0]
      },
      "properties": {
        "name": "CENTRAL SANTA INES",
        ...
      }
    },
    ... (muchos más features)
  ]
}
```

## 🎯 Resultado Esperado

Después de procesar correctamente:
- ✅ Archivos en `geojson/FTTH/SANTA_INES/SI*/cierres/*.geojson`
- ✅ Archivos en `geojson/FTTH/SANTA_INES/SI*/eventos/*.geojson`
- ✅ Índices actualizados con las capas
- ✅ Capas visibles en el panel lateral del mapa
- ✅ Puntos visibles en el mapa al activar las capas
