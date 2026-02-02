# 📊 Procesar Datos GeoJSON de Santa Inés

## 🚀 Instrucciones Rápidas

### Opción 1: Desde archivo JSON

1. **Guarda los datos GeoJSON** que proporcionaste en un archivo llamado `datos_santa_ines.json` en la raíz del proyecto.

2. **Ejecuta el procesador:**
   ```bash
   node setup_and_process.js
   ```

### Opción 2: Desde stdin (línea de comandos)

1. **Crea el archivo desde stdin:**
   ```bash
   node create_data_file.js < datos.json
   ```
   
   O pega los datos directamente:
   ```bash
   node create_data_file.js
   # Pega los datos JSON aquí
   # Presiona Ctrl+D (Linux/Mac) o Ctrl+Z + Enter (Windows)
   ```

2. **Luego procesa:**
   ```bash
   node setup_and_process.js
   ```

## 📋 Qué hace el script

El script `setup_and_process.js`:

1. ✅ Lee los datos desde `datos_santa_ines.json`
2. ✅ Organiza los features por molécula (SI01, SI02, etc.)
3. ✅ Clasifica cada feature como:
   - **Cierres**: Features que empiezan con E0, E1, E2, etc.
   - **Eventos**: Features que contienen "CORTE", "TENDIDO", "DAÑO", etc.
   - **Otros**: Resto de features
4. ✅ Crea archivos GeoJSON organizados en:
   - `geojson/FTTH/SANTA_INES/SI01/cierres/SI01_cierres.geojson`
   - `geojson/FTTH/SANTA_INES/SI01/eventos/SI01_eventos.geojson`
   - etc.
5. ✅ Actualiza los archivos `index.json` automáticamente

## 📁 Estructura de salida

```
geojson/FTTH/SANTA_INES/
├── index.json (actualizado con todas las moléculas)
├── SI01/
│   ├── index.json
│   ├── cierres/
│   │   ├── index.json (actualizado)
│   │   └── SI01_cierres.geojson
│   └── eventos/
│       ├── index.json (actualizado)
│       └── SI01_eventos.geojson
├── SI02/
│   └── ...
└── ...
```

## 🔍 Verificación

Después de procesar, verifica que:
- ✅ Los archivos GeoJSON se crearon correctamente
- ✅ Los archivos `index.json` fueron actualizados
- ✅ Las moléculas aparecen en el index principal de Santa Inés

## ⚠️ Notas

- Los features sin molécula identificada se marcan como "UNKNOWN" y no se procesan
- El script crea automáticamente los directorios necesarios
- Los archivos existentes se actualizan, no se sobrescriben completamente
