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

export const isPageAccessKey = (value: string): value is PageAccessKey => {
  return (ALL_PAGE_ACCESS_KEYS as readonly string[]).includes(value);
};

export const resolveEffectivePageAccess = (pageAccess: string[]): PageAccessKey[] => {
  if (pageAccess.length === 0) {
    return [...ALL_PAGE_ACCESS_KEYS];
  }
  return pageAccess.filter(isPageAccessKey);
};
