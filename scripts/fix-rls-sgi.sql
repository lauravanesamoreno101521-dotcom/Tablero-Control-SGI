-- Endurecer políticas RLS del Tablero SGI
-- Ejecutar en Supabase SQL Editor después de fix-sgi-auth-supabase.sql

drop policy if exists "sgi_users_update_own" on public.sgi_app_users;
create policy "sgi_users_update_own"
  on public.sgi_app_users for update to authenticated
  using (
    lower(email) = public.current_sgi_email()
    and is_active = true
  )
  with check (
    lower(email) = public.current_sgi_email()
    and role = (
      select u.role
      from public.sgi_app_users u
      where lower(u.email) = public.current_sgi_email()
    )
    and is_active = (
      select u.is_active
      from public.sgi_app_users u
      where lower(u.email) = public.current_sgi_email()
    )
  );

drop policy if exists "sgi_datasets_write_editors" on public.sgi_datasets;
drop policy if exists "sgi_datasets_insert_editors" on public.sgi_datasets;
drop policy if exists "sgi_datasets_update_editors" on public.sgi_datasets;
drop policy if exists "sgi_datasets_delete_editors" on public.sgi_datasets;

create policy "sgi_datasets_insert_editors"
  on public.sgi_datasets for insert to authenticated
  with check (public.can_edit_sgi_datasets());

create policy "sgi_datasets_update_editors"
  on public.sgi_datasets for update to authenticated
  using (public.can_edit_sgi_datasets())
  with check (public.can_edit_sgi_datasets());

create policy "sgi_datasets_delete_editors"
  on public.sgi_datasets for delete to authenticated
  using (public.can_edit_sgi_datasets());

-- Verificación rápida
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('sgi_app_users', 'sgi_datasets')
order by tablename, policyname;
