# 📊 Resumen: Procesamiento de Datos GeoJSON de Santa Inés

## ✅ Scripts Creados

He creado los siguientes scripts para procesar tus datos GeoJSON:

1. **`crear_archivo_completo.js`** - Crea el archivo `datos_santa_ines.json` desde stdin
2. **`setup_and_process.js`** - Procesa los datos y los organiza automáticamente
3. **`process_from_stdin.js`** - Procesa datos directamente desde stdin
4. **`save_geojson_data.js`** - Guarda datos desde stdin a archivo

## 🚀 Pasos para Procesar los Datos

### Paso 1: Crear el archivo de datos

Ejecuta:
```bash
node crear_archivo_completo.js
```

Luego:
1. Pega los datos JSON completos que proporcionaste al inicio
2. Presiona **Ctrl+Z + Enter** (Windows) cuando termines

### Paso 2: Procesar los datos

Una vez creado el archivo, ejecuta:
```bash
node setup_and_process.js
```

## 📋 Qué hace el procesamiento

El script `setup_and_process.js`:

1. ✅ Lee los datos desde `datos_santa_ines.json`
2. ✅ Organiza los features por molécula (SI01, SI02, SI03, etc.)
3. ✅ Clasifica cada feature como:
   - **Cierres**: Features que empiezan con E0, E1, E2, etc.
   - **Eventos**: Features que contienen "CORTE", "TENDIDO", "DAÑO", etc.
4. ✅ Crea archivos GeoJSON organizados en:
   - `geojson/FTTH/SANTA_INES/SI01/cierres/SI01_cierres.geojson`
   - `geojson/FTTH/SANTA_INES/SI01/eventos/SI01_eventos.geojson`
   - etc.
5. ✅ Actualiza automáticamente los archivos `index.json`

## 📁 Estructura de Salida

```
geojson/FTTH/SANTA_INES/
├── index.json (actualizado)
├── SI01/
│   ├── index.json
│   ├── cierres/
│   │   ├── index.json
│   │   └── SI01_cierres.geojson
│   └── eventos/
│       ├── index.json
│       └── SI01_eventos.geojson
├── SI02/
│   └── ...
└── ...
```

## ⚠️ Notas Importantes

- Los features sin molécula identificada se marcan como "UNKNOWN" y no se procesan
- El script crea automáticamente los directorios necesarios
- Los archivos existentes se actualizan, no se sobrescriben completamente
- Asegúrate de que el JSON esté bien formateado antes de procesarlo

## 🔍 Verificación

Después de procesar, verifica que:
- ✅ Los archivos GeoJSON se crearon correctamente
- ✅ Los archivos `index.json` fueron actualizados
- ✅ Las moléculas aparecen en el index principal de Santa Inés
