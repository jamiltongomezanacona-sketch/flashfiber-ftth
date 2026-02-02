# 📱 Guía de Simulación de Tablets - FlashFiber FTTH

## Cómo probar la aplicación en modo tablet sin tener una tablet física

Esta guía te mostrará cómo simular diferentes tablets usando las herramientas de desarrollo del navegador.

---

## 🌐 Chrome / Edge (Recomendado)

### Método 1: DevTools con Dispositivos Predefinidos

1. **Abrir la aplicación en Chrome/Edge**
   ```
   http://localhost:puerto/index.html
   # O la URL donde esté desplegada
   ```

2. **Abrir DevTools**
   - Presiona `F12` o `Ctrl + Shift + I` (Windows/Linux)
   - `Cmd + Option + I` (Mac)
   - Clic derecho → "Inspeccionar"

3. **Activar Modo Dispositivo**
   - Clic en el ícono de **dispositivo móvil** (📱) en la esquina superior izquierda
   - O presiona `Ctrl + Shift + M` (Windows/Linux)
   - `Cmd + Shift + M` (Mac)

4. **Seleccionar Tablet**
   En la barra superior, selecciona un dispositivo:
   
   **Tablets Android:**
   - Nest Hub Max (1280 x 800)
   - Pixel Tablet (2560 x 1600)
   
   **iPads:**
   - iPad Mini (768 x 1024)
   - iPad Air (820 x 1180)
   - iPad Pro 11" (834 x 1194)
   - iPad Pro 12.9" (1024 x 1366)

5. **Rotar Pantalla**
   - Clic en el ícono de **rotación** (🔄) para cambiar entre portrait/landscape

### Método 2: Dimensiones Personalizadas

1. Abre DevTools (`F12`)
2. Activa modo dispositivo (📱)
3. En lugar de seleccionar un dispositivo, elige **"Responsive"**
4. Ingresa dimensiones personalizadas:

   ```
   Tablets comunes:
   - 768 x 1024  (iPad portrait)
   - 1024 x 768  (iPad landscape)
   - 800 x 1280  (Android 10" portrait)
   - 1280 x 800  (Android 10" landscape)
   - 600 x 960   (Tablet 7" portrait)
   - 960 x 600   (Tablet 7" landscape)
   ```

5. Ajusta el zoom si es necesario (25%, 50%, 75%, 100%)

### Método 3: Modo Responsive Avanzado

1. **Abrir DevTools** (`F12`)
2. **Activar modo dispositivo** (`Ctrl + Shift + M`)
3. **Configuración avanzada:**
   - Clic en el menú de 3 puntos (⋮) junto al nombre del dispositivo
   - Selecciona "Show device frame" (mostrar marco del dispositivo)
   - Activa "Show media queries" (ver media queries)
   - Activa "Show rulers" (mostrar reglas)

4. **Simular Touch:**
   - En DevTools → Settings (⚙️)
   - Devices → Add custom device
   - Activa "Mobile" para simular eventos touch

---

## 🦊 Firefox

### Modo de Diseño Adaptable

1. **Abrir Firefox** y cargar la aplicación

2. **Abrir Modo Diseño Adaptable**
   - `Ctrl + Shift + M` (Windows/Linux)
   - `Cmd + Option + M` (Mac)
   - O: Menú → Más herramientas → Diseño web adaptable

3. **Seleccionar Tablet**
   En la barra superior, selecciona:
   - iPad
   - iPad Pro
   - Dimensión personalizada

4. **Configurar dimensiones personalizadas:**
   ```
   Tablets comunes:
   768 x 1024  (iPad)
   1024 x 768  (iPad landscape)
   800 x 1280  (Android tablet)
   ```

5. **Rotar:** Clic en el ícono de rotación (🔄)

6. **Simular Touch:** 
   - Activa el ícono de "dedo" (👆) en la barra superior

---

## 🧭 Safari (Mac)

### Modo Diseño Responsive

1. **Abrir Safari** y cargar la aplicación

