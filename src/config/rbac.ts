export type Role = 'ADMIN' | 'USER';
export type Permission =
  | 'admin:users:read'
  | 'admin:tunnels:read'
  | 'admin:logs:read'
  | 'admin:connections:read'
  | 'admin:stats:read'
  | 'tunnel:create'
  | 'tunnel:read:own'
  | 'logs:read:own';

export const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    'admin:users:read',
    'admin:tunnels:read',
    'admin:logs:read',
    'admin:connections:read',
    'admin:stats:read',
    'tunnel:create',
    'tunnel:read:own',
    'logs:read:own',
  ],
  USER: ['tunnel:create', 'tunnel:read:own', 'logs:read:own'],
};

export function hasPermission(role: Role, perm: Permission): boolean {
  return rolePermissions[role].includes(perm);
}
