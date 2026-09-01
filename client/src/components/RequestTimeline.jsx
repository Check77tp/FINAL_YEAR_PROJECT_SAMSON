import { STATUS_LABELS, formatDateTime } from '../utils/requestFormat';
import './RequestTimeline.css';

// Shared by the technician Task Detail and student Request Detail pages, so
// both draw the same real status_history data the same way — including the
// initial submission, which is a real row (previous_status: null,
// new_status: 'open') written at request-creation time, not synthesized
// here for display. One source of truth for the whole timeline.
function RequestTimeline({ history }) {
  const steps = history.map((entry) => ({
    label: entry.previousStatus === null ? 'Submitted' : STATUS_LABELS[entry.newStatus] || entry.newStatus,
    at: entry.changedAt,
  }));

  return (
    <ol className="request-timeline">
      {steps.map((step, index) => (
        <li key={`${step.label}-${step.at}`} className="request-timeline-step">
          <span
            className={`request-timeline-dot ${
              index === steps.length - 1 ? 'request-timeline-dot-current' : ''
            }`}
          />
          <div>
            <p className="request-timeline-label">{step.label}</p>
            <p className="request-timeline-date">{formatDateTime(step.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default RequestTimeline;
