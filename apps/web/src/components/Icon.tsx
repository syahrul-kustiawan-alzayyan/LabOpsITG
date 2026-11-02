import React from "react";

export type IconName =
  | "dashboard"
  | "users"
  | "lab"
  | "calendar"
  | "booking"
  | "issue"
  | "inventory"
  | "attendance"
  | "report"
  | "prodi"
  | "recruitment"
  | "staff"
  | "bell"
  | "menu"
  | "close"
  | "check"
  | "plus"
  | "search"
  | "logout"
  | "chevron"
  | "clock"
  | "alert"
  | "info"
  | "shield"
  | "refresh"
  | "qr"
  | "external";

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
      <path d="M16 5.5a3 3 0 0 1 0 5.6" />
      <path d="M17.5 14.4c2 .6 3.2 2.3 3.2 4.6" />
    </>
  ),
  lab: (
    <>
      <rect x="2.5" y="4" width="19" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
      <path d="M6.5 8h6M6.5 11.5h3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2" />
    </>
  ),
  booking: (
    <>
      <path d="M7 4h10a2 2 0 0 1 2 2v14a1 1 0 0 1-1.6.8L12 17l-5.4 3.8A1 1 0 0 1 5 20V6a2 2 0 0 1 2-2Z" />
      <path d="M9 8.5h6M9 11.5h4" />
    </>
  ),
  issue: (
    <>
      <path d="M12 3.8 21 19.5a1.4 1.4 0 0 1-1.2 2H4.2a1.4 1.4 0 0 1-1.2-2L12 3.8Z" />
      <path d="M12 9v4.5M12 17h.01" />
    </>
  ),
  inventory: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </>
  ),
  attendance: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M21 14v.01M14 21h.01M18 18h3v3" />
    </>
  ),
  report: (
    <>
      <path d="M4 20V4M4 20h16" />
      <rect x="7.5" y="12" width="3" height="5" rx="0.6" />
      <rect x="12.5" y="8" width="3" height="9" rx="0.6" />
      <rect x="17.5" y="5" width="3" height="12" rx="0.6" />
    </>
  ),
  prodi: (
    <>
      <path d="M3 20h18M5 20V9l7-4 7 4v11" />
      <path d="M9 20v-5h6v5M9 10h.01M15 10h.01" />
    </>
  ),
  recruitment: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3 2.6-5.2 6-5.2 1.2 0 2.3.3 3.2.8" />
      <path d="M18 13v6M15 16h6" />
    </>
  ),
  staff: (
    <>
      <circle cx="8" cy="7.5" r="2.8" />
      <path d="M2.8 19c0-2.7 2.3-4.6 5.2-4.6s5.2 1.9 5.2 4.6" />
      <path d="M16 4.5h5M18.5 2v5" />
      <path d="M16.5 19v-3.4c0-2.1 1.5-3.7 3.5-3.7" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.3 2.9 7.6 7 9.5 4.1-1.9 7-5.2 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4v4.5h-4.5" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <path d="M15 15h2v2h-2zM19 15h2M15 19v2M19 19h2v2" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-8 8" />
      <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
