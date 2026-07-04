-- Sincronizar usuarios registrados en Authentication → sgi_app_users
-- Ejecutar en Supabase SQL Editor (una vez o cuando falten usuarios en gestión)

create or replace function public.admin_sync_auth_users_to_sgi()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  synced_count integer;
begin
  if not public.is_sgi_admin() then
    raise exception 'Acceso denegado';
  end if;

  with inserted as (
    insert into public.sgi_app_users (auth_user_id, email, full_name, role, is_active, last_login_at)
    select
      u.id,
      lower(trim(u.email)),
      coalesce(u.raw_user_meta_data->>'full_name', split_part(lower(trim(u.email)), '@', 1)),
      case when lower(trim(u.email)) = 'admin@emprestur.com' then 'admin' else 'viewer' end,
      true,
      now()
    from auth.users u
    where lower(trim(u.email)) like '%@emprestur.com'
      and not exists (
        select 1 from public.sgi_app_users s where lower(s.email) = lower(trim(u.email))
      )
    on conflict (email) do update
    set auth_user_id = coalesce(public.sgi_app_users.auth_user_id, excluded.auth_user_id)
    returning 1
  )
  select count(*) into synced_count from inserted;

  return coalesce(synced_count, 0);
end;
$$;

revoke all on function public.admin_sync_auth_users_to_sgi() from public;
grant execute on function public.admin_sync_auth_users_to_sgi() to authenticated;

-- Reparación inmediata (no requiere sesión admin; ejecutar como service role / SQL Editor)
insert into public.sgi_app_users (auth_user_id, email, full_name, role, is_active, last_login_at)
select
  u.id,
  lower(trim(u.email)),
  coalesce(u.raw_user_meta_data->>'full_name', split_part(lower(trim(u.email)), '@', 1)),
  case when lower(trim(u.email)) = 'admin@emprestur.com' then 'admin' else 'viewer' end,
  true,
  now()
from auth.users u
where lower(trim(u.email)) like '%@emprestur.com'
  and not exists (
    select 1 from public.sgi_app_users s where lower(s.email) = lower(trim(u.email))
  )
on conflict (email) do update
set
  auth_user_id = coalesce(public.sgi_app_users.auth_user_id, excluded.auth_user_id),
  is_active = true;

-- Verificar
select email, full_name, role, is_active, auth_user_id
from public.sgi_app_users
order by created_at desc;
