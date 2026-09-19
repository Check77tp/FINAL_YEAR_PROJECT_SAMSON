import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getAllRequests, assignTechnician, updateRequestPriority } from '../../services/requestsService';
import { getTechnicians } from '../../services/usersService';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  PRIORITY_VALUES,
  AVAILABILITY_LABELS,
  categoryIcon,
} from '../../utils/requestFormat';
import './ManageRequests.css';

const FILTERS = ['all', 'open', 'assigned', 'in_progress', 'resolved', 'closed'];

function ManageRequests() {
  const [requests, setRequests] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selections, setSelections] = useState({});
  const [assigningId, setAssigningId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});
  const [updatingPriorityId, setUpdatingPriorityId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  useEffect(() => {
    Promise.all([getAllRequests(), getTechnicians()])
      .then(([requestsData, techniciansData]) => {
        setRequests(requestsData);
        setTechnicians(techniciansData);
      })
      .catch((err) => setError(err.message));
  }, []);

  const filtered = query.trim()
    ? (requests || []).filter((request) => {
        const q = query.trim().toLowerCase();
        return (
          String(request.requestId).includes(q) ||
          request.description?.toLowerCase().includes(q) ||
          request.category?.name?.toLowerCase().includes(q) ||
          request.student?.name?.toLowerCase().includes(q) ||
          request.student?.idNumber?.toLowerCase().includes(q)
        );
      })
    : (requests || []).filter((request) => filter === 'all' || request.status === filter);

  async function handleAssign(requestId) {
    const technicianId = selections[requestId];
    if (!technicianId) return;

    setAssigningId(requestId);
    setRowErrors((prev) => ({ ...prev, [requestId]: '' }));

    try {
      await assignTechnician(requestId, technicianId);
      const technician = technicians.find((t) => t.id === technicianId);
      setRequests((prev) =>
        prev.map((request) =>
          request.requestId === requestId ? { ...request, status: 'assigned', technician } : request
        )
      );
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [requestId]: err.message }));
    } finally {
      setAssigningId(null);
    }
  }

  async function handlePriorityChange(requestId, priority) {
    setUpdatingPriorityId(requestId);
    try {
      await updateRequestPriority(requestId, priority);
      setRequests((prev) =>
        prev.map((request) => (request.requestId === requestId ? { ...request, priority } : request))
      );
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [requestId]: err.message }));
    } finally {
      setUpdatingPriorityId(null);
    }
  }

  return (
    <main className="manage-requests">
      <header className="manage-requests-header">
        <h1 className="manage-requests-title">Manage Requests</h1>
        <p className="manage-requests-subtitle">
          Review incoming maintenance requests and assign them to a technician.
        </p>
      </header>

      {query.trim() && (
        <p className="manage-requests-search-notice">
          Search results for &ldquo;{query}&rdquo; ({filtered.length}){' '}
          <button
            type="button"
            onClick={() => setSearchParams({})}
            className="manage-requests-search-clear"
          >
            Clear
          </button>
        </p>
      )}

      <div className="manage-requests-tabs" role="tablist">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={filter === status}
            className={`manage-requests-tab ${filter === status ? 'manage-requests-tab-selected' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {error && (
        <p className="manage-requests-error" role="alert">
          Could not load requests: {error}
        </p>
      )}

      {!error && requests === null && (
        <p className="manage-requests-loading">Loading requests…</p>
      )}

      {!error && requests !== null && filtered.length === 0 && (
        <div className="manage-requests-empty">
          <p className="manage-requests-empty-title">
            {query.trim() ? 'No requests match your search' : 'No requests here'}
          </p>
          <p className="manage-requests-empty-note">
            {query.trim()
              ? 'Try a different keyword, or clear the search.'
              : filter === 'all'
              ? 'No maintenance requests have been submitted yet.'
              : `No requests with status "${STATUS_LABELS[filter]}".`}
          </p>
        </div>
      )}

      {!error && filtered.length > 0 && (
        <>
          <div className="manage-requests-list-header" aria-hidden="true">
            <span>Request ID</span>
            <span>Student</span>
            <span>Category</span>
            <span>Location</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Assign</span>
          </div>

          <ul className="manage-requests-list">
            {filtered.map((request) => {
              const Icon = categoryIcon(request.category?.name);
              return (
                <li key={request.requestId} className="manage-requests-row">
                  <Link
                    to={`/manage-requests/${request.requestId}`}
                    className="manage-requests-row-id"
                  >
                    #REQ-{request.requestId}
                  </Link>

                  <div className="manage-requests-row-student">
                    <span className="manage-requests-row-student-name">{request.student?.name}</span>
                    <span className="manage-requests-row-student-idnumber">
                      {request.student?.idNumber}
                    </span>
                  </div>

                  <span className="manage-requests-row-category">
                    <Icon width={18} height={18} />
                    {request.category?.name || 'Uncategorized'}
                  </span>

                  <span className="manage-requests-row-location">
                    {[request.hostel, request.room].filter(Boolean).join(', ') || '—'}
                  </span>

                  <select
                    className={`manage-requests-priority-select manage-requests-priority-${request.priority}`}
                    value={request.priority || 'medium'}
                    disabled={updatingPriorityId === request.requestId}
                    onChange={(event) => handlePriorityChange(request.requestId, event.target.value)}
                  >
                    {PRIORITY_VALUES.map((value) => (
                      <option key={value} value={value}>
                        {PRIORITY_LABELS[value]}
                      </option>
                    ))}
                  </select>

                  <span className={`manage-requests-status manage-requests-status-${request.status}`}>
                    {STATUS_LABELS[request.status] || request.status}
                  </span>

                  <div className="manage-requests-row-assign">
                    {request.status === 'open' ? (
                      <>
                        <div className="manage-requests-assign-control">
                          <select
                            value={selections[request.requestId] || ''}
                            onChange={(event) =>
                              setSelections((prev) => ({ ...prev, [request.requestId]: event.target.value }))
                            }
                            disabled={assigningId === request.requestId}
                          >
                            <option value="">Select technician</option>
                            {technicians.map((technician) => (
                              <option key={technician.id} value={technician.id}>
                                {technician.name}
                                {technician.availabilityStatus
                                  ? ` (${AVAILABILITY_LABELS[technician.availabilityStatus]})`
                                  : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="manage-requests-assign-button"
                            disabled={!selections[request.requestId] || assigningId === request.requestId}
                            onClick={() => handleAssign(request.requestId)}
                          >
                            {assigningId === request.requestId ? 'Assigning…' : 'Assign'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="manage-requests-row-tech">
                        {request.technician ? request.technician.name : '—'}
                        {request.technician?.availabilityStatus && (
                          <span
                            className={`manage-requests-availability manage-requests-availability-${request.technician.availabilityStatus}`}
                          >
                            {AVAILABILITY_LABELS[request.technician.availabilityStatus]}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {rowErrors[request.requestId] && (
                    <p className="manage-requests-row-error" role="alert">
                      {rowErrors[request.requestId]}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}

export default ManageRequests;
