import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAssignedRequests } from '../../services/requestsService';
import { STATUS_LABELS, categoryIcon, formatDate } from '../../utils/requestFormat';
import './MyTasks.css';

const ACTIVE_STATUSES = ['assigned', 'in_progress'];

function MyTasks() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    getAssignedRequests()
      .then(setRequests)
      .catch((err) => setError(err.message));
  }, []);

  const assignedCount = (requests || []).filter((r) => ACTIVE_STATUSES.includes(r.status)).length;
  const completedCount = (requests || []).filter((r) => !ACTIVE_STATUSES.includes(r.status)).length;

  const filtered = (requests || []).filter((request) =>
    filter === 'active' ? ACTIVE_STATUSES.includes(request.status) : !ACTIVE_STATUSES.includes(request.status)
  );

  return (
    <main className="my-tasks">
      <header className="my-tasks-header">
        <h1 className="my-tasks-title">My Tasks</h1>
        <p className="my-tasks-subtitle">Maintenance requests assigned to you.</p>
      </header>

      <div className="my-tasks-stats">
        <div className="my-tasks-stat">
          <span className="my-tasks-stat-value">{assignedCount}</span>
          <span className="my-tasks-stat-label">Assigned</span>
        </div>
        <div className="my-tasks-stat my-tasks-stat-completed">
          <span className="my-tasks-stat-value">{completedCount}</span>
          <span className="my-tasks-stat-label">Completed</span>
        </div>
      </div>

      <div className="my-tasks-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'active'}
          className={`my-tasks-tab ${filter === 'active' ? 'my-tasks-tab-selected' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'completed'}
          className={`my-tasks-tab ${filter === 'completed' ? 'my-tasks-tab-selected' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      {error && (
        <p className="my-tasks-error" role="alert">
          Could not load your tasks: {error}
        </p>
      )}

      {!error && requests === null && <p className="my-tasks-loading">Loading your tasks…</p>}

      {!error && requests !== null && filtered.length === 0 && (
        <div className="my-tasks-empty">
          <p className="my-tasks-empty-title">
            No {filter === 'active' ? 'active' : 'completed'} tasks
          </p>
          <p className="my-tasks-empty-note">
            {filter === 'active'
              ? "You'll see requests here once an administrator assigns one to you."
              : 'Tasks you resolve or close will appear here.'}
          </p>
        </div>
      )}

      {!error && filtered.length > 0 && (
        <ul className="my-tasks-list">
          {filtered.map((request) => {
            const Icon = categoryIcon(request.category?.name);
            return (
              <li key={request.requestId}>
                <Link to={`/tasks/${request.requestId}`} className="my-tasks-card">
                  <div className="my-tasks-card-top">
                    <span className="my-tasks-card-id">#REQ-{request.requestId}</span>
                    <span className={`my-tasks-status my-tasks-status-${request.status}`}>
                      {STATUS_LABELS[request.status] || request.status}
                    </span>
                  </div>
                  <p className="my-tasks-card-description">{request.description}</p>
                  <div className="my-tasks-card-bottom">
                    <span className="my-tasks-card-category">
                      <Icon width={16} height={16} />
                      {request.category?.name || 'Uncategorized'}
                    </span>
                    <span className="my-tasks-card-date">{formatDate(request.createdAt)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link to="/" className="my-tasks-back">
        &larr; Back to Home
      </Link>
    </main>
  );
}

export default MyTasks;
