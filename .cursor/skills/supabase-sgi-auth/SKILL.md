---
name: supabase-sgi-auth
description: Implement and operate Supabase Auth for Tablero SGI Emprestur with admin-managed users in sgi_app_users, RLS policies, and dataset persistence. Use when configuring Supabase authentication, creating SGI users, updating schema.sql, wiring login in App.tsx, or troubleshooting unauthorized login errors.
---

# Supabase SGI Auth (Emprestur)

## Architecture

- **Supabase Auth**: email + password (`signInWithPassword`).
- **sgi_app_users**: allowlist administrada. Sin fila activa → login rechazado.
- **sgi_datasets**: persistencia JSON del tablero; solo usuarios `admin`/`editor` escriben.
- **Roles**: `admin` | `editor` | `viewer`.

## Setup checklist

1. Crear proyecto en [supabase.com](https://supabase.com).
2. Ejecutar `supabase/schema.sql` en **SQL Editor**.
3. En **Authentication → Providers → Email**: desactivar "Confirm email" si es app interna.
4. Variables en `.env` y Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Crear primer administrador (ver [reference.md](reference.md)).
6. Probar login en la app: botón **Iniciar sesión**.

## Crear usuario (admin)

Siempre dos pasos:

1. **Authentication → Users → Add user** (email `@emprestur.com`, contraseña temporal).
2. **SQL Editor** — insertar en `sgi_app_users` con el `auth_user_id` del usuario creado.

Plantilla SQL: `scripts/create-sgi-app-user.sql`

## Code map

| Archivo | Rol |
|---------|-----|
| `src/supabase/client.ts` | Cliente Supabase + persistencia de sesión |
| `src/supabase/auth.ts` | Login, logout, perfil, roles |
| `src/supabase/sgiPersistence.ts` | Carga/guardado de datasets |
| `supabase/schema.sql` | Tablas, funciones RLS, políticas |
| `src/App.tsx` | Modal Iniciar sesión, sesión SGI, auto-save |

## Agent workflow

When implementing auth changes:

1. Read `supabase/schema.sql` and `src/supabase/auth.ts` first.
2. Keep **admin-managed** model: no public self-registration in UI.
3. Restrict writes with `can_edit_sgi_datasets()` / `canEditSgiDatasets()`.
4. After schema changes, document new SQL steps in `reference.md`.
5. Run `npm run lint` before finishing.

## Troubleshooting

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| "Correo o contraseña incorrectos" | Auth user missing/wrong password | Reset en Authentication |
| "Usuario no autorizado..." | Falta fila en `sgi_app_users` o `is_active=false` | Insert/update en SQL |
| Datasets no guardan | Rol `viewer` o RLS sin sesión | Verificar rol y JWT activo |
| 401/RLS en datasets | Schema antiguo con políticas `anon` | Re-ejecutar `schema.sql` |

## Security notes

- Never expose `service_role` key in frontend or Vercel public env.
- Only `anon` key in `VITE_*` variables.
- First admin row must be inserted via SQL Editor (bypass RLS) or service role script.

## Additional resources

- SQL templates and bootstrap: [reference.md](reference.md)
