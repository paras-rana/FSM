export const ROLE = {
  TECHNICIAN: "TECHNICIAN",
  MANAGER: "MANAGER",
  ACCOUNTANT: "ACCOUNTANT",
  ADMIN: "ADMIN"
} as const;

export type RoleName = keyof typeof ROLE;

const rank: Record<RoleName, number> = {
  TECHNICIAN: 1,
  ACCOUNTANT: 1,
  MANAGER: 2,
  ADMIN: 3
};

export const hasAnyRole = (userRoles: RoleName[], allowed: RoleName[]): boolean => {
  return userRoles.some((r) => allowed.includes(r));
};

export const maxRoleRank = (roles: RoleName[]): number => {
  return roles.reduce((max, role) => Math.max(max, rank[role] ?? 0), 0);
};
