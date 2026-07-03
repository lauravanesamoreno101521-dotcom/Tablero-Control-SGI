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

const inactiveMessage =
  'Su cuenta está desactivada. Solicite acceso al administrador del tablero SGI.';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getSgiRoleLabel = (role: SgiAppRole): string => {
  if (role === 'admin') return 'Administrador';
  return 'Visualizador';
};

export const canEditSgiDatasets = (role: SgiAppRole): boolean => role === 'admin';

async function fetchProfileViaRpc(fullName?: string): Promise<SgiAppUser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('ensure_my_sgi_profile', {
    p_full_name: fullName?.trim() || null
  });

  if (error) {
    if (!error.message.includes('ensure_my_sgi_profile')) {
      console.error('ensure_my_sgi_profile:', error.message);
    }
    return null;
  }

  if (!data || !data.is_active) return null;
  return mapAppUser(data as AppUserRow);
}

async function fetchProfileViaTable(
  authUserId: string,
  email: string,
  fullName?: string
): Promise<SgiAppUser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('sgi_app_users')
    .select('id, auth_user_id, email, full_name, role, is_active')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Consulta sgi_app_users:', error.message);
    return null;
  }

  if (!data) {
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

    return fetchProfileViaTable(authUserId, email);
  }

  if (!data.is_active) return null;

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

async function resolveAuthorizedAppUser(
  authUserId: string,
  email: string,
  fullName?: string
): Promise<{ user: SgiAppUser | null; inactive: boolean }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rpcProfile = await fetchProfileViaRpc(fullName);
    if (rpcProfile) return { user: rpcProfile, inactive: false };

    const tableProfile = await fetchProfileViaTable(authUserId, email, fullName);
    if (tableProfile) return { user: tableProfile, inactive: false };

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from('sgi_app_users')
        .select('is_active')
        .eq('email', email)
        .maybeSingle();
      if (data && !data.is_active) {
        return { user: null, inactive: true };
      }
    }

    if (attempt < 2) await wait(400);
  }

  return { user: null, inactive: false };
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

  const { user: profile, inactive } = await resolveAuthorizedAppUser(
    signInData.session.user.id,
    normalizedEmail
  );

  if (inactive) {
    await supabase.auth.signOut();
    return { ok: false, error: inactiveMessage };
  }

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

  const { user: profile, inactive } = await resolveAuthorizedAppUser(
    data.user.id,
    normalizedEmail,
    displayName
  );

  if (inactive) {
    await supabase.auth.signOut();
    return { ok: false, error: inactiveMessage };
  }

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

  const email = data.session.user.email.trim().toLowerCase();
  const { user: profile } = await resolveAuthorizedAppUser(data.session.user.id, email);
  return profile;
}
