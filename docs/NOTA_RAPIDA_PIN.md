# Pin de Nota Rápida – Recomendaciones e implementación

## Recomendaciones antes de ejecutar

1. **Modelo en Supabase**  
   - Tabla `notas_rapidas`: `id`, `molecula`, `central` (opcional), `lng`, `lat`, `texto`, `created_at`, `created_by`.  
   - Políticas RLS para que solo usuarios autorizados lean/escriban.

2. **Herramienta en el menú**  
   - Botón "📌 Nota rápida" en Herramientas. Al activarlo, el siguiente click en el mapa abre formulario para escribir y guardar.

3. **Pin con flecha**  
   - Marcador con ícono de flecha/pin apuntando al punto (CSS/SVG o imagen).

4. **Visibilidad por molécula**  
   - Mostrar pins solo cuando hay una molécula seleccionada en Capas; filtrar por `molecula === selectedMoleculaForPins`.

5. **Servicio y capa**  
   - Servicio Supabase (CRUD + Realtime) y capa en el mapa con filtro por molécula.

6. **Interacción**  
   - Click en mapa (herramienta activa): popup para texto → guardar. Click en pin: popup con texto, Editar y Eliminar.

## Crear tabla en Supabase (SQL)

Ejecutar en el SQL Editor del proyecto:

```sql
create table if not exists public.notas_rapidas (
  id uuid primary key default gen_random_uuid(),
  molecula text not null,
  central text,
  lng double precision not null,
  lat double precision not null,
  texto text not null default '',
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_notas_rapidas_molecula on public.notas_rapidas(molecula);

alter table public.notas_rapidas enable row level security;

create policy "Usuarios autenticados pueden gestionar notas"
  on public.notas_rapidas for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Habilitar Realtime para la tabla (Dashboard → Database → Replication → public.notas_rapidas → ON)
```
