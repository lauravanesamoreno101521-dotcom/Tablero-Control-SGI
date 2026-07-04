-- Roles SGI: visualizador (default), editor (edita datos), admin (gestiona usuarios)
-- Ejecutar en Supabase SQL Editor

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
      and u.role in ('admin', 'editor')
  );
$$;

-- Primer administrador del tablero (debe registrarse antes en la app)
update public.sgi_app_users
set role = 'admin', is_active = true
where email = 'admin@emprestur.com';
