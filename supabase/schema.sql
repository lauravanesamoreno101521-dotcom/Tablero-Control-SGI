-- Ejecutar en Supabase: SQL Editor > New query
-- Seguro para ejecutar más de una vez (idempotente)
-- Autenticación: Supabase Auth + usuarios administrados en sgi_app_users

create table if not exists public.sgi_app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.sgi_datasets (
  dataset_key text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by_email text
);

-- Compatibilidad con esquema anterior (ya no usado por la app)
create table if not exists public.registered_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  registered_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

alter table public.sgi_app_users enable row level security;
alter table public.sgi_datasets enable row level security;
alter table public.registered_users enable row level security;

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

create or replace function public.is_active_sgi_user()
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
  );
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

create or replace function public.handle_new_sgi_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sgi_app_users (auth_user_id, email, full_name, role, is_active)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(lower(new.email), '@', 1)),
    case when lower(new.email) = 'admin@emprestur.com' then 'admin' else 'viewer' end,
    true
  )
  on conflict (email) do update
  set auth_user_id = excluded.auth_user_id,
      full_name = coalesce(public.sgi_app_users.full_name, excluded.full_name),
      role = case
        when lower(excluded.email) = 'admin@emprestur.com' then 'admin'
        else public.sgi_app_users.role
      end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_sgi_user();

-- Perfil SGI al iniciar sesión (evita bloqueo si el trigger no corrió o RLS impidió el insert desde el cliente)
drop function if exists public.ensure_my_sgi_profile(text);

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
  user_email := lower(trim(coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    auth_email,
    nullif(trim(p_email), '')
  , '')));

  if user_email = '' or auth_email is null or user_email <> auth_email then
    return null;
  end if;

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

-- Sincroniza cuentas de Authentication que aún no tienen fila en sgi_app_users (solo admin)
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

-- sgi_app_users policies
drop policy if exists "sgi_users_select_own" on public.sgi_app_users;
drop policy if exists "sgi_users_select_admin" on public.sgi_app_users;
drop policy if exists "sgi_users_update_admin" on public.sgi_app_users;
drop policy if exists "sgi_users_insert_admin" on public.sgi_app_users;
drop policy if exists "sgi_users_insert_self_viewer" on public.sgi_app_users;
drop policy if exists "sgi_users_update_own" on public.sgi_app_users;

create policy "sgi_users_select_own"
  on public.sgi_app_users for select to authenticated
  using (lower(email) = public.current_sgi_email());

create policy "sgi_users_select_admin"
  on public.sgi_app_users for select to authenticated
  using (public.is_sgi_admin());

create policy "sgi_users_update_admin"
  on public.sgi_app_users for update to authenticated
  using (public.is_sgi_admin())
  with check (public.is_sgi_admin());

create policy "sgi_users_insert_admin"
  on public.sgi_app_users for insert to authenticated
  with check (public.is_sgi_admin());

create policy "sgi_users_insert_self_viewer"
  on public.sgi_app_users for insert to authenticated
  with check (
    lower(email) = public.current_sgi_email()
    and role = 'viewer'
  );

create policy "sgi_users_update_own"
  on public.sgi_app_users for update to authenticated
  using (lower(email) = public.current_sgi_email())
  with check (lower(email) = public.current_sgi_email());

-- sgi_datasets policies
drop policy if exists "anon_select_sgi_datasets" on public.sgi_datasets;
drop policy if exists "anon_insert_sgi_datasets" on public.sgi_datasets;
drop policy if exists "anon_update_sgi_datasets" on public.sgi_datasets;
drop policy if exists "sgi_datasets_select_active" on public.sgi_datasets;
drop policy if exists "sgi_datasets_write_editors" on public.sgi_datasets;

create policy "sgi_datasets_select_active"
  on public.sgi_datasets for select to authenticated
  using (public.is_active_sgi_user());

create policy "sgi_datasets_write_editors"
  on public.sgi_datasets for all to authenticated
  using (public.can_edit_sgi_datasets())
  with check (public.can_edit_sgi_datasets());

-- Legacy table: bloquear acceso anon
drop policy if exists "anon_select_registered_users" on public.registered_users;
drop policy if exists "anon_insert_registered_users" on public.registered_users;
drop policy if exists "anon_update_registered_users" on public.registered_users;

-- Migración opcional: correos legacy -> sgi_app_users (rol editor)
insert into public.sgi_app_users (email, full_name, role, is_active)
select
  lower(email),
  split_part(lower(email), '@', 1),
  'viewer',
  true
from public.registered_users
on conflict (email) do nothing;
