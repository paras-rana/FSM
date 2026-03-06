import type { RoleName } from "../../types";

export const hasAnyRole = (roles: RoleName[] | undefined, allowed: RoleName[]): boolean => {
  if (!roles) return false;
  return roles.some((role) => allowed.includes(role));
};

