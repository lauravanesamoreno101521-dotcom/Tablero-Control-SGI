# Supabase SGI Auth — Reference

## Bootstrap primer administrador

1. Supabase Dashboard → **Authentication → Users → Add user**
   - Email: `admin@emprestur.com`
   - Password: (temporal, compartir por canal seguro)
   - Copiar **User UID**

2. SQL Editor (como postgres, ignora RLS):

```sql
insert into public.sgi_app_users (auth_user_id, email, full_name, role, is_active)
values (
  'PASTE_AUTH_USER_UUID_HERE',
  'admin@emprestur.com',
  'Administrador SGI',
  'admin',
  true
)
on conflict (email) do update
set auth_user_id = excluded.auth_user_id,
    role = excluded.role,
    is_active = excluded.is_active;
```

## Crear editor o viewer

```sql
-- Después de crear el usuario en Authentication
insert into public.sgi_app_users (auth_user_id, email, full_name, role, is_active)
values (
  'AUTH_USER_UUID',
  'usuario@emprestur.com',
  'Nombre Apellido',
  'editor',  -- admin | editor | viewer
  true
);
```

## Desactivar usuario

```sql
update public.sgi_app_users
set is_active = false
where email = 'usuario@emprestur.com';
```

## Eliminar usuario (re-registro con el mismo correo)

Desde **Gestión de usuarios** el administrador puede pulsar **Eliminar** en la tabla. Eso borra el perfil en `sgi_app_users` y la cuenta en Authentication, sin tocar `sgi_datasets` (datos del tablero).

Si el botón falla, instala la función en SQL Editor:

```sql
-- Ver scripts/admin-delete-sgi-user.sql
```

Manual (SQL Editor, como postgres):

```sql
-- Sustituir AUTH_USER_UUID y el correo
delete from public.sgi_app_users where email = 'usuario@emprestur.com';
delete from auth.users where id = 'AUTH_USER_UUID';
```

## Cambiar rol

```sql
update public.sgi_app_users
set role = 'viewer'
where email = 'usuario@emprestur.com';
```

## Ver usuarios activos

```sql
select email, full_name, role, is_active, last_login_at
from public.sgi_app_users
order by email;
```

## Vercel env vars

| Variable | Scope |
|----------|-------|
| `VITE_SUPABASE_URL` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview, Development |

Redeploy after changing env vars.

## RLS summary

- `sgi_app_users`: usuario lee su fila; `admin` lee/inserta/actualiza todas.
- `sgi_datasets`: usuarios activos leen; `admin`/`editor` escriben.
