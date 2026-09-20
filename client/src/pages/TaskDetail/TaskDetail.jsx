import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRequestDetail, updateRequestStatus } from '../../services/requestsService';
import { STATUS_LABELS, PRIORITY_LABELS, categoryIcon } from '../../utils/requestFormat';
import { StarIcon, MapPinIcon } from '../../components/icons';
import RequestTimeline from '../../components/RequestTimeline';
import SlaBadge from '../../components/SlaBadge';
import './TaskDetail.css';
import { useLiveVersion } from '../../hooks/useLive';

// The lifecycle only ever moves one step forward (see CLAUDE.md's Core
// Ticket Lifecycle) — so the action panel is a single button reflecting the
// one valid next step, not a free-choice dropdown.
const NEXT_ACTION = {
  assigned: { nextStatus: 'in_progress', label: 'Start Task' },
  in_progress: { nextStatus: 'resolved', label: 'Mark as Resolved' },
  resolved: { nextStatus: 'closed', label: 'Close Ticket' },
};

function TaskDetail() {
  const liveVersion = useLiveVersion(); // refetch when the server reports a change
  const { requestId } = useParams();
  const [request, setRequest] = useState(() => getRequestDetail.peek(requestId) ?? null);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    getRequestDetail(requestId)
      .then(setRequest)
      .catch((err) => setError(err.message));
  }, [requestId, liveVersion]);

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
        <div className="task-detail-badges">
          <SlaBadge sla={request.sla} />
          <span className={`task-detail-status task-detail-status-${request.status}`}>
            {STATUS_LABELS[request.status] || request.status}
          </span>
          {request.priority && (
            <span className={`task-detail-priority task-detail-priority-${request.priority}`}>
              {PRIORITY_LABELS[request.priority] || request.priority} Priority
            </span>
          )}
        </div>
        {(request.hostel || request.room) && (
          <span className="task-detail-location">
            <MapPinIcon width={16} height={16} />
            {[request.hostel, request.room].filter(Boolean).join(', ')}
          </span>
        )}
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
        <RequestTimeline history={request.history} />
      </section>

      {request.rating && (
        <section className="task-detail-section">
          <h2 className="task-detail-section-title">Student Rating</h2>
          <div className="task-detail-stars" aria-label={`Rated ${request.rating.rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <StarIcon
                key={n}
                width={20}
                height={20}
                className={n <= request.rating.rating ? 'task-detail-star-filled' : ''}
              />
            ))}
          </div>
          {request.rating.comment && (
            <p className="task-detail-rating-comment">&ldquo;{request.rating.comment}&rdquo;</p>
          )}
        </section>
      )}

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