2. **Habilitar menú Desarrollo**
   - Safari → Preferencias → Avanzado
   - Marca "Mostrar el menú Desarrollo en la barra de menús"

3. **Activar Modo Responsive**
   - Menú Desarrollo → "Entrar en modo de diseño responsive"
   - O: `Cmd + Ctrl + R`

4. **Seleccionar iPad**
   En la barra superior:
   - iPad Mini
   - iPad
   - iPad Pro

5. **Rotar:** Usa el ícono de rotación

---

## 💻 Servidor Local para Pruebas

### Opción 1: Python (Simple HTTP Server)

```bash
# Si tienes Python 3:
cd /workspace
python3 -m http.server 8000

# Si tienes Python 2:
python -m SimpleHTTPServer 8000
```

Luego abre: `http://localhost:8000`

### Opción 2: Node.js (http-server)

```bash
# Instalar http-server globalmente
npm install -g http-server

# Iniciar servidor
cd /workspace
http-server -p 8000

# Con cache deshabilitado (mejor para desarrollo)
http-server -p 8000 -c-1
```

Luego abre: `http://localhost:8000`

### Opción 3: VS Code Live Server

1. Instala extensión "Live Server" en VS Code
2. Clic derecho en `index.html` → "Open with Live Server"
3. Abre en el navegador la URL que aparece

### Opción 4: PHP Built-in Server

```bash
cd /workspace
php -S localhost:8000
```

---

## 🧪 Pruebas Recomendadas

### 1. Breakpoints a Probar

```css
/* Móvil pequeño */
360 x 640   (Android pequeño)
375 x 667   (iPhone SE)
390 x 844   (iPhone 12/13)

/* Tablet portrait */
600 x 960   (Tablet 7")
768 x 1024  (iPad)
820 x 1180  (iPad Air)

/* Tablet landscape */
960 x 600   (Tablet 7" horizontal)
1024 x 768  (iPad horizontal)
1180 x 820  (iPad Air horizontal)

/* Desktop */
1280 x 720  (HD)
1920 x 1080 (Full HD)
```

### 2. Funcionalidades a Verificar

**Layout General:**
- [ ] Header responsive
- [ ] Sidebar funciona correctamente
- [ ] Panel de capas visible
- [ ] Controles del mapa accesibles
- [ ] Botones de tamaño adecuado (48px)
- [ ] Textos legibles

**Home (pages/home.html):**
- [ ] Grid de tarjetas: 1 columna (móvil)
- [ ] Grid de tarjetas: 2 columnas (tablet portrait)
- [ ] Grid de tarjetas: 3 columnas (tablet landscape)
- [ ] Tarjetas tienen buen espaciado
- [ ] Título responsive

**Mapa (pages/mapa-ftth.html):**
- [ ] Mapa ocupa todo el viewport
- [ ] Controles del mapa visibles
- [ ] Sidebar funciona como drawer
- [ ] Panel de capas se abre correctamente
- [ ] Buscador funcional

**Modales:**
- [ ] Modal de eventos: bottom sheet en móvil
- [ ] Modal de eventos: centrado en tablet
- [ ] Modal de rutas: bottom sheet en móvil
- [ ] Modal de rutas: centrado en tablet
- [ ] Inputs de 44px mínimo
- [ ] Grid 1 columna (móvil) / 2 columnas (tablet)

**Touch:**
- [ ] Botones fáciles de tocar
- [ ] Sin zoom accidental en inputs
- [ ] Scroll suave
- [ ] Gestos de pellizco funcionan

### 3. Orientaciones a Probar

**Portrait (Vertical):**
```
768 x 1024  (iPad)
600 x 960   (Tablet 7")
```
Verificar:
- Grid de 2 columnas
- Sidebar 340px
- Modales 85% width

**Landscape (Horizontal):**
```
1024 x 768  (iPad)
960 x 600   (Tablet 7")
```
Verificar:
- Grid de 3 columnas
- Sidebar 380px
- Mejor uso del espacio horizontal

