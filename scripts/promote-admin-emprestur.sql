-- Promover admin@emprestur.com y actualizar funciones de rol
-- Ejecutar en Supabase SQL Editor

update public.sgi_app_users
set role = 'admin', is_active = true
where lower(email) = 'admin@emprestur.com';

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
