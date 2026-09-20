import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getRequestDetail,
  updateRequestStatus,
  updateRequestPriority,
  assignTechnician,
} from '../../services/requestsService';
import { getTechnicians } from '../../services/usersService';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  PRIORITY_VALUES,
  AVAILABILITY_LABELS,
  categoryIcon,
  technicianOptionLabel,
} from '../../utils/requestFormat';
import { StarIcon, MapPinIcon } from '../../components/icons';
import RequestTimeline from '../../components/RequestTimeline';
import SlaBadge from '../../components/SlaBadge';
import './AdminRequestDetail.css';
import { useLiveVersion } from '../../hooks/useLive';

// Admins previously had no per-request detail view — Manage Requests
// handled everything inline in a table row, and TopNav's notification
// bell fell back to the generic list instead of a specific record. This
// page fills that gap, and also surfaces two things the backend already
// supported but no admin-facing UI ever exposed: an administrator can
// advance a request's status directly (requests.routes.js's PATCH
// /:requestId/status has always allowed 'technician' or 'administrator'),
// and assign a technician to a still-open request.
const NEXT_ACTION = {
  assigned: { nextStatus: 'in_progress', label: 'Mark In Progress' },
  in_progress: { nextStatus: 'resolved', label: 'Mark as Resolved' },
  resolved: { nextStatus: 'closed', label: 'Close Ticket' },
};

