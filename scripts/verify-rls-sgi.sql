-- Verificación de RLS del Tablero SGI
-- Ejecutar en Supabase SQL Editor (solo lectura de metadatos)

-- 1) Tablas con RLS activo
select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in ('sgi_app_users', 'sgi_datasets', 'registered_users')
order by tablename;

-- 2) Políticas actuales
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in ('sgi_app_users', 'sgi_datasets', 'registered_users')
order by tablename, policyname;

-- 3) Funciones de autorización
select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'current_sgi_email',
    'is_active_sgi_user',
    'is_sgi_admin',
    'can_edit_sgi_datasets',
    'ensure_my_sgi_profile',
    'admin_sync_auth_users_to_sgi',
    'admin_provision_sgi_user_by_email'
  )
order by routine_name;

-- 4) Resumen de usuarios SGI
select email, role, is_active, auth_user_id is not null as linked_to_auth
from public.sgi_app_users
order by created_at desc;

-- 5) Datasets cargados
select dataset_key, updated_at, updated_by_email, jsonb_typeof(data) as data_type
from public.sgi_datasets
order by dataset_key;

-- Matriz esperada de permisos:
-- | Tabla           | Visualizador | Editor | Admin |
-- |-----------------|--------------|--------|-------|
-- | sgi_app_users   | SELECT propio, UPDATE propio (sin cambiar rol/estado) | idem + admin gestiona todos | SELECT/UPDATE/INSERT todos |
-- | sgi_datasets    | SELECT       | SELECT/INSERT/UPDATE/DELETE | idem |
-- | registered_users| bloqueado    | bloqueado | bloqueado |
