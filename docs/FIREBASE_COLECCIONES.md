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
