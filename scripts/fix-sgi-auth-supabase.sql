-- Ejecutar UNA VEZ en Supabase SQL Editor para corregir login tras registro
-- (resuelve email vacío en JWT, crea perfil al iniciar sesión y repara usuarios existentes)

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

revoke all on function public.ensure_my_sgi_profile(text, text) from public;
grant execute on function public.ensure_my_sgi_profile(text, text) to authenticated;

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
      and u.role in ('admin', 'editor')
  );
$$;

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
on conflict (email) do update
set auth_user_id = coalesce(public.sgi_app_users.auth_user_id, excluded.auth_user_id);
