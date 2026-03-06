import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";
import { hasAnyRole } from "../modules/auth/roles";
import {
  AdminIcon,
  AttachmentIcon,
  BellIcon,
  CostIcon,
  DashboardIcon,
  LogoutIcon,
  PublicIcon,
  RequestIcon,
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
  const isActive = activePath === to;
  return (
    <Link
      to={to}
      className={`rounded px-3 py-2 text-sm flex items-center gap-2 ${
        isActive
          ? "bg-fsm-accent text-white shadow-sm"
          : "bg-gradient-to-r from-[#dccab7] to-[#ceb7a1] text-fsm-ink hover:from-[#d2baa3] hover:to-[#c8af97]"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

export const AppShell = ({ title, children }: AppShellProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = hasAnyRole(user?.roles, ["ADMIN"]);

  return (
    <main className="min-h-screen p-6">
      <section className="max-w-6xl mx-auto space-y-6">
        <header className="rounded-2xl bg-fsm-panel/95 border border-[#b89270] shadow-lg p-6 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fsm-ink tracking-wide">{title}</h1>
            <p className="text-[#4b423b] mt-1">
              Logged in as <strong>{user?.email}</strong>
            </p>
            <p className="text-[#5d5248] text-sm">Roles: {user?.roles.join(", ")}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg bg-fsm-accent text-white px-4 py-2 text-sm hover:bg-fsm-accentDark inline-flex items-center gap-2"
          >
            <LogoutIcon size={16} />
            Logout
          </button>
        </header>

        <nav className="rounded-2xl bg-fsm-panel/95 border border-[#b89270] shadow-lg p-4 flex flex-wrap gap-2">
          <NavItem
            to="/dashboard"
            activePath={location.pathname}
            icon={<DashboardIcon size={16} />}
            label="Dashboard"
          />
          <NavItem
            to="/work-orders"
            activePath={location.pathname}
            icon={<WorkOrderIcon size={16} />}
            label="Work Orders"
          />
          <NavItem
            to="/service-requests"
            activePath={location.pathname}
            icon={<RequestIcon size={16} />}
            label="Service Requests"
          />
          <NavItem
            to="/timesheet"
            activePath={location.pathname}
            icon={<TimeSheetIcon size={16} />}
            label="TimeSheet"
          />
          <NavItem
            to="/notifications"
            activePath={location.pathname}
            icon={<BellIcon size={16} />}
            label="Notifications"
          />
          <NavItem
            to="/costs"
            activePath={location.pathname}
            icon={<CostIcon size={16} />}
            label="Costs"
          />
          <NavItem
            to="/attachments"
            activePath={location.pathname}
            icon={<AttachmentIcon size={16} />}
            label="Attachments"
          />
          {isAdmin && (
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
        </nav>

        {children}
      </section>
    </main>
  );
};
