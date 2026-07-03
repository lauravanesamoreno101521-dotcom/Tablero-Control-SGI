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
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
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
      and u.role = 'admin'
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
      and u.role = 'admin'
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
    'viewer',
    true
  )
  on conflict (email) do update
  set auth_user_id = excluded.auth_user_id,
      full_name = coalesce(public.sgi_app_users.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_sgi_user();

-- sgi_app_users policies
drop policy if exists "sgi_users_select_own" on public.sgi_app_users;
drop policy if exists "sgi_users_select_admin" on public.sgi_app_users;
drop policy if exists "sgi_users_update_admin" on public.sgi_app_users;
drop policy if exists "sgi_users_insert_admin" on public.sgi_app_users;
drop policy if exists "sgi_users_insert_self_viewer" on public.sgi_app_users;

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
