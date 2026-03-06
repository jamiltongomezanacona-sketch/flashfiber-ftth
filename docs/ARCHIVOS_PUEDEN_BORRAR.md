# Archivos que se pueden borrar (no usados o prescindibles)

Lista enumerada de archivos que **no se usan** en la app, en el build o en la documentación actual, o que son **prescindibles** si se unifica el flujo. Revisar antes de borrar por si algún proceso externo o equipo los usa.

---

## 1. Configuración

| # | Archivo | Motivo | Riesgo |
|---|---------|--------|--------|
| 1.1 | ~~**config.public.js**~~ | **Eliminado.** Ningún HTML lo cargaba; solo se citaba como "Opción B" en config.production.example.js. Instrucciones actualizadas. | — |

---

## 2. Scripts Python en la raíz (uso puntual o legacy)

| # | Archivo | Motivo | Riesgo |
|---|---------|--------|--------|
| 2.1 | ~~**analyze_xlsx.py** (raíz)~~ | **Eliminado.** Script de análisis con ruta fija a un .xlsx; no referenciado en el proyecto. | — |
| 2.2 | ~~**extract_e1_e2_direcciones.py** (raíz)~~ | **Eliminado.** Ruta fija a SI05.xlsx; no referenciado en docs ni en otros scripts. | — |

---

## 3. Scripts Python en `scripts/` (legacy o rutas obsoletas)

| # | Archivo | Motivo | Riesgo |
|---|---------|--------|--------|
| 3.1 | **scripts/kml_to_geojson_chico.py** | Según `docs/GEOJSON_NIVEL_PROFESIONAL.md`, escribe a rutas que ya no existen (CHICO en raíz). El proyecto usa `geojson/FTTH/CHICO/`. | Medio. Solo borrar si ya no se convierte CHICO desde este script; si se usa, habría que actualizar rutas de salida. |
| 3.2 | **scripts/kml_to_geojson_muzu.py** | Similar: doc indica que escribe a rutas que ya no existen. MUZU se procesa con `scripts/build-consolidado-geojson.js` y datos en `geojson/FTTH/MUZU/`. | Medio. Borrar o actualizar rutas según si aún se usa para MUZU.kml. |
| 3.3 | **scripts/update_chico_from_kml.py** | Convierte CHICO.kml a GeoJSON. Si toda la actualización de CHICO se hace con otros scripts (p. ej. cuni-kml o flujo CUNI/CHICO unificado), este puede ser redundante. | Bajo–medio. Verificar que ningún flujo documentado lo use. |

---

## 4. Scripts Node.js (uso muy puntual)

Ninguno de los siguientes está "sin usar": todos se invocan por línea de comandos o se citan en documentación. Se pueden **mover** a una carpeta `scripts/legacy/` o `scripts/kml-one-off/` si se quiere dejar `scripts/` más limpio, pero **no conviene borrarlos** sin confirmar:

- `scripts/kml-to-geojson.js` – CABLES.kml (uso manual).
- `scripts/update-co36-from-kml.js` – actualizar CO36 desde KML (uso manual).
- `scripts/update-cu21-from-kml.js` – actualizar CU21 desde KML (uso manual).
- `scripts/ftth-kml-to-geojson.js` – conversión por central (ej. HOLANDA) (uso manual).
- `scripts/cuni-kml-to-geojson.js` – CUNI.kml (uso manual).
- `scripts/verificar_geojson_ftth.js` – verificación (doc y uso manual).
- `scripts/data/import_santa_ines_data.js` – importación Santa Inés (doc).
- `scripts/data/verificar_y_corregir.js` – verificación de datos (doc).

No listados aquí = se usan en build o en npm (p. ej. `build-cables-index.js`, `build-consolidado-geojson.js`, `write-config-production.js`, `backup-firebase-to-pc.js`).

---

## 5. Documentación (opcional / redundante)

| # | Archivo | Motivo | Riesgo |
|---|---------|--------|--------|
| 5.1 | ~~**RESTAURAR_ETAPA1.md** (raíz)~~ | **Eliminado.** Describía restauración al estado "Etapa 1" con etiqueta Git; doc histórico. | — |

No se recomienda borrar el resto de .md: están referenciados en README, RECOMENDACIONES o en otros docs (p. ej. FIREBASE_COLECCIONES.md, GUIA_RAPIDA.md, docs/*).

---

## 6. Duplicados por ruta (Windows)

En algunos entornos aparecen las mismas rutas con barra invertida (ej. `scripts\build-cables-index.js`, `assets\js\utils\centrales.js`). Son el **mismo archivo** que `scripts/build-cables-index.js` y `assets/js/utils/centrales.js`. No hay que borrar "el duplicado": es una sola copia; solo conviene usar siempre rutas con `/` en código y en Git.

---

## 7. Resumen por acción recomendada

| Acción | Archivos |
|--------|----------|
| **Eliminados** | config.public.js, analyze_xlsx.py, extract_e1_e2_direcciones.py, SI05_DIRECCIONES_E1_E2.txt, RESTAURAR_ETAPA1.md |
| **Ignorados por Git** | datos_santa_ines.json (añadido a .gitignore; los scripts lo crean/usan en raíz; no se versiona) |
| **Revisar y luego borrar o actualizar** | scripts/kml_to_geojson_chico.py, scripts/kml_to_geojson_muzu.py, scripts/update_chico_from_kml.py |
| **Opcional (doc histórico)** | RESTAURAR_ETAPA1.md |
| **No borrar** | Todo lo que carga el HTML, el bundle (entry-ftth.js y sus imports), scripts de build/backup, y docs referenciados en README/RECOMENDACIONES. |

---

*Listado generado a partir del análisis del repositorio. Conviene hacer una búsqueda rápida (grep) por nombre de archivo antes de borrar por si hay referencias en scripts externos o en wikis.*
