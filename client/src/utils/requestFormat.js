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
