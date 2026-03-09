import type { AuthUser, PageAccessKey } from "../../types";

export const ALL_PAGE_ACCESS_KEYS: PageAccessKey[] = [
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
];

export const hasPageAccess = (user: AuthUser | null | undefined, page: PageAccessKey): boolean => {
  if (!user) return false;
  const access = user?.pageAccess;
  if (!access || access.length === 0) return false;
  return access.includes(page);
};

const PAGE_TO_PATH: Record<PageAccessKey, string> = {
  dashboard: "/dashboard",
  "work-orders": "/work-orders",
  "service-requests": "/service-requests",
  timesheet: "/timesheet",
  costs: "/work-orders",
  reports: "/reports",
  "theme-templates": "/theme-templates",
  facilities: "/facilities",
  attachments: "/attachments",
  notifications: "/notifications",
  "admin-users": "/admin/users"
};

export const getFirstAllowedPath = (user: AuthUser | null | undefined): string => {
  for (const key of ALL_PAGE_ACCESS_KEYS) {
    if (hasPageAccess(user, key)) {
      return PAGE_TO_PATH[key];
    }
  }
  return "/login";
};
