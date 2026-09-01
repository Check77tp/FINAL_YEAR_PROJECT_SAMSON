import { STATUS_LABELS, formatDateTime } from '../utils/requestFormat';
import './RequestTimeline.css';

// Shared by the technician Task Detail and student Request Detail pages, so
// both draw the same real status_history data the same way. Synthesizes the
// initial "Submitted" step from created_at, since status_history only logs
// the transitions that happen after that point.
function RequestTimeline({ createdAt, history }) {
  const steps = [
    { label: 'Submitted', at: createdAt },
    ...history.map((entry) => ({
      label: STATUS_LABELS[entry.newStatus] || entry.newStatus,
      at: entry.changedAt,
    })),
  ];

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
