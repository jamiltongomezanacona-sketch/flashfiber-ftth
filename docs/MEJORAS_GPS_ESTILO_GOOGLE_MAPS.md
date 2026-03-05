# Mejoras GPS – Estilo Google Maps

Objetivo: que el GPS de la app se comporte como el de Google Maps (punto azul, precisión, orientación y seguimiento).

---

## 1. **Círculo de precisión (accuracy)**

- **Ahora:** Solo se dibuja un punto (círculo fijo).
- **Google Maps:** Muestra un halo semi-transparente alrededor del punto que representa el margen de error del GPS (`coords.accuracy` en metros).
- **Mejora:** Añadir una capa tipo `fill` (o círculo grande) que use `coords.accuracy` como radio en metros (Mapbox: `circle-radius` en metros con `circle-pitch-scale: 'viewport'` o conversión a píxeles según zoom), color tipo `rgba(66, 133, 244, 0.2)` (azul suave).

---

## 2. **Punto azul (blue dot)**

- **Ahora:** Círculo cyan (#22d3ee) con borde blanco.
- **Google Maps:** Punto azul característico (#4285F4 o similar), a veces con pequeño brillo o sombra.
- **Mejora:** Cambiar color del punto a azul tipo Google (#4285F4), opcionalmente con sombra/suave gradiente para que destaque sobre el mapa.

---

## 3. **Orientación del mapa (bearing / “norte arriba” vs “rumbo arriba”)**

- **Ahora:** El mapa no rota; siempre norte arriba.
- **Google Maps:** Modo “rumbo arriba”: el mapa rota según la dirección en la que miras (`coords.heading` o DeviceOrientation).
- **Mejora:**  
  - Usar `coords.heading` (0–360°) cuando esté disponible.  
  - Aplicar `map.easeTo({ bearing: heading })` al actualizar la posición (suavizado).  
  - Opcional: usar Device Orientation API en móvil para orientación en tiempo real cuando `heading` no venga del GPS.

---

## 4. **Modo seguimiento (centrar siempre en mi posición)**

- **Ahora:** Cada actualización hace `easeTo` al punto; si el usuario mueve el mapa, el siguiente update lo vuelve a centrar (puede ser molesto).
- **Google Maps:** Modo “centrar en mí”: el mapa sigue al usuario; si el usuario hace pan/zoom, se sale del modo y deja de recentrar hasta que vuelve a pulsar “mi ubicación”.
- **Mejora:**  
  - Estado `gpsFollowMode: true | false`.  
  - Solo hacer `easeTo`/`flyTo` al punto cuando `gpsFollowMode === true`.  
  - Al detectar interacción del usuario (movestart / zoomstart), poner `gpsFollowMode = false`.  
  - Botón “centrar en mí” (o segundo toque en el botón GPS) vuelve a activar el seguimiento y recentra.

---

## 5. **Suavizado del movimiento (smooth follow)**

- **Ahora:** Cada posición nueva hace un `easeTo` de 600 ms; muchas actualizaciones pueden generar saltos.
- **Google Maps:** El punto se mueve de forma fluida y el mapa lo sigue con animaciones suaves.
- **Mejora:**  
  - Interpolar la posición del punto (y opcionalmente del centro del mapa) entre la posición anterior y la nueva en lugar de saltar.  
  - Reducir duración del `easeTo` (p. ej. 300–400 ms) o usar una curva más suave.  
  - Si la diferencia de posición es pequeña (< umbral en metros), no recentrar el mapa y solo actualizar el punto, para evitar “vibración” del mapa.

---

## 6. **Botón “Mi ubicación” en el mapa (FAB)**

- **Ahora:** El GPS se activa desde el menú lateral (sidebar).
- **Google Maps:** Botón flotante en una esquina del mapa para ir a “mi ubicación” y activar seguimiento.
- **Mejora:** Añadir un botón flotante (FAB) en una esquina (p. ej. abajo-derecha, cerca de controles de zoom) que:  
  - Al pulsar: active GPS si no está activo y centre en la posición actual.  
  - Segundo pulso o estado “seguimiento”: active el modo seguimiento (centrar siempre en mí).  
  - Indicación visual cuando el seguimiento está activo (p. ej. botón relleno o distinto color).

---

## 7. **Zoom adecuado al activar GPS**

- **Ahora:** Zoom fijo 18.
- **Google Maps:** Suele usar un zoom que permite ver el círculo de precisión y el entorno (p. ej. 17–18 en ciudad).
- **Mejora:** Mantener zoom 17–18 por defecto; opcionalmente ajustar el zoom para que el círculo de precisión quede visible (p. ej. en función de `accuracy` y tamaño del viewport).

---

## 8. **Feedback cuando no hay señal o hay error**

- **Ahora:** Solo `console.error` en error.
- **Google Maps:** Mensaje o icono cuando la ubicación no está disponible o es imprecisa.
- **Mejora:**  
  - Mostrar un toast o mensaje breve (“Buscando GPS…”, “Señal débil”, “Sin permiso de ubicación”).  
  - Si `position.coords.accuracy > umbral` (p. ej. 50 m), opcionalmente mostrar “Precisión baja” o un borde/color distinto en el círculo de precisión.

---

## 9. **Opciones de Geolocation API**

- **Ahora:** `enableHighAccuracy: true`, `maximumAge: 2000`, `timeout: 10000`.
- **Google Maps:** Prioriza precisión y actualización frecuente en modo navegación.
- **Mejora:**  
  - Mantener `enableHighAccuracy: true`.  
  - Reducir `maximumAge` (p. ej. 500–1000 ms) para posiciones más frescas cuando el GPS está activo.  
  - Ajustar `timeout` según contexto (p. ej. 15 s si se quiere esperar más a la primera posición).

---

## 10. **Resumen de prioridad**

| # | Mejora                         | Impacto | Esfuerzo |
|---|--------------------------------|--------|----------|
| 1 | Círculo de precisión (accuracy)| Alto   | Medio    |
| 2 | Punto azul estilo Google       | Medio  | Bajo     |
| 3 | Orientación (bearing/heading)   | Alto   | Medio    |
| 4 | Modo seguimiento on/off        | Alto   | Medio    |
| 5 | Suavizado del movimiento       | Medio  | Medio    |
| 6 | Botón FAB “Mi ubicación”       | Alto   | Bajo     |
| 7 | Zoom según precisión (opcional)| Bajo   | Bajo     |
| 8 | Mensajes de error / precisión  | Medio  | Bajo     |
| 9 | Ajuste de opciones Geolocation | Bajo   | Bajo     |

Implementar en este orden suele dar el mayor parecido a Google Maps: **4 (seguimiento)** → **1 (círculo precisión)** → **2 (punto azul)** → **6 (FAB)** → **3 (orientación)** → **5 (suavizado)** → **8 y 9**.
