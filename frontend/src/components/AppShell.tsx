import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";
import { hasPageAccess } from "../modules/auth/pageAccess";
import { hasAnyRole } from "../modules/auth/roles";
import {
  AdminIcon,
  AttachmentIcon,
  BellIcon,
  CostIcon,
  DashboardIcon,
  FacilityIcon,
  LogoutIcon,
  PublicIcon,
  ReportsIcon,
  RequestIcon,
  ThemeIcon,
  TimeSheetIcon,
  WorkOrderIcon
} from "./Icons";

type AppShellProps = {
  title: string;
  children: ReactNode;
};
type NavItemProps = {
  to: string;
  activePath: string;
  icon: ReactNode;
  label: string;
};

const NavItem = ({ to, activePath, icon, label }: NavItemProps) => {
  const isActive = activePath === to || (to !== "/dashboard" && activePath.startsWith(`${to}/`));
  return (
    <Link
      to={to}
      title={label}
      className={`rounded px-3 py-2 text-sm flex items-center gap-3 transition-all duration-200 md:justify-center md:group-hover:justify-start ${
        isActive
          ? "bg-fsm-accent text-white shadow-sm"
          : "bg-gradient-to-r from-fsm-blue-soft to-fsm-panel text-fsm-ink hover:from-fsm-blue-soft-hover hover:to-fsm-blue-soft"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="md:max-w-0 md:opacity-0 md:overflow-hidden md:group-hover:max-w-[220px] md:group-hover:opacity-100 transition-all duration-500 ease-out whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
};

export const AppShell = ({ title, children }: AppShellProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = hasAnyRole(user?.roles, ["ADMIN"]);

  return (
    <main className="min-h-screen p-4 md:p-6">
      <section className="w-full md:flex md:items-start md:gap-3">
        <nav className="group rounded-xl bg-fsm-panel/95 border border-fsm-border shadow-lg p-3 mb-4 md:mb-0 md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:w-16 md:hover:w-56 md:overflow-hidden md:transition-all md:duration-700 md:ease-out">
          <div className="flex md:flex-col md:h-full gap-2">
            <div className="flex md:flex-col flex-wrap md:flex-nowrap gap-2">
              {hasPageAccess(user, "dashboard") && (
                <NavItem
                  to="/dashboard"
                  activePath={location.pathname}
                  icon={<DashboardIcon size={16} />}
                  label="Dashboard"
                />
              )}
              {hasPageAccess(user, "work-orders") && (
                <NavItem
                  to="/work-orders"
                  activePath={location.pathname}
                  icon={<WorkOrderIcon size={16} />}
                  label="Work Orders"
                />
              )}
              {hasPageAccess(user, "service-requests") && (
                <NavItem
                  to="/service-requests"
                  activePath={location.pathname}
                  icon={<RequestIcon size={16} />}
                  label="Service Requests"
                />
              )}
              {hasPageAccess(user, "timesheet") && (
                <NavItem
                  to="/timesheet"
                  activePath={location.pathname}
                  icon={<TimeSheetIcon size={16} />}
                  label="TimeSheet"
                />
              )}
              {hasPageAccess(user, "costs") && (
                <NavItem
                  to="/costs"
                  activePath={location.pathname}
                  icon={<CostIcon size={16} />}
                  label="Costs"
                />
              )}
              {hasPageAccess(user, "reports") && (
                <NavItem
                  to="/reports"
                  activePath={location.pathname}
                  icon={<ReportsIcon size={16} />}
                  label="Reports"
                />
              )}
              {hasPageAccess(user, "theme-templates") && (
                <NavItem
                  to="/theme-templates"
                  activePath={location.pathname}
                  icon={<ThemeIcon size={16} />}
                  label="Theme Studio"
                />
              )}
              {isAdmin && hasPageAccess(user, "facilities") && (
                <NavItem
                  to="/facilities"
                  activePath={location.pathname}
                  icon={<FacilityIcon size={16} />}
                  label="Facilities"
                />
              )}
              {hasPageAccess(user, "attachments") && (
                <NavItem
                  to="/attachments"
                  activePath={location.pathname}
                  icon={<AttachmentIcon size={16} />}
                  label="Attachments"
                />
              )}
              {isAdmin && hasPageAccess(user, "admin-users") && (
                <NavItem
                  to="/admin/users"
                  activePath={location.pathname}
                  icon={<AdminIcon size={16} />}
                  label="Admin Users"
                />
              )}
              <NavItem
                to="/public/service-request"
                activePath={location.pathname}
                icon={<PublicIcon size={16} />}
                label="Public Form"
              />
            </div>

            {hasPageAccess(user, "notifications") && (
              <NavItem
                to="/notifications"
                activePath={location.pathname}
                icon={<BellIcon size={16} />}
                label="Notifications"
              />
            )}
            <button
              onClick={logout}
              className="rounded px-3 py-2 text-sm flex items-center gap-3 bg-fsm-red-soft text-fsm-ink hover:bg-fsm-red-soft-hover md:justify-center md:group-hover:justify-start transition-all duration-500 ease-out md:mt-auto"
              title="Logout"
            >
              <LogoutIcon size={16} />
              <span className="md:max-w-0 md:opacity-0 md:overflow-hidden md:group-hover:max-w-[220px] md:group-hover:opacity-100 transition-all duration-500 ease-out whitespace-nowrap">
                Logout
              </span>
            </button>
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          <header className="rounded-xl bg-fsm-panel/95 border border-fsm-border shadow-lg p-6 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-fsm-ink tracking-wide">{title}</h1>
              <p className="text-fsm-ink mt-1">
                Logged in as <strong>{user?.email}</strong>
              </p>
              <p className="text-fsm-ink-muted text-sm">Roles: {user?.roles.join(", ")}</p>
            </div>
          </header>

          <div className="grid gap-1 [&>section]:rounded-xl [&>section]:shadow-none [&>section]:border [&>section]:border-fsm-border [&>section]:m-0 [&>section:nth-of-type(4n+1)]:bg-fsm-panel [&>section:nth-of-type(4n+2)]:bg-fsm-blue-soft [&>section:nth-of-type(4n+3)]:bg-fsm-blue-soft-2 [&>section:nth-of-type(4n+4)]:bg-fsm-blue-soft-3">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
};
