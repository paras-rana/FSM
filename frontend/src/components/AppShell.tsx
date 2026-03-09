import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";
import { hasPageAccess } from "../modules/auth/pageAccess";
import { hasAnyRole } from "../modules/auth/roles";
import {
  AdminIcon,
  AttachmentIcon,
  BellIcon,
  DashboardIcon,
  FacilityIcon,
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
      className={`group/nav relative rounded-lg px-3 py-2 text-sm flex items-center justify-center transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-lg border border-sky-300"
          : "bg-white/90 text-fsm-ink hover:bg-cyan-500 hover:text-white border border-sky-100/80"
      } border-l-4`}
    >
      <span className="shrink-0 scale-110">{icon}</span>
      <span className="pointer-events-none absolute left-full ml-3 z-30 hidden whitespace-nowrap rounded-md bg-fsm-ink px-2 py-1 text-xs font-semibold text-white shadow-md md:group-hover/nav:block">
        {label}
      </span>
    </Link>
  );
};

export const AppShell = ({ title, children }: AppShellProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const isAdmin = hasAnyRole(user?.roles, ["ADMIN"]);
  const primaryRole = user?.roles[0] ?? "-";
  const displayName = user?.fullName || user?.email || "Unknown User";

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="w-full rounded-2xl border border-sky-200/80 bg-gradient-to-r from-white/90 via-cyan-50/90 to-emerald-50/90 shadow-xl p-5 mb-4 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
          <div className="text-left">
            <h1 className="text-xl font-semibold text-fsm-ink">{title}</h1>
          </div>
          <div className="text-center md:self-center">
            <p className="text-2xl font-bold tracking-wide text-fsm-ink">Field Service Management</p>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-700 font-semibold mt-1">Operations Console</p>
          </div>
          <div className="text-left md:text-right">
            <div className="relative inline-flex flex-col items-start md:items-end" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="text-base font-semibold text-fsm-ink hover:text-fsm-accent transition-colors text-left md:text-right"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                {displayName}
              </button>
              <p className="text-sm text-fsm-ink-muted text-left md:text-right">{primaryRole}</p>

              {userMenuOpen && (
                <div
                  className="absolute z-20 top-full mt-2 right-0 md:left-auto w-28 overflow-hidden rounded-xl border border-fsm-border bg-white shadow-xl origin-top-right"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full px-4 py-2.5 text-right text-sm font-semibold text-fsm-ink bg-gradient-to-r from-fsm-red-soft to-fsm-panel hover:from-fsm-red-soft-hover hover:to-fsm-red-soft transition-colors"
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="w-full md:flex md:items-start md:gap-3">
        <nav className="rounded-2xl bg-gradient-to-b from-cyan-50/90 to-emerald-50/70 border border-cyan-200/70 shadow-xl p-3 mb-4 md:mb-0 md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:w-20 md:overflow-visible">
          <div className="flex md:flex-col md:h-full gap-2">
            <div className="flex md:flex-col flex-wrap md:flex-nowrap gap-2 [&>a:nth-of-type(5n+1)]:border-l-sky-500 [&>a:nth-of-type(5n+2)]:border-l-indigo-500 [&>a:nth-of-type(5n+3)]:border-l-amber-500 [&>a:nth-of-type(5n+4)]:border-l-violet-500 [&>a:nth-of-type(5n+5)]:border-l-rose-500">
              {hasPageAccess(user, "dashboard") && (
                <NavItem
                  to="/dashboard"
                  activePath={location.pathname}
                  icon={<DashboardIcon size={19} />}
                  label="Dashboard"
                />
              )}
              {hasPageAccess(user, "work-orders") && (
                <NavItem
                  to="/work-orders"
                  activePath={location.pathname}
                  icon={<WorkOrderIcon size={19} />}
                  label="Work Orders"
                />
              )}
              {hasPageAccess(user, "service-requests") && (
                <NavItem
                  to="/service-requests"
                  activePath={location.pathname}
                  icon={<RequestIcon size={19} />}
                  label="Service Requests"
                />
              )}
              {hasPageAccess(user, "timesheet") && (
                <NavItem
                  to="/timesheet"
                  activePath={location.pathname}
                  icon={<TimeSheetIcon size={19} />}
                  label="TimeSheet"
                />
              )}
              {hasPageAccess(user, "reports") && (
                <NavItem
                  to="/reports"
                  activePath={location.pathname}
                  icon={<ReportsIcon size={19} />}
                  label="Reports"
                />
              )}
              {hasPageAccess(user, "theme-templates") && (
                <NavItem
                  to="/theme-templates"
                  activePath={location.pathname}
                  icon={<ThemeIcon size={19} />}
                  label="Theme Studio"
                />
              )}
              {isAdmin && hasPageAccess(user, "facilities") && (
                <NavItem
                  to="/facilities"
                  activePath={location.pathname}
                  icon={<FacilityIcon size={19} />}
                  label="Facilities"
                />
              )}
              {hasPageAccess(user, "attachments") && (
                <NavItem
                  to="/attachments"
                  activePath={location.pathname}
                  icon={<AttachmentIcon size={19} />}
                  label="Attachments"
                />
              )}
              {isAdmin && hasPageAccess(user, "admin-users") && (
                <NavItem
                  to="/admin/users"
                  activePath={location.pathname}
                  icon={<AdminIcon size={19} />}
                  label="Admin Users"
                />
              )}
              <NavItem
                to="/public/service-request"
                activePath={location.pathname}
                icon={<PublicIcon size={19} />}
                label="Public Form"
              />
            </div>

            {hasPageAccess(user, "notifications") && (
              <div className="[&>a]:border-l-cyan-500">
                <NavItem
                  to="/notifications"
                  activePath={location.pathname}
                  icon={<BellIcon size={19} />}
                  label="Notifications"
                />
              </div>
            )}
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          <div className="grid gap-2 [&>section]:rounded-2xl [&>section]:shadow-lg [&>section]:border [&>section]:border-sky-100 [&>section]:border-t-4 [&>section]:m-0 [&>section]:bg-white/95 [&>section:nth-of-type(5n+1)]:border-t-sky-500 [&>section:nth-of-type(5n+2)]:border-t-cyan-500 [&>section:nth-of-type(5n+3)]:border-t-amber-500 [&>section:nth-of-type(5n+4)]:border-t-emerald-500 [&>section:nth-of-type(5n+5)]:border-t-orange-500">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
};
