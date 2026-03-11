# Colecciones Firestore | FlashFiber FTTH

Documentación de las colecciones de Firestore usadas por la app. **No es necesario crearlas manualmente**: Firestore crea cada colección al guardar el primer documento.

---

## Colecciones utilizadas

| Colección | Uso | Origen |
|-----------|-----|--------|
| `cierres` | Cierres FTTH (Montar Cierre) | GIS FTTH |
| `eventos` | Eventos operativos FTTH (Reportar Evento) | GIS FTTH |
| `eventos_corporativo` | Eventos corporativos (Reportar Evento Corp) | GIS Corporativo |
| `rutas` | Rutas montadas (Montar Ruta → Guardar en Firebase) | GIS FTTH y GIS Corporativo |

---

## Reglas de seguridad (Firestore)

En la consola de Firebase → Firestore Database → Reglas, incluir todas las colecciones que use la app. Ejemplo con **solo usuarios autenticados**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cierres/{id} {
      allow read, write: if request.auth != null;
    }
    match /eventos/{id} {
      allow read, write: if request.auth != null;
    }
    match /eventos_corporativo/{id} {
      allow read, write: if request.auth != null;
    }
    match /rutas/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Tras cambiar las reglas, publicar en la consola. Si falta la regla de `rutas`, el guardado desde **Montar Ruta → Guardar en Firebase** fallará con permiso denegado.

---

## Referencia en código

- Cierres: `assets/js/services/firebase.cierres.js`, `firebase.db.js`
- Eventos FTTH: `assets/js/services/firebase.eventos.js`, `firebase.db.js`
- Eventos Corporativo: `assets/js/services/firebase.eventosCorp.js`
- Rutas: `assets/js/services/firebase.rutas.js`

---

## Mantenerse en el plan gratuito (Firestore)

Para **no superar la cuota gratuita** de Firestore (50.000 lecturas/día):

1. **Límite por colección**  
   En los servicios (`firebase.cierres.js`, `firebase.eventos.js`, `firebase.eventosCorp.js`, `firebase.rutas.js`) está definido `FIRESTORE_READ_LIMIT = 250`. Así, cada vez que se carga el mapa se leen como máximo 250 documentos por colección (4 colecciones ≈ 1.000 lecturas por carga). Con la cuota gratuita de 50k lecturas/día caben unas **50 cargas completas al día** sin superar el plan gratuito.

2. **Si necesitas más uso sin pagar**  
   Puedes subir el límite (p. ej. 500) para permitir más documentos por colección; tendrás que vigilar no superar 50k lecturas/día. Si bajas el límite (p. ej. 100), las lecturas bajan más pero en el mapa solo se mostrarán los primeros N documentos de cada colección.

3. **Plan Blaze (facturación)**  
   Si el proyecto está en Blaze, en Google Cloud → Facturación → Alertas de presupuesto puedes crear una alerta en **0 USD** para que te avisen antes de que se genere ningún cargo.
