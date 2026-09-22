import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRequestDetail, submitRating } from '../../services/requestsService';
import { STATUS_LABELS, PRIORITY_LABELS, AVAILABILITY_LABELS, categoryIcon } from '../../utils/requestFormat';
import { StarIcon, MapPinIcon } from '../../components/icons';
import RequestTimeline from '../../components/RequestTimeline';
import AffectedBadge from '../../components/AffectedBadge';
import ResolutionProof from '../../components/ResolutionProof';
import './RequestDetail.css';
import { useLiveVersion } from '../../hooks/useLive';

const RATABLE_STATUSES = ['resolved', 'closed'];

// No websocket/push infrastructure in this stack (see CLAUDE.md's
// architecture) — "real-time" here means always fetching the current status
// fresh rather than trusting a stale cached copy: once on load, and again on
// demand via the Refresh control.
function RequestDetail() {
  const liveVersion = useLiveVersion(); // refetch when the server reports a change
  const { requestId } = useParams();
  const [request, setRequest] = useState(() => getRequestDetail.peek(requestId) ?? null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [hoverStars, setHoverStars] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState('');

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
  }, [load, liveVersion]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleRateStar(stars) {
    if (submittingRating) return;
    setSubmittingRating(true);
    setRatingError('');
    try {
      const rating = await submitRating(requestId, stars);
      setRequest((prev) => ({ ...prev, rating }));
    } catch (err) {
      setRatingError(err.message);
    } finally {
      setSubmittingRating(false);
    }
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
        <div className="request-detail-badges">
          <span className={`request-detail-status request-detail-status-${request.status}`}>
            {STATUS_LABELS[request.status] || request.status}
          </span>
          {request.priority && (
            <span className={`request-detail-priority request-detail-priority-${request.priority}`}>
              {PRIORITY_LABELS[request.priority] || request.priority} Priority
            </span>
          )}
          <AffectedBadge count={request.upvoteCount} />
        </div>
        {(request.hostel || request.room) && (
          <span className="request-detail-location">
            <MapPinIcon width={16} height={16} />
            {[request.hostel, request.room].filter(Boolean).join(', ')}
          </span>
        )}
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
          {request.technician?.availabilityStatus && (
            <span
              className={`request-detail-availability request-detail-availability-${request.technician.availabilityStatus}`}
            >
              {AVAILABILITY_LABELS[request.technician.availabilityStatus]}
            </span>
          )}
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

      {request.resolution && (
        <section className="request-detail-section">
          <h2 className="request-detail-section-title">Work Completed</h2>
          <ResolutionProof resolution={request.resolution} />
        </section>
      )}

      <section className="request-detail-section">
        <h2 className="request-detail-section-title">Status Timeline</h2>
        <RequestTimeline history={request.history} />
      </section>

      {RATABLE_STATUSES.includes(request.status) && (
        <section className="request-detail-section">
          <h2 className="request-detail-section-title">Rate This Repair</h2>
          {request.rating ? (
            <div className="request-detail-rating-given">
              <div className="request-detail-stars" aria-label={`Rated ${request.rating.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon
                    key={n}
                    width={22}
                    height={22}
                    className={n <= request.rating.rating ? 'request-detail-star-filled' : ''}
                  />
                ))}
              </div>
              <p className="request-detail-rating-note">Thanks for your feedback.</p>
            </div>
          ) : (
            <>
              <p className="request-detail-rating-prompt">How was this repair handled?</p>
              <div
                className="request-detail-stars request-detail-stars-interactive"
                onMouseLeave={() => setHoverStars(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="request-detail-star-button"
                    disabled={submittingRating}
                    onMouseEnter={() => setHoverStars(n)}
                    onClick={() => handleRateStar(n)}
                    aria-label={`Rate ${n} out of 5`}
                  >
                    <StarIcon
                      width={26}
                      height={26}
                      className={n <= hoverStars ? 'request-detail-star-filled' : ''}
                    />
                  </button>
                ))}
              </div>
              {ratingError && (
                <p className="request-detail-error" role="alert">
                  {ratingError}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}

export default RequestDetail;
