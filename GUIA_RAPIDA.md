# 🚀 Guía Rápida: Procesar Datos GeoJSON

**Ejecutar siempre desde la raíz del proyecto.**

## ⚡ Método Más Rápido

### Opción 1: Todo en un solo paso (Recomendado)

```bash
node scripts/data/crear_y_procesar.js
```

Luego:
1. Pega los datos JSON completos que proporcionaste al inicio
2. Presiona **Ctrl+Z + Enter** (Windows) o **Ctrl+D** (Linux/Mac)

El script:
- ✅ Crea el archivo `datos_santa_ines.json`
- ✅ Procesa y organiza los datos automáticamente
- ✅ Crea todos los archivos GeoJSON organizados
- ✅ Actualiza los índices

### Opción 2: En dos pasos

**Paso 1: Crear el archivo**
```bash
node scripts/data/create_data_file.js
```
(Pega los datos JSON y presiona Ctrl+D en Linux/Mac o Ctrl+Z + Enter en Windows)

**Paso 2: Procesar**
```bash
node scripts/data/setup_and_process.js
```

## 📋 Datos Necesarios

Necesitas pegar el objeto JSON completo que proporcionaste al inicio, que tiene esta estructura:

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

## ✅ Verificación

Después de ejecutar, verifica que:
- ✅ El archivo `datos_santa_ines.json` existe
- ✅ Se crearon archivos en `geojson/FTTH/SANTA_INES/SI*/cierres/` y `eventos/`
- ✅ Los archivos `index.json` fueron actualizados

## 🎯 Resultado Esperado

Los datos se organizarán así:
- `SI01/cierres/SI01_cierres.geojson`
- `SI01/eventos/SI01_eventos.geojson`
- `SI02/cierres/SI02_cierres.geojson`
- etc.
