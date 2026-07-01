-- Ejecutar en Supabase: SQL Editor > New query
-- Seguro para ejecutar más de una vez (idempotente)

create table if not exists public.registered_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  registered_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists public.sgi_datasets (
  dataset_key text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by_email text
);

alter table public.registered_users enable row level security;
alter table public.sgi_datasets enable row level security;

drop policy if exists "anon_select_registered_users" on public.registered_users;
drop policy if exists "anon_insert_registered_users" on public.registered_users;
drop policy if exists "anon_update_registered_users" on public.registered_users;

drop policy if exists "anon_select_sgi_datasets" on public.sgi_datasets;
drop policy if exists "anon_insert_sgi_datasets" on public.sgi_datasets;
drop policy if exists "anon_update_sgi_datasets" on public.sgi_datasets;

create policy "anon_select_registered_users"
  on public.registered_users for select to anon using (true);

create policy "anon_insert_registered_users"
  on public.registered_users for insert to anon with check (true);

create policy "anon_update_registered_users"
  on public.registered_users for update to anon using (true) with check (true);

create policy "anon_select_sgi_datasets"
  on public.sgi_datasets for select to anon using (true);

create policy "anon_insert_sgi_datasets"
  on public.sgi_datasets for insert to anon with check (true);

create policy "anon_update_sgi_datasets"
  on public.sgi_datasets for update to anon using (true) with check (true);
