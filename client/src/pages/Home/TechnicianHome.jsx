import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAssignedRequests } from '../../services/requestsService';
import { STATUS_LABELS, categoryIcon, formatDate } from '../../utils/requestFormat';
import './TechnicianHome.css';

// technician_dashboard_unza_maintenance / technician_home_unza_mobile
// reference. Trimmed: no "pending approval" (no approval concept), no
// calendar/map/efficiency widgets (none of that is backed by real data).
const ACTIVE_STATUSES = ['assigned', 'in_progress'];
const COMPLETED_STATUSES = ['resolved', 'closed'];

function TechnicianHome() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAssignedRequests()
      .then(setRequests)
      .catch((err) => setError(err.message));
  }, []);

  const active = (requests || []).filter((r) => ACTIVE_STATUSES.includes(r.status));
  const completedCount = (requests || []).filter((r) => COMPLETED_STATUSES.includes(r.status)).length;
  const activePreview = active.slice(0, 3);

  return (
    <main className="technician-home">
      <header className="technician-home-header">
        <div>
          <h1 className="technician-home-title">Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p className="technician-home-subtitle">Here&rsquo;s what&rsquo;s on your plate today.</p>
        </div>
        <button type="button" className="technician-home-logout" onClick={logout}>
          Log Out
        </button>
      </header>

      <div className="technician-home-stats">
        <div className="technician-home-stat technician-home-stat-primary">
          <span className="technician-home-stat-value">{active.length}</span>
          <span className="technician-home-stat-label">Assigned</span>
        </div>
        <div className="technician-home-stat">
          <span className="technician-home-stat-value">{completedCount}</span>
          <span className="technician-home-stat-label">Completed</span>
        </div>
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
                      <span className={`technician-home-status technician-home-status-${request.status}`}>
                        {STATUS_LABELS[request.status] || request.status}
                      </span>
                    </div>
                    <p className="technician-home-task-description">{request.description}</p>
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
