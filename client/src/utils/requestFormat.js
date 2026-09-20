import { DropletIcon, BoltIcon, ArmchairIcon, WrenchIcon } from '../components/icons';

export const STATUS_LABELS = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_VALUES = ['low', 'medium', 'high', 'critical'];

// Dropdown label for a technician: recommended one is starred and every entry
// shows availability + current workload, e.g.
// "★ James Jadi — On Job, 1 active".
export function technicianOptionLabel(t, { compact = false } = {}) {
  // Compact (narrow table cells): "★ John Mwembe (1 active)" or, when they're
  // not free, "Bwalya Kaunda (3 active, On Job)".
  if (compact) {
    const parts = [];
    if (t.activeTasks !== undefined) parts.push(`${t.activeTasks} active`);
    if (t.availabilityStatus && t.availabilityStatus !== 'available') {
      parts.push(AVAILABILITY_LABELS[t.availabilityStatus]);
    }
    return `${t.recommended ? '★ ' : ''}${t.name}${parts.length ? ` (${parts.join(', ')})` : ''}`;
  }

  const availability = AVAILABILITY_LABELS[t.availabilityStatus];
  const workload = t.activeTasks === undefined ? null : `${t.activeTasks} active`;
  const detail = [availability, workload].filter(Boolean).join(', ');
  return `${t.recommended ? '★ ' : ''}${t.name}${detail ? ` — ${detail}` : ''}`;
}

export const AVAILABILITY_LABELS = {
  available: 'Available',
  on_job: 'On Job',
  off_duty: 'Off Duty',
};

// Named after the hostels shown in the Stitch mockups (student_dashboard,
// admin_dashboard "Requests per Hostel", technician map) — the schema has no
// hostel table, so this is a plain client-side list backing the submission
// form's dropdown, with "Other" as an escape hatch for anywhere not listed.
export const HOSTELS = [
  'Goma Hall',
  'Kwame Nkrumah',
  'Ridgeway',
  'Presidential',
  'Africa Unity',
  'October',
  'Kalingalinga',
  'Soweto',
  'Other',
];

const CATEGORY_ICONS = {
  plumbing: DropletIcon,
  electrical: BoltIcon,
  furniture: ArmchairIcon,
};

export function categoryIcon(categoryName) {
  return CATEGORY_ICONS[categoryName?.toLowerCase()] || WrenchIcon;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Postgres sends timestamptz values as ISO strings with a UTC offset; `Date`
// parses that into an absolute instant, and toLocaleString() below renders
// it in whatever timezone the browser itself is set to — no manual
// conversion needed. Used where the exact time of a transition matters, not
// just the day (e.g. the status timeline), unlike formatDate() above.
export function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
