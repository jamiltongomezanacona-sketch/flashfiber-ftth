# Ejemplo Concreto: Aplicar Error Handler en tool.eventos.js

Este documento muestra cómo aplicar el Error Handler en un archivo existente.

## 📝 Antes (Código Actual)

```javascript
// tool.eventos.js - Líneas 477-485
for (const file of fotosAntes) {
  const url = await window.FTTH_STORAGE.subirFotoEvento(eventoId, "antes", file);
  if (url) fotosAntesURLs.push(url);
}

for (const file of fotosDespues) {
  const url = await window.FTTH_STORAGE.subirFotoEvento(eventoId, "despues", file);
  if (url) fotosDespuesURLs.push(url);
}
```

**Problemas:**
- ❌ Si una foto falla, se detiene todo
- ❌ No hay manejo de errores
- ❌ No hay feedback al usuario
- ❌ Errores silenciosos

## ✅ Después (Con Error Handler)

### Opción 1: Con Promise.allSettled (Recomendado)

```javascript
// Al inicio del archivo, agregar import
// (Si usas módulos ES6)
// import ErrorHandler from "../utils/errorHandler.js";
// import { validators } from "../utils/validators.js";

// O si no usas módulos, agregar script tag en HTML:
// <script src="../assets/js/utils/errorHandler.js"></script>
// <script src="../assets/js/utils/validators.js"></script>

// Líneas 477-485 - REEMPLAZAR CON:

// ✅ Subir fotos "antes" con manejo de errores individual
const uploadAntesResults = await Promise.allSettled(
  fotosAntes.map((file, index) => 
    ErrorHandler.safeAsync(
      async () => {
        // Validar archivo antes de subir
        const validation = validators.archivo(file, 5 * 1024 * 1024);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        
        const url = await window.FTTH_STORAGE.subirFotoEvento(
          eventoId, 
          "antes", 
          file
        );
        
        if (!url) {
          throw new Error("No se pudo obtener URL de la foto");
        }
        
        return url;
      },
      `subirFotoAntes_${index}`,
      null
    )
  )
);

// Procesar resultados
uploadAntesResults.forEach((result, index) => {
  if (result.status === "fulfilled" && result.value) {
    fotosAntesURLs.push(result.value);
    console.log(`✅ Foto antes #${index + 1} subida correctamente`);
  } else {
    const errorMsg = result.reason?.message || "Error desconocido";
    console.warn(`⚠️ Error subiendo foto antes #${index + 1}:`, errorMsg);
    // Opcional: mostrar notificación al usuario
    // mostrarNotificacion(`Error en foto antes #${index + 1}: ${errorMsg}`, "warning");
  }
});

// ✅ Subir fotos "después" con manejo de errores individual
const uploadDespuesResults = await Promise.allSettled(
  fotosDespues.map((file, index) => 
    ErrorHandler.safeAsync(
      async () => {
        const validation = validators.archivo(file, 5 * 1024 * 1024);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        
        const url = await window.FTTH_STORAGE.subirFotoEvento(
          eventoId, 
          "despues", 
          file
        );
        
        if (!url) {
          throw new Error("No se pudo obtener URL de la foto");
        }
        
        return url;
      },
      `subirFotoDespues_${index}`,
      null
    )
  )
);

// Procesar resultados
uploadDespuesResults.forEach((result, index) => {
  if (result.status === "fulfilled" && result.value) {
    fotosDespuesURLs.push(result.value);
    console.log(`✅ Foto después #${index + 1} subida correctamente`);
  } else {
    const errorMsg = result.reason?.message || "Error desconocido";
    console.warn(`⚠️ Error subiendo foto después #${index + 1}:`, errorMsg);
  }
});

// ✅ Mostrar resumen al usuario
const totalFotos = fotosAntes.length + fotosDespues.length;
const fotosExitosas = fotosAntesURLs.length + fotosDespuesURLs.length;
const fotosFallidas = totalFotos - fotosExitosas;

if (fotosFallidas > 0) {
  console.warn(`⚠️ ${fotosFallidas} de ${totalFotos} fotos no se pudieron subir`);
  // Opcional: alert o notificación
  // alert(`Advertencia: ${fotosFallidas} fotos no se pudieron subir. El evento se guardó correctamente.`);
}
```

### Opción 2: Con try-catch individual (Más simple)

```javascript
// Líneas 477-485 - REEMPLAZAR CON:

