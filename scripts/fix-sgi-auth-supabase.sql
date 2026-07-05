-- Ejecutar UNA VEZ en Supabase SQL Editor para corregir login tras registro
-- (crea perfil al iniciar sesión, sincroniza Authentication → sgi_app_users y repara usuarios existentes)

drop function if exists public.ensure_my_sgi_profile(text);

create or replace function public.current_sgi_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(trim(coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    (select email from auth.users where id = auth.uid())
  , '')));
$$;

create or replace function public.is_sgi_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sgi_app_users u
    where lower(u.email) = public.current_sgi_email()
      and u.is_active = true
      and (u.role = 'admin' or lower(u.email) = 'admin@emprestur.com')
  );
$$;

create or replace function public.ensure_my_sgi_profile(
  p_full_name text default null,
  p_email text default null
)
returns public.sgi_app_users
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
  auth_email text;
  user_email text;
  assigned_role text;
  existing public.sgi_app_users%rowtype;
  result public.sgi_app_users%rowtype;
begin
  uid := auth.uid();
  if uid is null then
    return null;
  end if;

  select lower(trim(email)) into auth_email from auth.users where id = uid;

  if auth_email is null or auth_email = '' then
    return null;
  end if;

  user_email := auth_email;
  assigned_role := case when user_email = 'admin@emprestur.com' then 'admin' else 'viewer' end;

  select * into existing
  from public.sgi_app_users u
  where lower(u.email) = user_email;

  if found then
    if not existing.is_active then
      return null;
    end if;

    update public.sgi_app_users u
    set
      last_login_at = now(),
      auth_user_id = coalesce(u.auth_user_id, uid),
      role = case when user_email = 'admin@emprestur.com' then 'admin' else u.role end,
      full_name = coalesce(
        nullif(trim(u.full_name), ''),
        nullif(trim(p_full_name), ''),
        split_part(user_email, '@', 1)
      )
    where u.id = existing.id
    returning * into result;

    return result;
  end if;

  insert into public.sgi_app_users (auth_user_id, email, full_name, role, is_active, last_login_at)
  values (
    uid,
    user_email,
    coalesce(nullif(trim(p_full_name), ''), split_part(user_email, '@', 1)),
    assigned_role,
    true,
    now()
  )
  returning * into result;

  return result;
end;
$$;

revoke all on function public.ensure_my_sgi_profile(text, text) from public;
grant execute on function public.ensure_my_sgi_profile(text, text) to authenticated;

create or replace function public.admin_sync_auth_users_to_sgi()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  linked_count integer := 0;
  upserted_count integer := 0;
begin
  if not public.is_sgi_admin() then
    raise exception 'Acceso denegado';
  end if;

  update public.sgi_app_users s
  set auth_user_id = u.id
  from auth.users u
  where lower(trim(u.email)) = lower(s.email)
    and s.auth_user_id is null;

  get diagnostics linked_count = row_count;

  with upserted as (
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
    on conflict (email) do update
    set
      auth_user_id = coalesce(public.sgi_app_users.auth_user_id, excluded.auth_user_id),
      full_name = coalesce(
        nullif(trim(public.sgi_app_users.full_name), ''),
        excluded.full_name
      ),
      is_active = true
    returning 1
  )
  select count(*) into upserted_count from upserted;

  return coalesce(linked_count, 0) + coalesce(upserted_count, 0);
end;
$$;

revoke all on function public.admin_sync_auth_users_to_sgi() from public;
grant execute on function public.admin_sync_auth_users_to_sgi() to authenticated;

create or replace function public.admin_provision_sgi_user_by_email(
  p_email text,
  p_full_name text default null
)
returns public.sgi_app_users
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  user_email text;
  auth_uid uuid;
  display_name text;
  result public.sgi_app_users%rowtype;
begin
  if not public.is_sgi_admin() then
    raise exception 'Acceso denegado';
  end if;

  user_email := lower(trim(coalesce(p_email, '')));
  if user_email = '' or user_email !~ '@emprestur\.com$' then
    raise exception 'Solo se permiten correos @emprestur.com';
  end if;

  if user_email = 'admin@emprestur.com' then
    raise exception 'La cuenta de administrador principal ya existe';
  end if;

  select u.id
  into auth_uid
  from auth.users u
  where lower(trim(u.email)) = user_email
  limit 1;

  display_name := coalesce(
    nullif(trim(p_full_name), ''),
    split_part(user_email, '@', 1)
  );

  insert into public.sgi_app_users (auth_user_id, email, full_name, role, is_active, last_login_at)
  values (
    auth_uid,
    user_email,
    display_name,
    'viewer',
    true,
    now()
  )
  on conflict (email) do update
  set
    auth_user_id = coalesce(public.sgi_app_users.auth_user_id, excluded.auth_user_id),
    full_name = coalesce(nullif(trim(public.sgi_app_users.full_name), ''), excluded.full_name),
    is_active = true
  returning * into result;

  return result;
end;
$$;

revoke all on function public.admin_provision_sgi_user_by_email(text, text) from public;
grant execute on function public.admin_provision_sgi_user_by_email(text, text) to authenticated;

drop policy if exists "sgi_users_update_own" on public.sgi_app_users;
create policy "sgi_users_update_own"
  on public.sgi_app_users for update to authenticated
  using (lower(email) = public.current_sgi_email())
  with check (lower(email) = public.current_sgi_email());

create or replace function public.can_edit_sgi_datasets()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sgi_app_users u
    where lower(u.email) = public.current_sgi_email()
      and u.is_active = true
      and (
        u.role in ('admin', 'editor')
        or lower(u.email) = 'admin@emprestur.com'
      )
  );
$$;

-- Reparar usuarios que ya existen en Authentication pero no tienen fila en sgi_app_users
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
on conflict (email) do update
set
  auth_user_id = coalesce(public.sgi_app_users.auth_user_id, excluded.auth_user_id),
  is_active = true;
