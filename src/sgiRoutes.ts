export type SgiAppRoute = 'dashboard' | 'admin-users';

export const parseSgiRoute = (hash: string): SgiAppRoute => {
  const path = hash.replace(/^#/, '').replace(/^\//, '').toLowerCase();
  if (path === 'admin/usuarios') return 'admin-users';
  return 'dashboard';
};

export const sgiRouteToHash = (route: SgiAppRoute): string =>
  route === 'admin-users' ? '#/admin/usuarios' : '#/';

export const SGI_ADMIN_USERS_PATH = '/admin/usuarios';
