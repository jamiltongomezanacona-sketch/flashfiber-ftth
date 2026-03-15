# Estándar de moléculas en el proyecto

Todas las moléculas del proyecto siguen la **misma estructura lógica y comportamiento**.

## Formato estándar

- **Código:** 2 letras + dígitos (ej. `SI03`, `CO36`, `MU05`).
- **Normalización:** Siempre en **mayúsculas** y sin espacios. Cualquier valor (`si03`, `Si03`, `SI03`) se trata igual.

## Dónde se aplica

1. **`assets/js/utils/centrales.js`**
   - `normalizeMolecula(mol)`: función única de normalización (expuesta en `window.__FTTH_CENTRALES__.normalizeMolecula`).
   - `generarMoleculas(prefijo)`: lista de códigos por central (SI01..SI30, CO01..CO40, etc.).

2. **Filtros en mapa (Mapbox)**
   - Comparaciones **case-insensitive**: se usa `["upcase", ["coalesce", ["get", "molecula"], ""]]` (o `_molecula`) y se compara con el valor normalizado.
   - Afecta a: capa de cierres, eventos, geojson-points, geojson-lines, notas rápidas, rutas guardadas.

3. **Buscador (`ui.buscador.js`)**
   - `normalizeMolecula`, `buildFilterMolecula`, `buildFilterMoleculaUnderscore`: misma lógica para pines, cables y dropdown de molécula.
   - Al seleccionar resultado tipo molécula o cable, los filtros de líneas y pines usan siempre el valor normalizado.

4. **Capas y árbol (`ui.layers.tree.js`, `mapa.layers.js`)**
   - Al activar un cable o molécula se usa la misma selección y filtros vía `setSelectedMoleculaForPins`.

5. **Escritura en Supabase**
   - Al guardar/actualizar **cierres**, **eventos**, **notas rápidas** y **rutas**, el campo `molecula` se normaliza antes de enviar a la base de datos (mayúsculas, trim). Así los datos almacenados son consistentes.

## Resumen

- **Una sola función de normalización:** `__FTTH_CENTRALES__.normalizeMolecula`.
- **Filtros:** siempre case-insensitive (upcase en expresión Mapbox + valor normalizado).
- **Persistencia:** molécula guardada en BD en formato estándar (mayúsculas).

Cualquier nueva funcionalidad que use moléculas debe usar `normalizeMolecula` para comparar/filtrar y, si escribe en BD, normalizar antes de guardar.
