import type { RoleName } from "./roles";
import { pool } from "../db/pool";

export const ALL_PAGE_ACCESS_KEYS = [
  "dashboard",
  "work-orders",
  "service-requests",
  "timesheet",
  "costs",
  "reports",
  "theme-templates",
  "facilities",
  "attachments",
  "notifications",
  "admin-users"
] as const;

export type PageAccessKey = (typeof ALL_PAGE_ACCESS_KEYS)[number];

export const PERSONA_PAGE_ACCESS: Record<RoleName, PageAccessKey[]> = {
  ADMIN: [...ALL_PAGE_ACCESS_KEYS],
  MANAGER: [
    "dashboard",
    "work-orders",
    "service-requests",
    "reports",
    "attachments",
    "notifications"
  ],
  TECHNICIAN: [
    "dashboard",
    "work-orders",
    "service-requests",
    "timesheet",
    "attachments",
    "notifications"
  ],
  ACCOUNTANT: ["dashboard", "costs", "reports", "attachments", "notifications"]
};

export const isPageAccessKey = (value: string): value is PageAccessKey => {
  return (ALL_PAGE_ACCESS_KEYS as readonly string[]).includes(value);
};

export const resolveEffectivePageAccess = (pageAccess: string[]): PageAccessKey[] => {
  if (pageAccess.length === 0) {
    return [...ALL_PAGE_ACCESS_KEYS];
  }
  return pageAccess.filter(isPageAccessKey);
};

export const resolvePageAccessFromRoles = (roles: RoleName[]): PageAccessKey[] => {
  return resolvePageAccessFromRoleAccessMap(roles, PERSONA_PAGE_ACCESS);
};

export const resolvePageAccessFromRoleAccessMap = (
  roles: RoleName[],
  roleAccessMap: Record<RoleName, PageAccessKey[]>
): PageAccessKey[] => {
  if (roles.length === 0) return [];
  const allowed = new Set<PageAccessKey>();
  for (const role of roles) {
    const pages = roleAccessMap[role] ?? [];
    for (const page of pages) {
      allowed.add(page);
    }
  }
  return ALL_PAGE_ACCESS_KEYS.filter((page) => allowed.has(page));
};

export const loadPersonaAccessMapFromDb = async (): Promise<Record<RoleName, PageAccessKey[]>> => {
  const { rows } = await pool.query(
    `SELECT r.name AS role_name, rpa.page_key
     FROM roles r
     JOIN role_page_access rpa ON rpa.role_id = r.id
     ORDER BY r.name ASC, rpa.page_key ASC`
  );

  if (rows.length === 0) {
    return PERSONA_PAGE_ACCESS;
  }

  const accessByRole: Record<RoleName, PageAccessKey[]> = {
    ADMIN: [],
    MANAGER: [],
    TECHNICIAN: [],
    ACCOUNTANT: []
  };

  for (const row of rows) {
    const role = row.role_name as RoleName;
    const page = row.page_key as string;
    if (!isPageAccessKey(page)) continue;
    if (!accessByRole[role].includes(page)) {
      accessByRole[role].push(page);
    }
  }

  for (const role of Object.keys(accessByRole) as RoleName[]) {
    accessByRole[role] = ALL_PAGE_ACCESS_KEYS.filter((page) => accessByRole[role].includes(page));
  }

  return accessByRole;
};
