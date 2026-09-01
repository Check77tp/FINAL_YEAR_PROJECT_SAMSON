import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRequestDetail } from '../../services/requestsService';
import { STATUS_LABELS, categoryIcon } from '../../utils/requestFormat';
import RequestTimeline from '../../components/RequestTimeline';
import './RequestDetail.css';

// No websocket/push infrastructure in this stack (see CLAUDE.md's
// architecture) — "real-time" here means always fetching the current status
// fresh rather than trusting a stale cached copy: once on load, and again on
// demand via the Refresh control.
function RequestDetail() {
  const { requestId } = useParams();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getRequestDetail(requestId);
      setRequest(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLastCheckedAt(new Date());
    }
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (error && !request) {
    return (
      <main className="request-detail">
        <p className="request-detail-error" role="alert">
          Could not load this request: {error}
        </p>
        <Link to="/requests" className="request-detail-back">
          &larr; Back to My Requests
        </Link>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="request-detail">
        <p className="request-detail-loading">Loading request…</p>
      </main>
    );
  }

  const Icon = categoryIcon(request.category?.name);

  return (
    <main className="request-detail">
      <Link to="/requests" className="request-detail-back">
        &larr; Back to My Requests
      </Link>

      <header className="request-detail-header">
        <span className="request-detail-eyebrow">
          <Icon width={18} height={18} />
          {request.category?.name || 'Uncategorized'}
        </span>
        <h1 className="request-detail-title">#REQ-{request.requestId}</h1>
        <span className={`request-detail-status request-detail-status-${request.status}`}>
          {STATUS_LABELS[request.status] || request.status}
        </span>
      </header>

      <div className="request-detail-refresh-row">
        {lastCheckedAt && (
          <span className="request-detail-last-checked">
            Last checked {lastCheckedAt.toLocaleTimeString()}
          </span>
        )}
        <button
          type="button"
          className="request-detail-refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh Status'}
        </button>
      </div>

      {error && (
        <p className="request-detail-error" role="alert">
          Could not refresh: {error}
        </p>
      )}

      <section className="request-detail-section">
        <h2 className="request-detail-section-title">Assigned Technician</h2>
        <p className="request-detail-technician">
          {request.technician ? request.technician.name : 'Awaiting assignment'}
        </p>
      </section>

      <section className="request-detail-section">
        <h2 className="request-detail-section-title">Description</h2>
        <p className="request-detail-description">{request.description}</p>
      </section>

      <section className="request-detail-section">
        <h2 className="request-detail-section-title">Evidence Photos</h2>
        {request.photoUrl ? (
          <img src={request.photoUrl} alt="Issue evidence" className="request-detail-photo" />
        ) : (
          <p className="request-detail-no-photo">No photo attached.</p>
        )}
      </section>

      <section className="request-detail-section">
        <h2 className="request-detail-section-title">Status Timeline</h2>
        <RequestTimeline history={request.history} />
      </section>
    </main>
  );
}

export default RequestDetail;
