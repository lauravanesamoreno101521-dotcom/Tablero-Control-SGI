import { getSupabaseClient, isSupabaseConfigured } from './client.ts';

export type SgiAppRole = 'admin' | 'editor' | 'viewer';

export type SgiAppUser = {
  id: string;
  authUserId: string | null;
  email: string;
  fullName: string;
  role: SgiAppRole;
  isActive: boolean;
};

type AppUserRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  role: SgiAppRole;
  is_active: boolean;
};

const mapAppUser = (row: AppUserRow): SgiAppUser => ({
  id: row.id,
  authUserId: row.auth_user_id,
  email: row.email,
  fullName: row.full_name?.trim() || row.email,
  role: row.role,
  isActive: row.is_active
});

const unauthorizedMessage =
  'Usuario no autorizado. Solicite acceso al administrador del tablero SGI.';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getSgiRoleLabel = (role: SgiAppRole): string => {
  if (role === 'admin') return 'Administrador';
  return 'Visualizador';
};

export const canEditSgiDatasets = (role: SgiAppRole): boolean => role === 'admin';

async function ensureViewerProfile(
  authUserId: string,
  email: string,
  fullName?: string
): Promise<SgiAppUser | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const profile = await resolveAuthorizedAppUser(authUserId, email);
    if (profile) return profile;
    await wait(350);
  }

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const displayName = fullName?.trim() || email.split('@')[0] || email;
  const { error: insertError } = await supabase.from('sgi_app_users').insert({
    auth_user_id: authUserId,
    email,
    full_name: displayName,
    role: 'viewer',
    is_active: true,
    last_login_at: new Date().toISOString()
  });

  if (insertError) {
    console.error('No se pudo crear perfil visualizador:', insertError.message);
    return null;
  }

  return resolveAuthorizedAppUser(authUserId, email);
}

export async function signInSgiUser(
  email: string,
  password: string
): Promise<{ ok: true; user: SgiAppUser } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase no está configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'No se pudo conectar con Supabase.' };

  const normalizedEmail = email.trim().toLowerCase();
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (signInError || !signInData.session) {
    return { ok: false, error: 'Correo o contraseña incorrectos.' };
  }

  const profile = await resolveAuthorizedAppUser(signInData.session.user.id, normalizedEmail);
  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false, error: unauthorizedMessage };
  }

  return { ok: true, user: profile };
}

export async function registerSgiUser(
  email: string,
  password: string,
  fullName?: string
): Promise<{ ok: true; user: SgiAppUser } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase no está configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env' };
  }

  if (password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'No se pudo conectar con Supabase.' };

  const normalizedEmail = email.trim().toLowerCase();
  const displayName = fullName?.trim() || normalizedEmail.split('@')[0] || normalizedEmail;

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { full_name: displayName }
    }
  });

  if (error) {
    return { ok: false, error: error.message || 'No se pudo completar el registro.' };
  }

  if (!data.user) {
    return { ok: false, error: 'No se pudo crear la cuenta.' };
  }

  if (!data.session) {
    return {
      ok: false,
      error: 'Cuenta creada. Confirma tu correo en el enlace enviado y luego inicia sesión.'
    };
  }

  const profile = await ensureViewerProfile(data.user.id, normalizedEmail, displayName);
  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false, error: unauthorizedMessage };
  }

  return { ok: true, user: profile };
}

export async function signOutSgiUser(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentSgiAppUser(): Promise<SgiAppUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user.email) return null;

  return resolveAuthorizedAppUser(
    data.session.user.id,
    data.session.user.email.trim().toLowerCase()
  );
}

async function resolveAuthorizedAppUser(
  authUserId: string,
  email: string
): Promise<SgiAppUser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('sgi_app_users')
    .select('id, auth_user_id, email, full_name, role, is_active')
    .eq('email', email)
    .maybeSingle();

  if (error || !data || !data.is_active) return null;

  const now = new Date().toISOString();
  const patch: { last_login_at: string; auth_user_id?: string } = { last_login_at: now };
  if (!data.auth_user_id) {
    patch.auth_user_id = authUserId;
  }

  await supabase.from('sgi_app_users').update(patch).eq('id', data.id);

  return mapAppUser({
    ...data,
    auth_user_id: data.auth_user_id ?? authUserId
  } as AppUserRow);
}