function AdminRequestDetail() {
  const liveVersion = useLiveVersion(); // refetch when the server reports a change
  const { requestId } = useParams();
  const [request, setRequest] = useState(() => getRequestDetail.peek(requestId) ?? null);
  const [error, setError] = useState('');
  const [technicians, setTechnicians] = useState(() => getTechnicians.peek() ?? []);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getRequestDetail(requestId);
      setRequest(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [requestId]);

  useEffect(() => {
    load();
    getTechnicians()
      .then(setTechnicians)
      .catch(() => {});
  }, [load, liveVersion]);

  // Server-recommended technician is preselected (one tap to assign).
  const recommendedId = technicians.find((t) => t.recommended)?.id || '';
  const chosenTechnician = selectedTechnician || recommendedId;

  async function handleAssign() {
    if (!chosenTechnician) return;
    setAssigning(true);
    setActionError('');
    try {
      await assignTechnician(requestId, chosenTechnician);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setAssigning(false);
    }
  }

  async function handleAdvance() {
    const action = NEXT_ACTION[request.status];
    if (!action) return;
    setAdvancing(true);
    setActionError('');
    try {
      await updateRequestStatus(requestId, action.nextStatus);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setAdvancing(false);
    }
  }

  async function handlePriorityChange(event) {
    const priority = event.target.value;
    setUpdatingPriority(true);
    setActionError('');
    try {
      await updateRequestPriority(requestId, priority);
      await load(); // the SLA deadline depends on priority, so refresh it too
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdatingPriority(false);
    }
  }

  if (error && !request) {
    return (
      <main className="admin-request-detail">
        <p className="admin-request-detail-error" role="alert">
          Could not load this request: {error}
        </p>
        <Link to="/manage-requests" className="admin-request-detail-back">
          &larr; Back to Manage Requests
        </Link>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="admin-request-detail">
        <p className="admin-request-detail-loading">Loading request…</p>
      </main>
    );
  }

  const Icon = categoryIcon(request.category?.name);
  const action = NEXT_ACTION[request.status];

  return (
    <main className="admin-request-detail">
      <Link to="/manage-requests" className="admin-request-detail-back">
        &larr; Back to Manage Requests
      </Link>

      <header className="admin-request-detail-header">
        <span className="admin-request-detail-eyebrow">
          <Icon width={18} height={18} />
          {request.category?.name || 'Uncategorized'}
        </span>
        <h1 className="admin-request-detail-title">#REQ-{request.requestId}</h1>
        <div className="admin-request-detail-badges">
          <span className={`admin-request-detail-status admin-request-detail-status-${request.status}`}>
            {STATUS_LABELS[request.status] || request.status}
          </span>
          <select
            className={`admin-request-detail-priority-select admin-request-detail-priority-${request.priority}`}
            value={request.priority || 'medium'}
            disabled={updatingPriority}
            onChange={handlePriorityChange}
          >
            {PRIORITY_VALUES.map((value) => (
              <option key={value} value={value}>
                {PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
          <SlaBadge sla={request.sla} />
          {request.upvoteCount > 0 && (
            <span className="admin-request-detail-upvotes">
              +{request.upvoteCount} other student{request.upvoteCount === 1 ? '' : 's'} affected
            </span>
          )}
        </div>
        {(request.hostel || request.room) && (
          <span className="admin-request-detail-location">
            <MapPinIcon width={16} height={16} />
            {[request.hostel, request.room].filter(Boolean).join(', ')}
          </span>
        )}
      </header>

      {actionError && (
        <p className="admin-request-detail-error" role="alert">
          {actionError}
        </p>
      )}

      <section className="admin-request-detail-section">
        <h2 className="admin-request-detail-section-title">Reported By</h2>
        <p className="admin-request-detail-reporter">{request.student?.name}</p>
        <p className="admin-request-detail-reporter-id">Student ID: {request.student?.idNumber}</p>
      </section>

      <section className="admin-request-detail-section">
        <h2 className="admin-request-detail-section-title">Assigned Technician</h2>
        {request.technician ? (
          <p className="admin-request-detail-technician">
            {request.technician.name}
            {request.technician.availabilityStatus && (
              <span
                className={`admin-request-detail-availability admin-request-detail-availability-${request.technician.availabilityStatus}`}
              >
                {AVAILABILITY_LABELS[request.technician.availabilityStatus]}
              </span>
            )}
          </p>
        ) : request.status === 'open' ? (
          <div className="admin-request-detail-assign">
            <select
              value={chosenTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              disabled={assigning}
            >
              <option value="">Select technician</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {technicianOptionLabel(t)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="admin-request-detail-assign-button"
              disabled={!chosenTechnician || assigning}
              onClick={handleAssign}
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        ) : (
          <p className="admin-request-detail-technician">Awaiting assignment</p>
        )}
      </section>

      <section className="admin-request-detail-section">
        <h2 className="admin-request-detail-section-title">Description</h2>
        <p className="admin-request-detail-description">{request.description}</p>
      </section>

      <section className="admin-request-detail-section">
        <h2 className="admin-request-detail-section-title">Evidence Photos</h2>
        {request.photoUrl ? (
          <img src={request.photoUrl} alt="Issue evidence" className="admin-request-detail-photo" />
        ) : (
          <p className="admin-request-detail-no-photo">No photo attached.</p>
        )}
      </section>

      <section className="admin-request-detail-section">
        <h2 className="admin-request-detail-section-title">Status Timeline</h2>
        <RequestTimeline history={request.history} />
      </section>

      {request.rating && (
        <section className="admin-request-detail-section">
          <h2 className="admin-request-detail-section-title">Student Rating</h2>
          <div className="admin-request-detail-stars" aria-label={`Rated ${request.rating.rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <StarIcon
                key={n}
                width={20}
                height={20}
                className={n <= request.rating.rating ? 'admin-request-detail-star-filled' : ''}
              />
            ))}
          </div>
          {request.rating.comment && (
            <p className="admin-request-detail-rating-comment">&ldquo;{request.rating.comment}&rdquo;</p>
          )}
        </section>
      )}

      {action && (
        <section className="admin-request-detail-section admin-request-detail-actions">
          <h2 className="admin-request-detail-section-title">Action Panel</h2>
          <button
            type="button"
            className="admin-request-detail-action-button"
            onClick={handleAdvance}
            disabled={advancing}
          >
            {advancing ? 'Updating…' : action.label}
          </button>
        </section>
      )}
    </main>
  );
}

export default AdminRequestDetail;
