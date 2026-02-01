# 📱 Guía de Instalación para Tablets

## FlashFiber FTTH - Plataforma GIS Optimizada para Tablets

Esta aplicación está optimizada para funcionar en tablets Android y iPad, permitiendo trabajar en campo de manera eficiente.

---

## 🎯 Requisitos

### Tablets Compatible:
- **Android**: Versión 8.0 o superior
- **iPad**: iOS 13 o superior
- Conexión a internet (WiFi o datos móviles)
- Navegador moderno (Chrome, Safari, Edge)

### Especificaciones Recomendadas:
- Pantalla de 7" o superior
- 2GB RAM mínimo
- Espacio de almacenamiento: 50MB libres

---

## 📥 Instalación en Android (Chrome/Edge)

### Opción 1: Instalar como PWA (Recomendado)

1. **Abrir la aplicación en el navegador**
   - Abre Chrome o Edge en tu tablet
   - Navega a la URL de la aplicación

2. **Instalar en pantalla de inicio**
   - Toca el menú del navegador (⋮) en la esquina superior derecha
   - Selecciona "Agregar a pantalla de inicio" o "Instalar aplicación"
   - Confirma el nombre y toca "Agregar"

3. **Usar la aplicación**
   - Encuentra el ícono de FlashFiber en tu pantalla de inicio
   - Toca el ícono para abrir la app en modo standalone
   - La app funcionará como una aplicación nativa

### Opción 2: Agregar Marcador

1. Abre la URL en Chrome/Edge
2. Toca el ícono de estrella (⭐) para agregar a marcadores
3. Accede rápidamente desde la página de inicio del navegador

---

## 📥 Instalación en iPad (Safari)

### Instalar en pantalla de inicio:

1. **Abrir en Safari**
   - Abre Safari en tu iPad
   - Navega a la URL de la aplicación

2. **Agregar a pantalla de inicio**
   - Toca el botón de compartir (□↑) en la barra superior
   - Desplázate y selecciona "Agregar a inicio"
   - Personaliza el nombre si deseas
   - Toca "Agregar"

3. **Usar la aplicación**
   - El ícono aparecerá en tu pantalla de inicio
   - Toca para abrir en modo de aplicación
   - Funcionará sin barras de navegador

---

## ⚙️ Configuración Inicial

### 1. Configurar Credenciales

Si es la primera vez que usas la aplicación:

1. Crea el archivo de configuración local:
   ```bash
   cp config.local.example.js config.local.js
   ```

2. Edita `config.local.js` con tus credenciales:
   - Token de Mapbox
   - Configuración de Firebase

3. Consulta el archivo `README_CREDENCIALES.md` para más detalles

### 2. Permitir Ubicación GPS (Opcional)

Para usar funciones de GPS:

1. **Android**: 
   - Configuración → Aplicaciones → FlashFiber → Permisos → Ubicación → "Permitir"

2. **iPad**:
   - Ajustes → Safari → Ubicación → "Preguntar" o "Permitir"

### 3. Activar Modo Sin Conexión

La aplicación funciona offline automáticamente:
- Los datos se cachean después de la primera visita
- Puedes consultar información sin conexión
- Los cambios se sincronizan cuando vuelves a tener conexión

---

## 🎨 Características Optimizadas para Tablets

### ✅ Interfaz Adaptativa
- Diseño específico para pantallas de 7" a 13"
- Modo portrait (vertical) y landscape (horizontal)
- Controles táctiles optimizados (48px de tamaño mínimo)

### ✅ Gestos Táctiles
- Zoom en mapas con pellizco
- Desplazamiento suave
- Botones grandes para mejor precisión

### ✅ Rendimiento
- Carga rápida de mapas
- Animaciones fluidas
- Cache inteligente para uso offline

### ✅ Funcionalidades
- **Visor GIS**: Visualización de red FTTH completa
- **Navegación GPS**: Rutas y ubicación en tiempo real
- **Eventos**: Registro de incidencias en campo
- **Cierres**: Gestión de cierres de red
- **Inventario**: Consulta de equipamiento

---

## 🔧 Solución de Problemas

### La aplicación no se instala

**Android:**
- Asegúrate de usar Chrome o Edge actualizado
- Verifica que la URL sea HTTPS
- Limpia caché del navegador: Configuración → Privacidad → Borrar datos

