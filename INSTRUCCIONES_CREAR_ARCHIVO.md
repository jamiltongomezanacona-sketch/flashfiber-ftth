# 📝 Instrucciones para Crear el Archivo datos_santa_ines.json

## 🚀 Método Rápido (Recomendado)

### Opción 1: Usando el script save_geojson_data.js

1. **Ejecuta el script:**
   ```bash
   node save_geojson_data.js
   ```

2. **Pega los datos JSON completos** que proporcionaste al inicio (todo el objeto FeatureCollection)

3. **Presiona Ctrl+Z + Enter** (Windows) o **Ctrl+D** (Linux/Mac) cuando termines

4. **El archivo se creará automáticamente** en `datos_santa_ines.json`

5. **Luego ejecuta el procesador:**
   ```bash
   node setup_and_process.js
   ```

### Opción 2: Crear el archivo manualmente

1. **Crea un archivo** llamado `datos_santa_ines.json` en la raíz del proyecto

2. **Copia y pega** los datos GeoJSON completos que proporcionaste al inicio

3. **Guarda el archivo**

4. **Ejecuta el procesador:**
   ```bash
   node setup_and_process.js
   ```

## 📋 Formato del Archivo

El archivo debe tener este formato:

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
    ...
  ]
}
```

## ✅ Verificación

Después de crear el archivo, verifica que:
- ✅ El archivo existe en la raíz del proyecto
- ✅ El JSON está bien formateado (puedes validarlo en https://jsonlint.com)
- ✅ Tiene la propiedad `type: "FeatureCollection"`
- ✅ Tiene un array `features` con los datos

## 🎯 Siguiente Paso

Una vez creado el archivo, ejecuta:

```bash
node setup_and_process.js
```

Este script procesará los datos y los organizará automáticamente en la estructura correcta.
