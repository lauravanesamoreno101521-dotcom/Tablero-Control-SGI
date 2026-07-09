-- Permite a administradores eliminar usuarios SGI y liberar el correo para re-registro.
-- Ejecutar en Supabase SQL Editor (idempotente).

create or replace function public.admin_delete_sgi_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target public.sgi_app_users%rowtype;
  admin_email text;
begin
  if not public.is_sgi_admin() then
    raise exception 'Acceso denegado';
  end if;

  admin_email := public.current_sgi_email();

  select * into target
  from public.sgi_app_users u
  where u.id = p_user_id;

  if not found then
    raise exception 'Usuario no encontrado';
  end if;

  if lower(target.email) = 'admin@emprestur.com' then
    raise exception 'No se puede eliminar la cuenta de administrador principal';
  end if;

  if target.role = 'admin' then
    raise exception 'No se puede eliminar otro administrador';
  end if;

  if lower(target.email) = admin_email then
    raise exception 'No puedes eliminar tu propia cuenta';
  end if;

  delete from public.sgi_app_users where id = p_user_id;

  delete from public.registered_users where lower(trim(email)) = lower(target.email);

  if target.auth_user_id is not null then
    delete from auth.users where id = target.auth_user_id;
  else
    delete from auth.users where lower(trim(email)) = lower(target.email);
  end if;
end;
$$;

revoke all on function public.admin_delete_sgi_user(uuid) from public;
grant execute on function public.admin_delete_sgi_user(uuid) to authenticated;
