-- Plantilla: crear usuario administrado del tablero SGI
-- 1) Crear usuario en Supabase Dashboard → Authentication → Users
-- 2) Reemplazar AUTH_USER_UUID, email, nombre y rol
-- 3) Ejecutar en SQL Editor

insert into public.sgi_app_users (auth_user_id, email, full_name, role, is_active)
values (
  'AUTH_USER_UUID',
  'nombre@emprestur.com',
  'Nombre completo',
  'editor',
  true
)
on conflict (email) do update
set auth_user_id = excluded.auth_user_id,
    full_name = excluded.full_name,
    role = excluded.role,
    is_active = excluded.is_active,
    last_login_at = null;
