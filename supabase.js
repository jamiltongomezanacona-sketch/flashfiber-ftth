// CDN para que funcione en el navegador sin bundler (index.html carga este script directamente)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Variables: 1) supabase-env.js (generado en build Vercel), 2) Vite env, 3) __FTTH_SECRETS__, 4) placeholder
const supabaseUrl = (typeof window !== 'undefined' && window.__FTTH_SUPABASE_URL__) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof window !== 'undefined' && window.__FTTH_SECRETS__?.SUPABASE?.url) ||
  'https://TU_PROYECTO.supabase.co'

const supabaseKey = (typeof window !== 'undefined' && window.__FTTH_SUPABASE_ANON_KEY__) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof window !== 'undefined' && window.__FTTH_SECRETS__?.SUPABASE?.anonKey) ||
  'TU_CLAVE_PUBLICABLE'

export const supabase = createClient(supabaseUrl, supabaseKey)
