# Scripts de datos GeoJSON (Santa Inés)

Ejecutar **siempre desde la raíz del proyecto**, por ejemplo:

```bash
node scripts/data/crear_y_procesar.js
```

## Scripts

| Script | Uso |
|--------|-----|
| `crear_y_procesar.js` | Crea `datos_santa_ines.json` desde stdin y procesa todo en un paso (recomendado) |
| `create_data_file.js` | Solo crea `datos_santa_ines.json` desde stdin |
| `setup_and_process.js` | Procesa el archivo `datos_santa_ines.json` existente y genera GeoJSON por molécula |
| `import_santa_ines_data.js` | Alternativa de importación con índices extendidos |
| `verificar_y_corregir.js` | Verifica la estructura de archivos e índices |

Ver [GUIA_RAPIDA.md](../../GUIA_RAPIDA.md) y [README_PROCESAR_DATOS.md](../../README_PROCESAR_DATOS.md) en la raíz.
