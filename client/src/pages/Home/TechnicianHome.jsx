import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAssignedRequests } from '../../services/requestsService';
import StatCard from '../../components/StatCard';
import { ClipboardListIcon, CheckCircleIcon } from '../../components/icons';
import SlaBadge from '../../components/SlaBadge';
import AffectedBadge from '../../components/AffectedBadge';
import { setOwnAvailability } from '../../services/usersService';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  AVAILABILITY_LABELS,
  categoryIcon,
  formatDate,
} from '../../utils/requestFormat';
import './TechnicianHome.css';
import { useLiveVersion } from '../../hooks/useLive';

const AVAILABILITY_VALUES = ['available', 'on_job', 'off_duty'];

// technician_dashboard_unza_maintenance / technician_home_unza_mobile
// reference. Trimmed: no "pending approval" (no approval concept), no
// calendar/map/efficiency widgets (none of that is backed by real data).
const ACTIVE_STATUSES = ['assigned', 'in_progress'];
const COMPLETED_STATUSES = ['resolved', 'closed'];

function TechnicianHome() {
  const liveVersion = useLiveVersion(); // refetch when the server reports a change
  const { user } = useAuth();
  const [requests, setRequests] = useState(() => getAssignedRequests.peek() ?? null);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState(user?.availability_status || 'available');
  const [availabilityError, setAvailabilityError] = useState('');
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  useEffect(() => {
    getAssignedRequests()
      .then(setRequests)
      .catch((err) => setError(err.message));
  }, [liveVersion]);

  async function handleAvailabilityChange(value) {
    setUpdatingAvailability(true);
    setAvailabilityError('');
    try {
      await setOwnAvailability(value);
      setAvailability(value);
    } catch (err) {
      setAvailabilityError(err.message);
    } finally {
      setUpdatingAvailability(false);
    }
  }

  const active = (requests || []).filter((r) => ACTIVE_STATUSES.includes(r.status));
  const completedCount = (requests || []).filter((r) => COMPLETED_STATUSES.includes(r.status)).length;
  const activePreview = active.slice(0, 3);

  return (
    <main className="technician-home">
      <header className="technician-home-header">
        <h1 className="technician-home-title">Welcome back, {user?.name?.split(' ')[0]}!</h1>
        <p className="technician-home-subtitle">Here&rsquo;s what&rsquo;s on your plate today.</p>
      </header>

      <div className="technician-home-availability">
        <span className="technician-home-availability-label">Your status:</span>
        <div className="technician-home-availability-options">
          {AVAILABILITY_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              className={`technician-home-availability-option technician-home-availability-${value} ${
                availability === value ? 'technician-home-availability-selected' : ''
              }`}
              disabled={updatingAvailability}
              onClick={() => handleAvailabilityChange(value)}
            >
              {AVAILABILITY_LABELS[value]}
            </button>
          ))}
        </div>
        {availabilityError && (
          <p className="technician-home-error" role="alert">
            {availabilityError}
          </p>
        )}
      </div>

      <div className="technician-home-stats">
        <StatCard icon={<ClipboardListIcon width={20} height={20} />} label="Assigned" value={active.length} tone="primary" />
        <StatCard icon={<CheckCircleIcon width={20} height={20} />} label="Completed" value={completedCount} tone="secondary" />
      </div>

      <section className="technician-home-tasks">
        <div className="technician-home-tasks-header">
          <h2 className="technician-home-tasks-title">My Active Tasks</h2>
          <Link to="/tasks" className="technician-home-view-all">
            View All Tasks &rarr;
          </Link>
        </div>

        {error && (
          <p className="technician-home-error" role="alert">
            Could not load your tasks: {error}
          </p>
        )}
        {!error && requests === null && <p className="technician-home-loading">Loading…</p>}
        {!error && requests !== null && activePreview.length === 0 && (
          <p className="technician-home-empty">
            No active tasks right now — you&rsquo;ll see requests here once an administrator assigns
            one to you.
          </p>
        )}

        {activePreview.length > 0 && (
          <ul className="technician-home-task-list">
            {activePreview.map((request) => {
              const Icon = categoryIcon(request.category?.name);
              return (
                <li key={request.requestId}>
                  <Link to={`/tasks/${request.requestId}`} className="technician-home-task-card">
                    <div className="technician-home-task-top">
                      <span className="technician-home-task-id">#REQ-{request.requestId}</span>
                      <div className="technician-home-task-badges">
                        {request.priority && (
                          <span
                            className={`technician-home-priority technician-home-priority-${request.priority}`}
                          >
                            {PRIORITY_LABELS[request.priority]}
                          </span>
                        )}
                        <span className={`technician-home-status technician-home-status-${request.status}`}>
                          {STATUS_LABELS[request.status] || request.status}
                        </span>
                        <SlaBadge sla={request.sla} />
                        <AffectedBadge count={request.upvoteCount} />
                      </div>
                    </div>
                    <p className="technician-home-task-description">{request.description}</p>
                    {(request.hostel || request.room) && (
                      <p className="technician-home-task-location">
                        {[request.hostel, request.room].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <div className="technician-home-task-bottom">
                      <span className="technician-home-task-category">
                        <Icon width={16} height={16} />
                        {request.category?.name || 'Uncategorized'}
                      </span>
                      <span className="technician-home-task-date">{formatDate(request.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

export default TechnicianHome;
