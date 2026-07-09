import { getSupabaseClient, getSupabaseSetupMessage, isSupabaseConfigured } from './client.ts';
import { SGI_BOOTSTRAP_ADMIN_EMAIL, type SgiAppRole, type SgiAppUser } from './auth.ts';

export type SgiAssignableRole = 'viewer' | 'editor';

export type SgiAppUserAdminRow = SgiAppUser & {
  createdAt: string;
  lastLoginAt: string | null;
};

type AppUserRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  role: SgiAppRole;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

const mapAdminRow = (row: AppUserRow): SgiAppUserAdminRow => ({
  id: row.id,
  authUserId: row.auth_user_id,
  email: row.email,
  fullName: row.full_name?.trim() || row.email,
  role: row.role,
  isActive: row.is_active,
  createdAt: row.created_at,
  lastLoginAt: row.last_login_at
});

async function getAuthenticatedSupabaseClient() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      supabase: null as null,
      error: getSupabaseSetupMessage()
    };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { supabase: null as null, error: error.message || 'No se pudo validar la sesión.' };
  }

  if (!data.session) {
    return {
      supabase: null as null,
      error: 'No hay sesión activa. Cierra sesión e ingresa nuevamente con correo y contraseña.'
    };
  }

  return { supabase, error: null as null };
}

async function syncAuthUsersForAdmin(supabase: NonNullable<ReturnType<typeof getSupabaseClient>>): Promise<{
  syncedCount: number;
  syncWarning: string | null;
}> {
  const { data: syncData, error: syncError } = await supabase.rpc('admin_sync_auth_users_to_sgi');

  if (syncError) {
    const missingFunction =
      syncError.message.includes('admin_sync_auth_users_to_sgi') ||
      syncError.message.includes('Could not find the function');
    return {
      syncedCount: 0,
      syncWarning: missingFunction
        ? 'La sincronización automática aún no está instalada en Supabase. Ejecuta scripts/sync-auth-users-to-sgi.sql en el SQL Editor, o activa el acceso manualmente con el formulario inferior.'
        : syncError.message
    };
  }

  return {
    syncedCount: typeof syncData === 'number' ? syncData : 0,
    syncWarning: null
  };
}

export async function listSgiAppUsersForAdmin(): Promise<
  | { ok: true; users: SgiAppUserAdminRow[]; syncedCount: number; syncWarning: string | null }
  | { ok: false; error: string }
> {
  const { supabase, error: clientError } = await getAuthenticatedSupabaseClient();
  if (!supabase || clientError) {
    return { ok: false, error: clientError || getSupabaseSetupMessage() };
  }

  const { syncedCount, syncWarning } = await syncAuthUsersForAdmin(supabase);

  const { data, error } = await supabase
    .from('sgi_app_users')
    .select('id, auth_user_id, email, full_name, role, is_active, created_at, last_login_at')
    .order('created_at', { ascending: false });

  if (error) {
    return {
      ok: false,
      error:
        error.message ||
        'No se pudo cargar la lista de usuarios. Verifica que tu cuenta tenga rol administrador en Supabase.'
    };
  }

  return {
    ok: true,
    users: (data as AppUserRow[]).map(mapAdminRow),
    syncedCount,
    syncWarning
  };
}

export async function provisionSgiUserByEmailForAdmin(
  email: string,
  fullName?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@emprestur\.com$/i.test(normalizedEmail)) {
    return { ok: false, error: 'Solo se permiten correos @emprestur.com.' };
  }

  if (normalizedEmail === SGI_BOOTSTRAP_ADMIN_EMAIL) {
    return { ok: false, error: 'La cuenta de administrador principal ya existe.' };
  }

  const { supabase, error: clientError } = await getAuthenticatedSupabaseClient();
  if (!supabase || clientError) {
    return { ok: false, error: clientError || getSupabaseSetupMessage() };
  }

  const displayName = fullName?.trim() || normalizedEmail.split('@')[0] || normalizedEmail;

  const { error: rpcError } = await supabase.rpc('admin_provision_sgi_user_by_email', {
    p_email: normalizedEmail,
    p_full_name: displayName
  });

  if (!rpcError) {
    return { ok: true };
  }

  const missingProvisionRpc =
    rpcError.message.includes('admin_provision_sgi_user_by_email') ||
    rpcError.message.includes('Could not find the function');

  if (!missingProvisionRpc) {
    return {
      ok: false,
      error: rpcError.message || 'No se pudo activar el acceso para ese correo.'
    };
  }

  const { error } = await supabase.from('sgi_app_users').upsert(
    {
      email: normalizedEmail,
      full_name: displayName,
      role: 'viewer' as SgiAppRole,
      is_active: true
    },
    { onConflict: 'email' }
  );

  if (error) {
    return {
      ok: false,
      error: error.message || 'No se pudo activar el acceso para ese correo.'
    };
  }

  return { ok: true };
}

export async function updateSgiAppUserRoleForAdmin(
  userId: string,
  role: SgiAssignableRole
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, error: clientError } = await getAuthenticatedSupabaseClient();
  if (!supabase || clientError) {
    return { ok: false, error: clientError || getSupabaseSetupMessage() };
  }

  const { error } = await supabase.from('sgi_app_users').update({ role }).eq('id', userId);

  if (error) {
    return { ok: false, error: error.message || 'No se pudo actualizar el rol.' };
  }

  return { ok: true };
}

export async function updateSgiAppUserActiveForAdmin(
  userId: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, error: clientError } = await getAuthenticatedSupabaseClient();
  if (!supabase || clientError) {
    return { ok: false, error: clientError || getSupabaseSetupMessage() };
  }

  const { error } = await supabase.from('sgi_app_users').update({ is_active: isActive }).eq('id', userId);

  if (error) {
    return { ok: false, error: error.message || 'No se pudo actualizar el estado del usuario.' };
  }

  return { ok: true };
}

export async function deleteSgiAppUserForAdmin(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, error: clientError } = await getAuthenticatedSupabaseClient();
  if (!supabase || clientError) {
    return { ok: false, error: clientError || getSupabaseSetupMessage() };
  }

  const { error } = await supabase.rpc('admin_delete_sgi_user', { p_user_id: userId });

  if (error) {
    const missingFunction =
      error.message.includes('admin_delete_sgi_user') ||
      error.message.includes('Could not find the function');

    return {
      ok: false,
      error: missingFunction
        ? 'La eliminación de usuarios aún no está instalada en Supabase. Ejecuta scripts/admin-delete-sgi-user.sql en el SQL Editor.'
        : error.message || 'No se pudo eliminar el usuario.'
    };
  }

  return { ok: true };
}

export { isSupabaseConfigured };
