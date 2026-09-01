import { DropletIcon, BoltIcon, ArmchairIcon, WrenchIcon } from '../components/icons';

export const STATUS_LABELS = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

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
