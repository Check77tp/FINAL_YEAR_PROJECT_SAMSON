// Small hand-rolled icon set (24px thin-stroke, per academic_infrastructure_framework.md)
// — avoids pulling in an icon library for a handful of glyphs.
function iconProps(props) {
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}

export function IdCardIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c0-1.7 1.3-3 3-3s3 1.3 3 3" />
      <path d="M14 9h4M14 13h4" />
    </svg>
  );
}

export function LockIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a13.5 13.5 0 0 1-3.1 3.9M6.5 6.6A13.6 13.6 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.2-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function ArrowRightIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function GraduationCapIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M2 9l10-5 10 5-10 5-10-5Z" />
      <path d="M6 11v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
      <path d="M22 9v6" />
    </svg>
  );
}

export function DropletIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 2.5s7 7.6 7 12.2a7 7 0 0 1-14 0c0-4.6 7-12.2 7-12.2Z" />
    </svg>
  );
}

export function BoltIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

export function ArmchairIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
      <path d="M4 11h16a1 1 0 0 1 1 1v3a2 2 0 0 1-2 2v3M20 20v-3" />
      <path d="M4 20v-3a2 2 0 0 1-1-1v-3a1 1 0 0 1 1-1M4 20v-3" />
    </svg>
  );
}

export function WrenchIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CameraIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="14" r="3.5" />
    </svg>
  );
}

export function XIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function GridIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function ClipboardListIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M8 11h8M8 15h8M8 19h5" />
    </svg>
  );
}

export function ChartBarIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
      <path d="M2 20h20" />
    </svg>
  );
}

export function BellIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function InfoIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 8v.01" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function MenuIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function LogoutIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function StarIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="m12 3 2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 17l-5.6 3.1 1.4-6.3-4.8-4.3 6.4-.6Z" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function GearIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 15 4.65a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

export function UsersGroupIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.4 2.7-6 6-6s6 2.6 6 6" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M15.8 14.2c2.7.3 4.7 2.5 4.7 5.3" />
    </svg>
  );
}

export function DownloadIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

export function PrinterIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="8" rx="1.5" />
      <path d="M6 17v4h12v-4" />
    </svg>
  );
}

export function MapPinIcon(props) {
  return (
    <svg {...iconProps(props)}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
