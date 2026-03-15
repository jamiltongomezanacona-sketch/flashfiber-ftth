# Modificaciones que alteraron la visualización de pines por molécula

Este documento identifica los **commits y cambios concretos** que rompieron el comportamiento: al hacer clic en una molécula (ej. SI03) deben mostrarse **solo** los pines de esa molécula.

---

## Commits que causaron el fallo (ya revertidos)

Esos commits se revirtieron con `git reset --hard 27c225b` y `git push --force`. No están en `main` actual.

| Commit    | Mensaje | Efecto |
|----------|---------|--------|
| **80c05a0** | fix: evitar error Style is not done loading - recheck tras await y diferir consolidado | Difería la carga del consolidado; podía solaparse con el filtro por molécula. |
| **1dcf66c** | fix: runWhenStyleLoaded para evitar error Style is not done loading (Mapbox) | **Principal causa**: el filtro por molécula pasó a ejecutarse en **asíncrono**. |
| **c17d5d7** | fix: filtro por molécula síncrono y no mostrar todos los pines en showPinsWhenCableActivated | Corregía parte del problema pero dependía de 1dcf66c. |
| **58dda69** | fix: no ocultar pines cuando hay molécula seleccionada en enforceOnlyCentralesVisible | Ajuste adicional en `mapa.layers.js`. |

---

## Cambio que rompió la visualización (detalle)

### 1. **`assets/js/ui/ui.buscador.js` – commit 1dcf66c**

**Antes (correcto):**
- `setSelectedMoleculaForPins` comprobaba `map.isStyleLoaded()`.
- Si no estaba cargado: `map.once("load", () => setSelectedMoleculaForPins(...))` y `return`.
- Si estaba cargado: aplicaba **en el mismo tick** visibilidad y filtro por molécula en `LAYER_CIERRES`, `LAYER_EVENTOS`, `geojson-points`, rutas y notas.

**Después (incorrecto):**
- Toda esa lógica se metió dentro de `App.runWhenStyleLoaded?.(() => { ... })`.
- El callback se ejecutaba **después** (en otro momento del event loop).
- Mientras tanto, otro código (p. ej. `showPinsWhenCableActivated`) podía poner las capas en `visible` **sin filtro**, mostrando todos los pines.

### 2. **`assets/js/ui/ui.layers.tree.js` – estado previo a c17d5d7**

En `showPinsWhenCableActivated`:
- Se llamaba a `setSelectedMoleculaForPins(molecula)` (que con 1dcf66c ya era asíncrono).
- Inmediatamente después se hacía:
  - `[LAYER_CENTRALES, LAYER_CIERRES, LAYER_EVENTOS].forEach(id => map.setLayoutProperty(id, "visibility", "visible"))`.
- Eso dejaba **cierres y eventos visibles sin filtro** hasta que se ejecutaba el callback de `runWhenStyleLoaded`, por eso a veces se veían todos los pines.

---

## Estado actual (correcto) tras la reversión

- **`ui.buscador.js`**: `setSelectedMoleculaForPins` vuelve a aplicar el filtro **en el mismo tick** cuando `map.isStyleLoaded()` es true; solo usa `map.once("load", ...)` cuando el estilo aún no está listo.
- **`ui.layers.tree.js`**: En `showPinsWhenCableActivated` solo se pone en visible la capa de **centrales**; la visibilidad y el filtro de cierres/eventos los sigue aplicando únicamente `setSelectedMoleculaForPins`.

---

## Cómo evitar volver a romperlo

1. **No** envolver en `runWhenStyleLoaded` (ni otro “cuando el estilo esté listo”) la lógica que aplica el **filtro por molécula** en `setSelectedMoleculaForPins`. Esa parte debe ejecutarse en el mismo tick cuando el estilo ya está cargado, o vía `map.once("load", ...)` sin pasos asíncronos intermedios que toquen visibilidad/filtro de cierres/eventos.
2. **No** poner `LAYER_CIERRES` ni `LAYER_EVENTOS` en `visible` sin filtro desde `showPinsWhenCableActivated`; dejar que solo `setSelectedMoleculaForPins` controle visibilidad y filtro de esas capas.

Para ver exactamente qué se cambió en cada commit:
```bash
git show 1dcf66c -- assets/js/ui/ui.buscador.js
git show c17d5d7 -- assets/js/ui/ui.layers.tree.js
```
