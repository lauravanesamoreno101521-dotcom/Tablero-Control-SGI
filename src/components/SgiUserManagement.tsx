import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Shield, Users } from 'lucide-react';
import { getSgiRoleLabel, SGI_BOOTSTRAP_ADMIN_EMAIL } from '../supabase/auth.ts';
import {
  listSgiAppUsersForAdmin,
  updateSgiAppUserActiveForAdmin,
  updateSgiAppUserRoleForAdmin,
  type SgiAppUserAdminRow,
  type SgiAssignableRole
} from '../supabase/sgiUsersAdmin.ts';

type SgiUserManagementProps = {
  currentUserEmail: string;
  usesSupabaseAuth: boolean;
  onNavigateDashboard: () => void;
};

const formatDateTime = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function SgiUserManagement({
  currentUserEmail,
  usesSupabaseAuth,
  onNavigateDashboard
}: SgiUserManagementProps) {
  const [users, setUsers] = useState<SgiAppUserAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!usesSupabaseAuth) {
      setError(
        'La gestión de usuarios requiere Supabase. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel o en .env local y vuelve a desplegar.'
      );
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    const result = await listSgiAppUsersForAdmin();
    if (!result.ok) {
      setError('error' in result ? result.error : 'No se pudo cargar la lista de usuarios.');
      setUsers([]);
    } else {
      setUsers(result.users);
    }
    setLoading(false);
  }, [usesSupabaseAuth]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (user: SgiAppUserAdminRow, role: SgiAssignableRole) => {
    if (user.role === 'admin') return;
    setSavingUserId(user.id);
    setStatusMessage('');
    setError('');

    const result = await updateSgiAppUserRoleForAdmin(user.id, role);
    if (!result.ok) {
      setError('error' in result ? result.error : 'No se pudo actualizar el rol.');
    } else {
      setUsers((prev) =>
        prev.map((row) => (row.id === user.id ? { ...row, role } : row))
      );
      setStatusMessage(`Rol actualizado para ${user.email}.`);
    }
    setSavingUserId(null);
  };

  const handleActiveChange = async (user: SgiAppUserAdminRow, isActive: boolean) => {
    if (user.email === currentUserEmail && !isActive) {
      setError('No puedes desactivar tu propia cuenta de administrador.');
      return;
    }

    setSavingUserId(user.id);
    setStatusMessage('');
    setError('');

    const result = await updateSgiAppUserActiveForAdmin(user.id, isActive);
    if (!result.ok) {
      setError('error' in result ? result.error : 'No se pudo actualizar el estado del usuario.');
    } else {
      setUsers((prev) =>
        prev.map((row) => (row.id === user.id ? { ...row, isActive } : row))
      );
      setStatusMessage(
        isActive ? `${user.email} activado.` : `${user.email} desactivado.`
      );
    }
    setSavingUserId(null);
  };

  const isBootstrapAdmin =
    currentUserEmail.trim().toLowerCase() === SGI_BOOTSTRAP_ADMIN_EMAIL;

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onNavigateDashboard}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#006b3d] hover:text-[#00502c] mb-3"
          >
            <ArrowLeft size={16} />
            Volver al tablero
          </button>
          <h2 className="text-2xl font-bold text-[#191c1d] flex items-center gap-2">
            <Users size={24} className="text-[#006b3d]" />
            Gestión de usuarios
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Asigna roles de <strong>Visualizador</strong> (solo consulta) o <strong>Editor</strong>{' '}
            (edita bases de datos e informes). Los nuevos registros entran como visualizadores.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-soft border border-[#006b3d] text-[#006b3d] hover:bg-emerald-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {isBootstrapAdmin ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-soft px-4 py-3 text-sm text-emerald-900 flex items-start gap-2 mb-4">
          <Shield size={18} className="mt-0.5 flex-shrink-0 text-[#006b3d]" />
          <p>
            Sesión de administrador activa. Cambia el rol o el estado de cada usuario en la tabla;
            tu cuenta de administrador no se puede desactivar desde aquí.
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-soft px-4 py-3 text-sm text-amber-900 mb-4">
          Solo el administrador <span className="font-mono font-semibold">{SGI_BOOTSTRAP_ADMIN_EMAIL}</span>{' '}
          puede gestionar usuarios.
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-soft px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {statusMessage && (
        <p className="text-xs text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 rounded-soft px-3 py-2 mb-4">
          {statusMessage}
        </p>
      )}

      <div className="bg-white border border-[#eaecf0] rounded-soft shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-8 text-sm text-gray-500 text-center">Cargando usuarios...</p>
        ) : error ? (
          <p className="p-8 text-sm text-gray-600 text-center leading-relaxed max-w-xl mx-auto">
            No se pudo cargar el listado. Revisa el mensaje superior y vuelve a intentar.
          </p>
        ) : users.length === 0 ? (
          <p className="p-8 text-sm text-gray-500 text-center">No hay usuarios registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8f9fa] border-b border-[#eaecf0]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Correo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Rol</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Último acceso</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isAdminAccount = user.role === 'admin';
                  const isSaving = savingUserId === user.id;

                  return (
                    <tr key={user.id} className="border-b border-[#f1f3f6] last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs text-gray-800">{user.email}</td>
                      <td className="px-4 py-3 text-gray-700">{user.fullName}</td>
                      <td className="px-4 py-3">
                        {isAdminAccount ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#00502c] bg-emerald-100 px-2 py-1 rounded-soft border border-emerald-200">
                            {getSgiRoleLabel(user.role, user.email)}
                          </span>
                        ) : (
                          <select
                            value={user.role === 'editor' ? 'editor' : 'viewer'}
                            disabled={isSaving}
                            onChange={(e) =>
                              void handleRoleChange(user, e.target.value as SgiAssignableRole)
                            }
                            className="px-2 py-1.5 text-sm border border-[#d6dce5] rounded-soft bg-white focus:outline-none focus:ring-2 focus:ring-[#006b3d]/30"
                          >
                            <option value="viewer">Visualizador</option>
                            <option value="editor">Editor</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAdminAccount ? (
                          <span className="text-xs font-semibold text-emerald-700">Activo</span>
                        ) : (
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={user.isActive}
                              disabled={isSaving}
                              onChange={(e) => void handleActiveChange(user, e.target.checked)}
                              className="rounded border-gray-300 text-[#006b3d] focus:ring-[#006b3d]"
                            />
                            <span className="text-xs text-gray-700">
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </label>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(user.lastLoginAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
