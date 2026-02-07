# Firebase: eventos corporativos (GIS Corporativo)

## Colección usada

La app guarda los eventos de **Reportar Evento Corp** en la colección:

- **`eventos_corporativo`**

No hace falta crearla a mano: Firestore crea la colección al guardar el **primer documento** desde la app.

---

## Reglas de Firestore (obligatorio)

Si los eventos no se guardan o no se ven, suele ser porque las **reglas de Firestore** solo permiten la colección `eventos` y no `eventos_corporativo`.

En la **Consola de Firebase** → tu proyecto → **Firestore Database** → pestaña **Reglas**, añade una regla para la nueva colección con el **mismo nivel de acceso** que uses para `eventos`.

### Ejemplo si hoy tienes algo así:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /eventos/{docId} {
      allow read, write: if request.auth != null;
    }
    // ... otras reglas
  }
}
```

### Añade esto (misma lógica que eventos):

```javascript
    match /eventos_corporativo/{docId} {
      allow read, write: if request.auth != null;
    }
```

Quedaría:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /eventos/{docId} {
      allow read, write: if request.auth != null;
    }
    match /eventos_corporativo/{docId} {
      allow read, write: if request.auth != null;
    }
    // ... resto de tus reglas
  }
}
```

Guarda las reglas y espera unos segundos. Luego prueba de nuevo en GIS Corporativo: guardar un evento y recargar la página; los pins deberían guardarse y mostrarse.

---

## Resumen

| Qué | Acción |
|-----|--------|
| ¿Crear la colección `eventos_corporativo` en Firebase? | **No.** Se crea sola al guardar el primer evento. |
| ¿Qué sí debes hacer? | **Añadir la regla** de `eventos_corporativo` en Firestore (lectura/escritura para usuarios autenticados, igual que `eventos`). |