---

## 🔍 DevTools Útiles

### Chrome/Edge DevTools

**Ver Media Queries:**
1. DevTools → More tools → CSS Overview
2. O en Elements tab → Computed → ver @media rules

**Simular Conexión Lenta:**
1. DevTools → Network tab
2. Throttling → Slow 3G / Fast 3G
3. Probar cache offline del Service Worker

**Ver Service Worker:**
1. DevTools → Application tab
2. Service Workers → ver estado
3. Cache Storage → ver assets cacheados

**Simular Geolocalización:**
1. DevTools → Console (⋮ menu)
2. Sensors → Geolocation
3. Ingresa coordenadas custom o usa ubicaciones predefinidas

### Firefox DevTools

**Ver Responsive:**
1. `Ctrl + Shift + M`
2. Clic en "Edit list" para agregar dispositivos custom

**Monitor de Red:**
1. Herramientas de desarrollo → Red
2. Cambiar throttling para simular conexión lenta

### Safari DevTools

**Web Inspector:**
1. Desarrollo → Mostrar Web Inspector
2. Elementos → ver estilos aplicados
3. Red → simular conexión lenta

---

## 📸 Capturar Screenshots de Tablets

### Chrome/Edge

**Screenshot de dispositivo completo:**
1. DevTools → Device Mode (📱)
2. Menú (⋮) → Capture screenshot
3. O: Capture full size screenshot

**Con marco de dispositivo:**
1. DevTools → Settings (⚙️)
2. Devices → Edit → "Show device frame"
3. Captura screenshot

### Firefox

1. Modo Responsive (`Ctrl + Shift + M`)
2. Clic en ícono de cámara (📷)
3. Guarda imagen

### Safari

1. Modo Responsive (`Cmd + Ctrl + R`)
2. Desarrollo → Tomar captura de pantalla

---

## 🎯 Casos de Uso Específicos

### Probar PWA (Instalación)

**Chrome/Edge:**
1. DevTools → Application tab
2. Manifest → Ver configuración
3. Service Workers → Ver estado
4. "Add to homescreen" debería aparecer

**Simular instalación:**
1. Menú del navegador (⋮)
2. "Instalar FlashFiber"
3. O en DevTools → Application → Manifest → "Add to homescreen"

### Probar Modo Offline

1. DevTools → Network tab
2. Marca checkbox "Offline"
3. Recarga la página
4. Verifica que cargue desde cache

### Probar Touch Events

**Chrome/Edge:**
1. DevTools → Settings (⚙️)
2. Experiments → Touch events
3. Reinicia DevTools

**Simular gestos:**
1. `Shift + Drag` = Scroll
2. `Ctrl + Drag` = Zoom (pellizco)

---

## ⚙️ Configuración Recomendada para Desarrollo

### Chrome DevTools Settings

1. `F1` en DevTools para abrir Settings
2. **Preferences:**
   - [x] Auto-open DevTools for popups
   - [x] Show rulers in device mode
   - [x] Show media queries
   - [x] Emulate a focused page

3. **Devices:**
   - Agregar dispositivos custom:
     - Tablet Android 10" (800x1280)
     - Tablet Android 7" (600x960)
     - iPad Mini (768x1024)

### Atajos de Teclado Útiles

```
F12                     - Abrir/cerrar DevTools
Ctrl + Shift + M        - Toggle device mode
Ctrl + Shift + P        - Command palette
Ctrl + ]                - Next panel
Ctrl + [                - Previous panel
Ctrl + Shift + C        - Inspect element
Ctrl + R                - Reload
Ctrl + Shift + R        - Hard reload (sin cache)
```

---

## 🐛 Solución de Problemas en Simulación

### Los estilos no se aplican

**Solución:**
1. Hard reload: `Ctrl + Shift + R`
2. Limpia cache: DevTools → Application → Clear storage
3. Verifica que mobile.css esté cargando

### Service Worker no actualiza