// ✅ Subir fotos "antes"
for (let i = 0; i < fotosAntes.length; i++) {
  const file = fotosAntes[i];
  
  try {
    // Validar archivo
    const validation = validators.archivo(file, 5 * 1024 * 1024);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const url = await window.FTTH_STORAGE.subirFotoEvento(
      eventoId, 
      "antes", 
      file
    );
    
    if (url) {
      fotosAntesURLs.push(url);
      console.log(`✅ Foto antes #${i + 1} subida`);
    } else {
      throw new Error("No se obtuvo URL");
    }
  } catch (error) {
    ErrorHandler.handle(error, `subirFotoAntes_${i + 1}`, { 
      fileName: file.name,
      fileSize: file.size 
    });
    console.warn(`⚠️ Error en foto antes #${i + 1}:`, error.message);
    // Continuar con las siguientes fotos
  }
}

// ✅ Subir fotos "después"
for (let i = 0; i < fotosDespues.length; i++) {
  const file = fotosDespues[i];
  
  try {
    const validation = validators.archivo(file, 5 * 1024 * 1024);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const url = await window.FTTH_STORAGE.subirFotoEvento(
      eventoId, 
      "despues", 
      file
    );
    
    if (url) {
      fotosDespuesURLs.push(url);
      console.log(`✅ Foto después #${i + 1} subida`);
    } else {
      throw new Error("No se obtuvo URL");
    }
  } catch (error) {
    ErrorHandler.handle(error, `subirFotoDespues_${i + 1}`, { 
      fileName: file.name,
      fileSize: file.size 
    });
    console.warn(`⚠️ Error en foto después #${i + 1}:`, error.message);
  }
}
```

## 🔧 Mejora Adicional: Validar antes de guardar

```javascript
// En la función validar() - línea ~414
function validar(evt) {
  // Validaciones existentes
  if (!evt.tipo) return "⚠️ Selecciona el Tipo";
  if (!evt.accion) return "⚠️ Selecciona la Acción";
  if (!evt.estado) return "⚠️ Selecciona el Estado";
  if (!evt.tecnico) return "⚠️ Escribe el nombre del técnico";
  
  // ✅ Nueva: Validar coordenadas
  const coordCheck = validators.coordenadas(
    selectedLngLat?.lng, 
    selectedLngLat?.lat
  );
  if (!coordCheck.valid) {
    return `⚠️ ${coordCheck.error}`;
  }
  
  // ✅ Nueva: Validar texto de técnico
  const tecnicoCheck = validators.texto(evt.tecnico, 2, 100);
  if (!tecnicoCheck.valid) {
    return `⚠️ ${tecnicoCheck.error}`;
  }
  
  // ✅ Nueva: Validar notas (opcional pero si existe, validar)
  if (evt.notas) {
    const notasCheck = validators.texto(evt.notas, 0, 1000);
    if (!notasCheck.valid) {
      return `⚠️ ${notasCheck.error}`;
    }
  }
  
  return "";
}
```

## 📊 Comparación

| Aspecto | Antes | Después |
|---------|-------|---------|
| Manejo de errores | ❌ Ninguno | ✅ Completo |
| Validación | ❌ Básica | ✅ Robusta |
| Feedback | ❌ Silencioso | ✅ Informativo |
| Resiliencia | ❌ Falla todo | ✅ Continúa con errores |
| Logging | ❌ Básico | ✅ Detallado |

## 🎯 Beneficios

1. **Resiliencia:** Si una foto falla, las demás se suben
2. **Debugging:** Errores detallados en consola
3. **UX:** Usuario sabe qué falló
4. **Validación:** Previene errores antes de subir
5. **Mantenibilidad:** Código más claro y organizado

## ✅ Checklist de Implementación

- [ ] Agregar imports/scripts de ErrorHandler y validators
- [ ] Reemplazar código de subida de fotos
- [ ] Agregar validaciones en función validar()
- [ ] Probar con fotos válidas
- [ ] Probar con foto muy grande (>5MB)
- [ ] Probar con foto inválida (no imagen)
- [ ] Probar sin conexión a internet
- [ ] Verificar logs en consola
- [ ] Verificar que el evento se guarda aunque fallen fotos

## 🚀 Siguiente Paso

Una vez implementado esto, aplicar el mismo patrón en:
- `tool.cierres.js` (si sube archivos)
- `firebase.storage.js` (función subirFotoEvento)
- Cualquier otra función async crítica
