import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const readEnv = (key: string): string | undefined => {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/YOUR_PROJECT|YOUR_SUPABASE|TU_PROYECTO|TU_ANON/i.test(trimmed)) return undefined;
  return trimmed;
};

const supabaseUrl = readEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = (): boolean =>
  Boolean(supabaseUrl && supabaseAnonKey);

export const getSupabaseSetupMessage = (): string =>
  'Supabase no está configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel (Settings → Environment Variables) o en el archivo .env local, y vuelve a desplegar la aplicación.';

let client: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return client;
};

/** @deprecated Usar sesión de Supabase Auth. Se mantiene solo para limpieza legacy. */
export const SGI_SESSION_EMAIL_KEY = 'sgi_registered_email';