**Solución:**
1. DevTools → Application → Service Workers
2. Marca "Update on reload"
3. Clic en "Unregister"
4. Recarga la página

### Touch events no funcionan

**Solución:**
1. DevTools → Settings → Experiments
2. Activa "Emulation: Touch input override"
3. Reinicia DevTools

### Media queries no se activan

**Solución:**
1. Verifica dimensiones exactas del viewport
2. DevTools → Elements → Computed → Ver media queries activas
3. Asegúrate de que mobile.css esté cargando

### Zoom muy pequeño/grande

**Solución:**
1. En la barra de DevTools, ajusta zoom a 100%
2. O usa `Ctrl + 0` para resetear zoom

---

## 📋 Checklist de Pruebas

### Antes de empezar:
- [ ] Servidor local corriendo
- [ ] DevTools abierto
- [ ] Modo dispositivo activado
- [ ] Dimensiones configuradas

### Tablets a probar:
- [ ] iPad (768 x 1024) - Portrait
- [ ] iPad (1024 x 768) - Landscape
- [ ] Android 10" (800 x 1280) - Portrait
- [ ] Android 10" (1280 x 800) - Landscape
- [ ] Tablet 7" (600 x 960) - Portrait

### Páginas a verificar:
- [ ] /index.html
- [ ] /pages/home.html
- [ ] /pages/mapa-ftth.html

### Funcionalidades:
- [ ] PWA instalable
- [ ] Service Worker activo
- [ ] Modo offline funciona
- [ ] Touch targets adecuados
- [ ] Media queries aplicadas
- [ ] Orientación responsive

---

## 🎥 Video Tutoriales (Referencias)

**Chrome DevTools:**
- Google Chrome Developers - Device Mode
- Responsive Web Design Testing

**Firefox:**
- MDN Web Docs - Responsive Design Mode

**Safari:**
- Apple Developer - Web Inspector

---

## 🚀 Inicio Rápido

```bash
# 1. Levantar servidor local
cd /workspace
python3 -m http.server 8000

# 2. Abrir en navegador
http://localhost:8000

# 3. Abrir DevTools
Presionar F12

# 4. Activar modo tablet
Presionar Ctrl + Shift + M

# 5. Seleccionar iPad o dimensión custom
Ejemplo: 768 x 1024

# 6. ¡Probar la aplicación! 🎉
```

---

## 📱 Dimensiones de Referencia

### Tablets Populares

| Dispositivo | Portrait | Landscape | Ratio |
|------------|----------|-----------|-------|
| iPad Mini | 768 x 1024 | 1024 x 768 | 4:3 |
| iPad | 810 x 1080 | 1080 x 810 | 4:3 |
| iPad Air | 820 x 1180 | 1180 x 820 | 4:3 |
| iPad Pro 11" | 834 x 1194 | 1194 x 834 | 4:3 |
| iPad Pro 12.9" | 1024 x 1366 | 1366 x 1024 | 4:3 |
| Android 7" | 600 x 960 | 960 x 600 | 16:10 |
| Android 10" | 800 x 1280 | 1280 x 800 | 16:10 |
| Pixel Tablet | 1600 x 2560 | 2560 x 1600 | 16:10 |

---

## 💡 Tips Profesionales

1. **Siempre prueba en portrait Y landscape**
   - Las tablets se usan en ambas orientaciones

2. **Verifica touch targets**
   - Botones de mínimo 44px (móvil) y 48px (tablet)

3. **Prueba con throttling de red**
   - Simula 3G/4G para ver cómo carga en campo

4. **Verifica el Service Worker**
   - Asegúrate de que el modo offline funcione

5. **Usa rulers y media query markers**
   - Te ayudan a ver exactamente dónde se activan los breakpoints

6. **Prueba gestos táctiles**
   - Especialmente zoom y scroll en mapas

---

**¡Listo para simular tablets! 🚀**

Con esta guía puedes probar la aplicación FlashFiber FTTH en diferentes tamaños de tablets sin necesidad de tener los dispositivos físicos.
