import { getSupabaseClient, isSupabaseConfigured } from './client.ts';
import type { SgiAppRole, SgiAppUser } from './auth.ts';

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

export async function listSgiAppUsersForAdmin(): Promise<
  { ok: true; users: SgiAppUserAdminRow[] } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase no está configurado.' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'No se pudo conectar con Supabase.' };

  const { data, error } = await supabase
    .from('sgi_app_users')
    .select('id, auth_user_id, email, full_name, role, is_active, created_at, last_login_at')
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, error: error.message || 'No se pudo cargar la lista de usuarios.' };
  }

  return { ok: true, users: (data as AppUserRow[]).map(mapAdminRow) };
}

export async function updateSgiAppUserRoleForAdmin(
  userId: string,
  role: SgiAssignableRole
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'No se pudo conectar con Supabase.' };

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
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'No se pudo conectar con Supabase.' };

  const { error } = await supabase.from('sgi_app_users').update({ is_active: isActive }).eq('id', userId);

  if (error) {
    return { ok: false, error: error.message || 'No se pudo actualizar el estado del usuario.' };
  }

  return { ok: true };
}
