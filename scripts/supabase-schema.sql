-- =============================================================================
-- FlashFiber FTTH | Esquema Supabase (PostgreSQL)
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Ajusta RLS según tu política (aquí: solo usuarios autenticados)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Usuarios (perfil; id = auth.users.id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. Cierres
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cierres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  tipo TEXT,
  central TEXT,
  molecula TEXT,
  notas TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  server_time TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3. Eventos FTTH
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT,
  accion TEXT,
  estado TEXT,
  tecnico TEXT,
  notas TEXT,
  central TEXT,
  molecula TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  server_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. Eventos corporativo (incluye cable)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eventos_corporativo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT,
  accion TEXT,
  estado TEXT,
  tecnico TEXT,
  notas TEXT,
  central TEXT,
  molecula TEXT,
  cable TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  server_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. Rutas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT,
  tipo TEXT,
  central TEXT,
  molecula TEXT,
  notas TEXT,
  distancia DOUBLE PRECISION DEFAULT 0,
  geojson TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Realtime: habilitar tablas en la publicación
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.cierres;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos_corporativo;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rutas;

-- Si alguna ya estaba añadida, ignorar el error "already member of publication".

-- =============================================================================
-- Row Level Security (RLS)
-- Ejemplo: solo usuarios autenticados pueden leer/escribir
-- =============================================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_corporativo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;

-- Usuarios: cada usuario puede leer su propio perfil; solo servicio puede escribir
CREATE POLICY "usuarios_select_own" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "usuarios_all_authenticated" ON public.usuarios
  FOR ALL USING (auth.role() = 'authenticated');

-- Cierres, eventos, rutas: cualquier autenticado puede leer y escribir
CREATE POLICY "cierres_authenticated" ON public.cierres
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "eventos_authenticated" ON public.eventos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "eventos_corporativo_authenticated" ON public.eventos_corporativo
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "rutas_authenticated" ON public.rutas
  FOR ALL USING (auth.role() = 'authenticated');

-- =============================================================================
-- Permisos para Realtime (necesario para que payload.new/old lleguen)
-- =============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- =============================================================================
-- Índices opcionales (mejoran consultas por central, molécula, fecha)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_cierres_central ON public.cierres(central);
CREATE INDEX IF NOT EXISTS idx_cierres_molecula ON public.cierres(molecula);
CREATE INDEX IF NOT EXISTS idx_cierres_created_at ON public.cierres(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_central ON public.eventos(central);
CREATE INDEX IF NOT EXISTS idx_eventos_estado ON public.eventos(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_created_at ON public.eventos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_corp_cable ON public.eventos_corporativo(cable);
CREATE INDEX IF NOT EXISTS idx_eventos_corp_created_at ON public.eventos_corporativo(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rutas_updated_at ON public.rutas(updated_at DESC);
