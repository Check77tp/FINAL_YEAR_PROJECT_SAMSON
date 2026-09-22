import { CalendarIcon } from './icons';
import { isPreventiveRequest } from '../utils/requestFormat';
import './PreventiveBadge.css';

// Marks a task that was generated automatically by a preventive maintenance
// schedule (item 11) rather than reported by a student — so a technician can
// tell a routine scheduled check apart from an actual fault at a glance,
// wherever the two might appear side by side (My Tasks, My Maintenance
// Jobs, a task's own detail page). Renders nothing for an ordinary request.
function PreventiveBadge({ description }) {
  if (!isPreventiveRequest(description)) return null;
  return (
    <span
      className="preventive-badge"
      title="This is a recurring, scheduled maintenance check set up by an administrator - not a fault a student reported."
    >
      <CalendarIcon width={12} height={12} />
      Recurring Maintenance
    </span>
  );
}

export default PreventiveBadge;
