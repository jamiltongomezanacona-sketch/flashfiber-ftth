# Añadir usuario a Flash Fiber FTTH

Para que un usuario pueda iniciar sesión, debe existir en **Firebase Authentication** y tener un perfil en **Firestore** con `activo: true`.

## Pasos en Firebase Console (para cualquier usuario)

### 1. Crear el usuario en Authentication

1. Entra a [Firebase Console](https://console.firebase.google.com/) y abre el proyecto **flashfiber-ftth**.
2. Ve a **Authentication** → **Users**.
3. Clic en **Add user** (o **Add new user**).
4. **Email:** el correo del usuario (ver tabla abajo).
5. **Password:** la contraseña que quieras para este usuario (guárdala en un lugar seguro).
6. Guarda. **Copia el UID** del usuario recién creado (aparece en la tabla de usuarios).

### 2. Crear el perfil en Firestore

1. En Firebase Console ve a **Firestore Database**.
2. Abre la colección **`usuarios`**.
3. Clic en **Add document**.
   - **Document ID:** pega el **UID** que copiaste en el paso anterior.
   - Campos del documento:
     - `activo` (boolean): **true**
     - `email` (string): el mismo email del usuario
     - `nombre` (string): nombre del usuario
4. Guarda.

Listo. Ese usuario ya puede iniciar sesión en la app.

---

## Usuarios a dar de alta

| Email | Contraseña (definir en Firebase) | Nombre sugerido |
|-------|----------------------------------|-----------------|
| jeancamilo753@gmail.com | (la que definas en Add user) | Jean Camilo |
| alex4590cordero@gmail.com | (la que definas en Add user) | Alex Cordero |

Para **alex4590cordero@gmail.com** repite los mismos pasos: Add user en Authentication con ese email y la contraseña que quieras, copia el UID, y en Firestore crea un documento en `usuarios` con ese UID y campos: `activo: true`, `email: "alex4590cordero@gmail.com"`, `nombre: "Alex Cordero"`.

## Seguridad

- **No** guardes contraseñas en el código ni en archivos que se suban a git.
- La contraseña solo se define una vez en Firebase Console al crear el usuario.
