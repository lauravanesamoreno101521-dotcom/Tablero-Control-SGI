-- Gestión de usuarios del tablero SGI en Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- ---------------------------------------------------------------------------
-- 1) PRIMER ADMINISTRADOR (después de que el usuario se registre en la app)
-- ---------------------------------------------------------------------------
-- update public.sgi_app_users
-- set role = 'admin', is_active = true
-- where email = 'admin@emprestur.com';

-- ---------------------------------------------------------------------------
-- 2) ALTA MANUAL (si el usuario existe en Authentication pero no entra)
-- ---------------------------------------------------------------------------
-- insert into public.sgi_app_users (auth_user_id, email, full_name, role, is_active)
-- values (
--   'AUTH_USER_UUID',          -- Authentication → Users → copiar UUID
--   'nombre@emprestur.com',
--   'Nombre completo',
--   'viewer',                  -- viewer = Visualizador | admin = Administrador
--   true
-- )
-- on conflict (email) do update
-- set auth_user_id = excluded.auth_user_id,
--     full_name = excluded.full_name,
--     role = excluded.role,
--     is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- 3) ADMINISTRADOR: activar, desactivar o cambiar rol
-- ---------------------------------------------------------------------------
-- Activar usuario:
-- update public.sgi_app_users set is_active = true where email = 'usuario@emprestur.com';

-- Desactivar acceso:
-- update public.sgi_app_users set is_active = false where email = 'usuario@emprestur.com';

-- Hacer administrador (edita bases de datos):
-- update public.sgi_app_users set role = 'admin' where email = 'usuario@emprestur.com';

-- Volver a visualizador (solo lectura):
-- update public.sgi_app_users set role = 'viewer' where email = 'usuario@emprestur.com';

-- ---------------------------------------------------------------------------
-- 4) VER USUARIOS REGISTRADOS
-- ---------------------------------------------------------------------------
-- select email, full_name, role, is_active, last_login_at
-- from public.sgi_app_users
-- order by created_at desc;
