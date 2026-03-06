# Revisión y mejoras – Herramienta Medir

## Propiedades actuales (conservadas)

- **SNAP automático** a capas configurables (`SNAP_LAYERS`), distancia 12 m.
- **Reserva R = +20%** sobre la distancia real (factor 1.20).
- **Deshacer último punto** (botón ↩️).
- **Limpiar todo** (botón 🗑️).
- **Panel fijo** abajo a la derecha, valores en tiempo real.
- **Línea naranja** (#eb7f33) en el mapa.
- **Restauración** tras cambio de estilo del mapa (`style.load`).
- **Cursor crosshair** cuando la herramienta está activa.
- **Prioridad de clic** frente a pines (cierres/eventos no abren popup si Medir está activa).

---

## Mejoras modernas implementadas

1. **Unidades adaptativas**  
   - Distancia &lt; 1 km: se muestra en **metros** (ej. `450 m`, `R 540 m`).  
   - Distancia ≥ 1 km: se muestra en **km** con 2 decimales (ej. `1.25 km`, `R 1.50 km`).

2. **Ignorar clic tras arrastre**  
   - Se usa la misma lógica que en “Montar Ruta”: si el usuario acaba de arrastrar el mapa (`movestart` / `moveend`), el siguiente clic no añade punto. Así se evitan puntos accidentales al soltar tras un pan.

3. **Contador de puntos**  
   - Línea de texto con el número de puntos: “0 puntos”, “1 punto”, “N puntos”. Ayuda a ver cuántos vértices tiene la polilínea.

4. **Tecla Escape**  
   - Con la herramienta activa, **Escape** limpia la medición (equivalente a “Limpiar todo”). No cierra la herramienta.

5. **Accesibilidad**  
   - Panel: `role="region"` y `aria-label="Panel de medición de distancia"`.  
   - Valores y contador: `aria-live="polite"` para lectores de pantalla.  
   - Botones: `title` y `aria-label` (“Deshacer último punto”, “Limpiar medición”), `type="button"`.

6. **Configuración de snap**  
   - Uso de `window.__FTTH_CONFIG__` como fallback si `App.CONFIG` no está disponible, para `SNAP_LAYERS`.

7. **Panel visual**  
   - `backdrop-filter: blur(10px)` para un fondo semitransparente moderno.  
   - Sombra y borde suave (`box-shadow` + borde sutil).  
   - Botones con `:hover` y transición en `:active`.  
   - Estilo del contador de puntos (`.m-points`) en gris suave.

---

## Mejoras futuras sugeridas (implementadas)

- **Copiar al portapapeles**: botón 📋 copia el valor actual (ej. `1.25 km (R 1.50 km)`). Muestra "✓" un momento al copiar. Fallback con `execCommand` o notificación si no hay clipboard API.
- **Etiquetas en segmentos**: capa de símbolos con la distancia de cada segmento en el punto medio de la línea (metros o km según longitud).
- **Puntos visibles**: capa de círculos en cada vértice (blanco con borde naranja), como en Montar Ruta.
- **Modo “Listo”**: botón ✓ **Finalizar** (visible con 2+ puntos) deja de añadir puntos y mantiene la línea y el valor visibles; el botón 🗑️ pasa a **Nueva medición** para limpiar y volver a dibujar. Escape también limpia/reinicia.
- **Ajuste de reserva**: la reserva está fija al **20 %**; se eliminó el selector desplegable (15 % / 20 % / 25 %) para simplificar el panel.

---

## Otras mejoras futuras (opcionales)

- **Persistir % de reserva** en `localStorage` (actualmente la reserva está fija al 20 %).
