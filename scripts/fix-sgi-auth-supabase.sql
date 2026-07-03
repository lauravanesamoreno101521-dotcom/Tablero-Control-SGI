-- Ejecutar UNA VEZ en Supabase SQL Editor para corregir login tras registro
-- (crea perfil automático al iniciar sesión y repara usuarios ya registrados)

create or replace function public.ensure_my_sgi_profile(p_full_name text default null)
returns public.sgi_app_users
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  user_email text;
  existing public.sgi_app_users%rowtype;
  result public.sgi_app_users%rowtype;
begin
  uid := auth.uid();
  user_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  if uid is null or user_email = '' then
    return null;
  end if;

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
    'viewer',
    true,
    now()
  )
  returning * into result;

  return result;
end;
$$;

revoke all on function public.ensure_my_sgi_profile(text) from public;
grant execute on function public.ensure_my_sgi_profile(text) to authenticated;

drop policy if exists "sgi_users_update_own" on public.sgi_app_users;
create policy "sgi_users_update_own"
  on public.sgi_app_users for update to authenticated
  using (lower(email) = public.current_sgi_email())
  with check (lower(email) = public.current_sgi_email());

-- Reparar usuarios que ya existen en Authentication pero no tienen fila en sgi_app_users
insert into public.sgi_app_users (auth_user_id, email, full_name, role, is_active, last_login_at)
select
  u.id,
  lower(u.email),
  coalesce(u.raw_user_meta_data->>'full_name', split_part(lower(u.email), '@', 1)),
  'viewer',
  true,
  now()
from auth.users u
where lower(u.email) like '%@emprestur.com'
  and not exists (
    select 1 from public.sgi_app_users s where lower(s.email) = lower(u.email)
  )
on conflict (email) do nothing;