**iPad:**
- Usa Safari (navegador nativo)
- Actualiza iOS a la última versión
- Reinicia Safari si es necesario

### Los mapas no cargan

1. Verifica tu conexión a internet
2. Comprueba que las credenciales de Mapbox estén configuradas
3. Revisa la consola del navegador (F12 o Inspeccionar)

### GPS no funciona

1. Verifica que los permisos de ubicación estén activos
2. Asegúrate de estar al aire libre (mejor señal GPS)
3. Reinicia la aplicación

### La aplicación va lenta

1. Cierra otras aplicaciones en segundo plano
2. Limpia caché del navegador
3. Reinicia la tablet
4. Verifica que tengas al menos 1GB de RAM disponible

---

## 📱 Uso en Campo

### Mejores Prácticas:

1. **Conexión**
   - Carga la aplicación con WiFi antes de salir
   - El modo offline funcionará automáticamente
   - Sincroniza datos cuando vuelvas a tener conexión

2. **Batería**
   - Usa modo avión si no necesitas datos en tiempo real
   - Reduce brillo de pantalla
   - Cierra aplicaciones en segundo plano

3. **Protección**
   - Usa funda protectora para la tablet
   - Protector de pantalla resistente
   - Evita exposición directa al sol prolongada

4. **Datos**
   - Los cambios se guardan localmente primero
   - Se sincronizan automáticamente con conexión
   - No cierres la app mientras sincroniza

---

## 🚀 Atajos Rápidos

### Gestos en el Mapa:
- **Zoom**: Pellizcar con dos dedos
- **Rotar**: Girar con dos dedos
- **Inclinación**: Deslizar con dos dedos hacia arriba/abajo
- **Restablecer norte**: Doble toque con dos dedos

### Controles Rápidos:
- **Abrir menú**: Botón superior izquierdo
- **Capas**: Botón superior derecho
- **GPS**: Botón de ubicación
- **Buscar**: Icono de lupa

---

## 📊 Orientaciones Soportadas

### Modo Portrait (Vertical):
- Ideal para consultas rápidas
- Mejor para formularios
- Grid de 2 columnas en tarjetas

### Modo Landscape (Horizontal):
- Mejor para visualización de mapas
- Grid de 3 columnas
- Sidebar más amplio

La aplicación se adapta automáticamente según la orientación.

---

## 🔐 Seguridad

### Datos Locales:
- Las credenciales se almacenan solo en tu dispositivo
- No se comparten con terceros
- Protege tu tablet con contraseña/PIN

### Sincronización:
- Conexión segura HTTPS
- Autenticación con Firebase
- Datos encriptados en tránsito

---

## 📝 Soporte

### Problemas Técnicos:
- Revisa la documentación en `/docs`
- Consulta `SOLUCIONES.md` para errores comunes
- Contacta al administrador del sistema

### Actualizaciones:
- La app se actualiza automáticamente
- Verifica la versión en el menú "Acerca de"
- Cierra y vuelve a abrir si ves problemas

---

## ✅ Checklist de Instalación

- [ ] Tablet compatible (Android 8+ o iOS 13+)
- [ ] Navegador actualizado (Chrome/Safari)
- [ ] Aplicación instalada en pantalla de inicio
- [ ] Credenciales configuradas (config.local.js)
- [ ] Permisos de ubicación activados
- [ ] Conexión a internet verificada
- [ ] Mapas cargando correctamente
- [ ] Prueba de GPS exitosa
- [ ] Sincronización funcionando

---

## 🎓 Capacitación

### Videos Tutorial (Próximamente):
- Instalación paso a paso
- Navegación básica
- Uso de GPS y rutas
- Registro de eventos
- Gestión de cierres

### Documentos de Ayuda:
- `README.md` - Información general
- `README_CREDENCIALES.md` - Configuración de acceso
- `PLAN_RESPONSIVE.md` - Detalles técnicos del diseño

---

## 📞 Contacto

Para asistencia técnica:
- Email: soporte@flashfiber.com
- Teléfono: [Número de soporte]
- Horario: Lunes a Viernes, 8:00 - 18:00

---

## 🔄 Actualización

Última actualización: Febrero 2026
Versión de la aplicación: 3.0 (PWA optimizada para tablets)

---

**¡Listo para trabajar en campo! 🚀**

FlashFiber FTTH está optimizado para darte la mejor experiencia en tu tablet, permitiéndote ser más productivo en operaciones de campo.
