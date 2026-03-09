import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 16, className = "", ...props }: IconProps) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
  ...props
});

export const DashboardIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="5" rx="2" />
    <rect x="13" y="10" width="8" height="11" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
  </svg>
);

export const WorkOrderIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </svg>
);

export const RequestIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 4h14v16H5z" />
    <path d="M8 8h8M8 12h8M8 16h6" />
  </svg>
);

export const TimeSheetIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const BellIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
    <path d="M10 19a2 2 0 004 0" />
  </svg>
);

export const CostIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 2v20" />
    <path d="M17 6.5A4.5 4.5 0 0012 4a4 4 0 000 8 4 4 0 010 8 4.5 4.5 0 01-5-2.5" />
  </svg>
);

export const ReportsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 20V8" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20v-11" />
  </svg>
);

export const ThemeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3a9 9 0 100 18h1a3 3 0 003-3 2 2 0 012-2h1a3 3 0 003-3A10 10 0 0012 3z" />
    <circle cx="7.5" cy="10" r="1" />
    <circle cx="10.5" cy="7.5" r="1" />
    <circle cx="14.5" cy="7.5" r="1" />
    <circle cx="16.5" cy="11" r="1" />
  </svg>
);

export const FacilityIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 21h18" />
    <path d="M5 21V8l7-4 7 4v13" />
    <path d="M9 11h2M13 11h2M9 15h2M13 15h2" />
  </svg>
);

export const AttachmentIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M8 12.5l6.5-6.5a3.5 3.5 0 115 5L10 21a5 5 0 11-7-7l10-10" />
  </svg>
);

export const InventoryIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 7l9-4 9 4-9 4-9-4z" />
    <path d="M3 7v10l9 4 9-4V7" />
    <path d="M12 11v10" />
  </svg>
);

export const AdminIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="8" r="3" />
    <path d="M3 20a6 6 0 0112 0M13 20a4 4 0 018 0" />
  </svg>
);

export const PublicIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
  </svg>
);

export const LogoutIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const CalendarIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
);

export const ViewIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const UserIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4 20a8 8 0 0116 0" />
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
