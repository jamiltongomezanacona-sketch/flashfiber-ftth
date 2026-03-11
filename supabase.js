// CDN para que funcione en el navegador sin bundler (index.html carga este script directamente)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Variables de entorno (Vite: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
// o valores por defecto para desarrollo local
const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
  ? import.meta.env.VITE_SUPABASE_URL
  : (typeof window !== 'undefined' && window.__FTTH_SECRETS__?.SUPABASE?.url) || 'https://TU_PROYECTO.supabase.co'

const supabaseKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : (typeof window !== 'undefined' && window.__FTTH_SECRETS__?.SUPABASE?.anonKey) || 'TU_CLAVE_PUBLICABLE'

export const supabase = createClient(supabaseUrl, supabaseKey)
