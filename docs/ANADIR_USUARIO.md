# Añadir usuario a Flash Fiber FTTH

Para que un usuario pueda iniciar sesión, debe existir en **Supabase Authentication** y tener una fila en la tabla **`usuarios`** con `activo: true`.

## Pasos en Supabase Dashboard (para cualquier usuario)

### 1. Crear el usuario en Authentication

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard) y abre tu proyecto (ej. **flashfiber-ftth**).
2. Ve a **Authentication** → **Users**.
3. Clic en **Add user** → **Create new user**.
4. **Email:** el correo del usuario (ver tabla abajo).
5. **Password:** la contraseña que quieras para este usuario (guárdala en un lugar seguro).
6. Guarda. **Copia el UUID** del usuario recién creado (aparece en la tabla de usuarios; columna "UID" o al abrir el usuario).

### 2. Crear el perfil en la tabla usuarios

1. En Supabase Dashboard ve a **Table Editor**.
2. Abre la tabla **`usuarios`**.
3. Clic en **Insert** → **Insert row** (o **Add row**).
   - **id** (uuid): pega el **UUID** que copiaste en el paso anterior (debe coincidir con el usuario de Authentication).
   - **activo** (boolean): **true**
   - **email** (text): el mismo email del usuario
   - **nombre** (text): nombre del usuario
4. Guarda.

Listo. Ese usuario ya puede iniciar sesión en la app.

---

## Usuarios a dar de alta

| Email | Contraseña (definir en Supabase) | Nombre sugerido |
|-------|----------------------------------|-----------------|
| jeancamilo753@gmail.com | (la que definas en Add user) | Jean Camilo |
| alex4590cordero@gmail.com | (la que definas en Add user) | Alex Cordero |

Para **alex4590cordero@gmail.com** repite los mismos pasos: Add user en Authentication con ese email y la contraseña que quieras, copia el UUID, y en Table Editor → tabla `usuarios` crea una fila con ese `id`, `activo: true`, `email: "alex4590cordero@gmail.com"`, `nombre: "Alex Cordero"`.

## Seguridad

- **No** guardes contraseñas en el código ni en archivos que se suban a git.
- La contraseña solo se define una vez en Supabase al crear el usuario.
