import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRequestDetail, updateRequestStatus } from '../../services/requestsService';
import { STATUS_LABELS, categoryIcon, formatDate } from '../../utils/requestFormat';
import './TaskDetail.css';

// The lifecycle only ever moves one step forward (see CLAUDE.md's Core
// Ticket Lifecycle) — so the action panel is a single button reflecting the
// one valid next step, not a free-choice dropdown.
const NEXT_ACTION = {
  assigned: { nextStatus: 'in_progress', label: 'Start Task' },
  in_progress: { nextStatus: 'resolved', label: 'Mark as Resolved' },
  resolved: { nextStatus: 'closed', label: 'Close Ticket' },
};

function TaskDetail() {
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    getRequestDetail(requestId)
      .then(setRequest)
      .catch((err) => setError(err.message));
  }, [requestId]);

  async function handleAdvance() {
    const action = NEXT_ACTION[request.status];
    if (!action) return;

    setUpdating(true);
    setUpdateError('');
    try {
      await updateRequestStatus(requestId, action.nextStatus);
      const refreshed = await getRequestDetail(requestId);
      setRequest(refreshed);
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (error) {
    return (
      <main className="task-detail">
        <p className="task-detail-error" role="alert">
          Could not load this task: {error}
        </p>
        <Link to="/tasks" className="task-detail-back">
          &larr; Back to My Tasks
        </Link>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="task-detail">
        <p className="task-detail-loading">Loading task…</p>
      </main>
    );
  }

  const Icon = categoryIcon(request.category?.name);
  const action = NEXT_ACTION[request.status];

  // Synthesized from created_at, since status_history only logs the
  // transitions after it — not the original submission itself.
  const timeline = [
    { label: 'Submitted', at: request.createdAt },
    ...request.history.map((entry) => ({
      label: STATUS_LABELS[entry.newStatus] || entry.newStatus,
      at: entry.changedAt,
    })),
  ];

  return (
    <main className="task-detail">
      <Link to="/tasks" className="task-detail-back">
        &larr; Back to My Tasks
      </Link>

      <header className="task-detail-header">
        <span className="task-detail-eyebrow">
          <Icon width={18} height={18} />
          {request.category?.name || 'Uncategorized'}
        </span>
        <h1 className="task-detail-title">#REQ-{request.requestId}</h1>
        <span className={`task-detail-status task-detail-status-${request.status}`}>
          {STATUS_LABELS[request.status] || request.status}
        </span>
      </header>

      <section className="task-detail-section">
        <h2 className="task-detail-section-title">Reported By</h2>
        <p className="task-detail-reporter">{request.student?.name}</p>
        <p className="task-detail-reporter-id">Student ID: {request.student?.idNumber}</p>
      </section>

      <section className="task-detail-section">
        <h2 className="task-detail-section-title">Description</h2>
        <p className="task-detail-description">{request.description}</p>
      </section>

      <section className="task-detail-section">
        <h2 className="task-detail-section-title">Issue Evidence</h2>
        {request.photoUrl ? (
          <img src={request.photoUrl} alt="Issue evidence" className="task-detail-photo" />
        ) : (
          <p className="task-detail-no-photo">No photo attached.</p>
        )}
      </section>

      <section className="task-detail-section">
        <h2 className="task-detail-section-title">Progress Timeline</h2>
        <ol className="task-detail-timeline">
          {timeline.map((step, index) => (
            <li key={`${step.label}-${step.at}`} className="task-detail-timeline-step">
              <span
                className={`task-detail-timeline-dot ${
                  index === timeline.length - 1 ? 'task-detail-timeline-dot-current' : ''
                }`}
              />
              <div>
                <p className="task-detail-timeline-label">{step.label}</p>
                <p className="task-detail-timeline-date">{formatDate(step.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="task-detail-section task-detail-actions">
        <h2 className="task-detail-section-title">Action Panel</h2>
        {action ? (
          <>
            <button
              type="button"
              className="task-detail-action-button"
              onClick={handleAdvance}
              disabled={updating}
            >
              {updating ? 'Updating…' : action.label}
            </button>
            {updateError && (
              <p className="task-detail-error" role="alert">
                {updateError}
              </p>
            )}
          </>
        ) : (
          <p className="task-detail-closed-note">This request is closed.</p>
        )}
      </section>
    </main>
  );
}

export default TaskDetail;
