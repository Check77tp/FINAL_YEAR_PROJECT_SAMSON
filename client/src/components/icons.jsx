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
