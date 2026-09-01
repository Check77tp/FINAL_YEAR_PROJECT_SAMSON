import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyRequests } from '../../services/requestsService';
import { PlusIcon } from '../../components/icons';
import { STATUS_LABELS, categoryIcon, formatDate } from '../../utils/requestFormat';
import './MyRequests.css';

// "Active" groups everything still moving through the lifecycle; "Resolved"
// groups the two terminal states. Matches the Active/Resolved toggle in the
// my_requests_unza_maintenance design.
const ACTIVE_STATUSES = ['open', 'assigned', 'in_progress'];

function MyRequests() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    getMyRequests()
      .then(setRequests)
      .catch((err) => setError(err.message));
  }, []);

  const filtered = (requests || []).filter((request) =>
    filter === 'active'
      ? ACTIVE_STATUSES.includes(request.status)
      : !ACTIVE_STATUSES.includes(request.status)
  );

  return (
    <main className="my-requests">
      <header className="my-requests-header">
        <div>
          <h1 className="my-requests-title">My Maintenance Requests</h1>
          <p className="my-requests-subtitle">
            Track and manage your hostel maintenance reports in real-time.
          </p>
        </div>
        <span className="my-requests-new" title="Coming soon">
          <PlusIcon width={18} height={18} />
          Report New Issue
        </span>
      </header>

      <div className="my-requests-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'active'}
          className={`my-requests-tab ${filter === 'active' ? 'my-requests-tab-selected' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'resolved'}
          className={`my-requests-tab ${filter === 'resolved' ? 'my-requests-tab-selected' : ''}`}
          onClick={() => setFilter('resolved')}
        >
          Resolved
        </button>
      </div>

      {error && (
        <p className="my-requests-error" role="alert">
          Could not load your requests: {error}
        </p>
      )}

      {!error && requests === null && <p className="my-requests-loading">Loading your requests…</p>}

      {!error && requests !== null && filtered.length === 0 && (
        <div className="my-requests-empty">
          <p className="my-requests-empty-title">
            No {filter === 'active' ? 'active' : 'resolved'} requests yet
          </p>
          <p className="my-requests-empty-note">
            {filter === 'active'
              ? "Once you report an issue, it'll show up here so you can track its progress."
              : 'Resolved and closed requests will appear here.'}
          </p>
        </div>
      )}

      {!error && filtered.length > 0 && (
        <>
          <div className="my-requests-list-header" aria-hidden="true">
            <span>Ticket ID</span>
            <span>Category</span>
            <span>Date Reported</span>
            <span>Assigned Tech</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          <ul className="my-requests-list">
            {filtered.map((request) => {
              const Icon = categoryIcon(request.category?.name);
              return (
                <li key={request.requestId} className="my-requests-row">
                  <span className="my-requests-row-id">#REQ-{request.requestId}</span>
                  <span className={`my-requests-status my-requests-status-${request.status}`}>
                    {STATUS_LABELS[request.status] || request.status}
                  </span>
                  <p className="my-requests-row-description">{request.description}</p>
                  <span className="my-requests-row-category">
                    <Icon width={18} height={18} />
                    {request.category?.name || 'Uncategorized'}
                  </span>
                  <span className="my-requests-row-date">{formatDate(request.createdAt)}</span>
                  <span className="my-requests-row-tech">
                    {request.technician ? request.technician.name : 'Awaiting assignment'}
                  </span>
                  <Link to={`/requests/${request.requestId}`} className="my-requests-row-link">
                    View Details
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Link to="/" className="my-requests-back">
        &larr; Back to Home
      </Link>
    </main>
  );
}

export default MyRequests;
