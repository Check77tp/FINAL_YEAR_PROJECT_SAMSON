import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getMyRequests } from '../../services/requestsService';
import { useDraftSync } from '../../hooks/useDraftSync';
import { PlusIcon } from '../../components/icons';
import { STATUS_LABELS, PRIORITY_LABELS, categoryIcon, formatDate } from '../../utils/requestFormat';
import './MyRequests.css';
import { useLiveVersion } from '../../hooks/useLive';

// "Active" groups everything still moving through the lifecycle; "Resolved"
// groups the two terminal states. Matches the Active/Resolved toggle in the
// my_requests_unza_maintenance design.
const ACTIVE_STATUSES = ['open', 'assigned', 'in_progress'];

function MyRequests() {
  const liveVersion = useLiveVersion(); // refetch when the server reports a change
  // Seed from the API cache so the page renders instantly on repeat visits;
  // the fetch below still runs and refreshes it (stale-while-revalidate).
  const [requests, setRequests] = useState(() => getMyRequests.peek() ?? null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active');
  const { drafts } = useDraftSync();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  useEffect(() => {
    // Re-fetch whenever the draft queue changes — a draft disappearing
    // usually means useDraftSync just turned it into a real request. Clear
    // any previous error first: without this, a fetch attempt that failed
    // while offline leaves its error message on screen forever, even after
    // a later attempt (e.g. right after coming back online) succeeds.
    setError('');
    getMyRequests()
      .then(setRequests)
      .catch((err) => setError(err.message));
  }, [drafts, liveVersion]);

  // A search query searches across every request regardless of the
  // Active/Resolved tab — narrowing to one tab while searching would hide
  // results the tab excludes, which isn't what "search" implies.
  const filtered = query.trim()
    ? (requests || []).filter((request) => {
        const q = query.trim().toLowerCase();
        return (
          String(request.requestId).includes(q) ||
          request.description?.toLowerCase().includes(q) ||
          request.category?.name?.toLowerCase().includes(q)
        );
      })
    : (requests || []).filter((request) =>
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
        <Link to="/requests/new" className="my-requests-new">
          <PlusIcon width={18} height={18} />
          Report New Issue
        </Link>
      </header>

      {drafts.length > 0 && (
        <div className="my-requests-drafts">
          <p className="my-requests-drafts-title">
            {drafts.length} request{drafts.length > 1 ? 's' : ''} saved offline
          </p>
          <p className="my-requests-drafts-note">
            You were offline when you submitted these — they&rsquo;ll send automatically once
            you&rsquo;re back online. No need to resubmit.
          </p>
          <ul className="my-requests-drafts-list">
            {drafts.map((draft) => {
              const Icon = categoryIcon(draft.categoryName);
              return (
                <li key={draft.draftId} className="my-requests-draft-row">
                  <span className="my-requests-draft-category">
                    <Icon width={16} height={16} />
                    {draft.categoryName || 'Uncategorized'}
                  </span>
                  <p className="my-requests-draft-description">{draft.description}</p>
                  <span className="my-requests-draft-badge">Pending Sync</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {query.trim() && (
        <p className="my-requests-search-notice">
          Search results for &ldquo;{query}&rdquo; ({filtered.length}){' '}
          <button type="button" onClick={() => setSearchParams({})} className="my-requests-search-clear">
            Clear
          </button>
        </p>
      )}

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
            {query.trim()
              ? 'No requests match your search'
              : `No ${filter === 'active' ? 'active' : 'resolved'} requests yet`}
          </p>
          <p className="my-requests-empty-note">
            {query.trim()
              ? 'Try a different keyword, or clear the search.'
              : filter === 'active'
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
            <span>Location</span>
            <span>Priority</span>
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
                  {(request.hostel || request.room) && (
                    <span className="my-requests-row-location">
                      {[request.hostel, request.room].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {request.priority && (
                    <span className={`my-requests-priority my-requests-priority-${request.priority}`}>
                      {PRIORITY_LABELS[request.priority]}
                    </span>
                  )}
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
    </main>
  );
}

export default MyRequests;
