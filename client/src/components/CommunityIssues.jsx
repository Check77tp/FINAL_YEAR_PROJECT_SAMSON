import { useEffect, useState } from 'react';
import { getCommunityRequests } from '../services/requestsService';
import { STATUS_LABELS, categoryIcon } from '../utils/requestFormat';
import UpvoteButton from './UpvoteButton';
import './CommunityIssues.css';
import { useLiveVersion } from '../hooks/useLive';

// Horizontal, swipeable strip of issues other students have already reported
// in the student's hostel. The point is deduplication: if your problem is
// already here, tap "Me too" instead of filing another request — the count
// tells administrators how many people it affects.
function CommunityIssues() {
  const liveVersion = useLiveVersion(); // refetch when the server reports a change
  const [feed, setFeed] = useState(() => getCommunityRequests.peek() ?? null);
  const [error, setError] = useState('');

  useEffect(() => {
    getCommunityRequests()
      .then(setFeed)
      .catch((err) => setError(err.message));
  }, [liveVersion]);

  function updateItem(requestId, patch) {
    setFeed((prev) => ({
      ...prev,
      requests: prev.requests.map((r) => (r.requestId === requestId ? { ...r, ...patch } : r)),
    }));
  }

  // Always render the section (even when empty or failing) so the feature is
  // discoverable and problems are visible rather than silently hidden.
  const isEmpty = feed && feed.requests.length === 0;
  const hostelLabel = feed?.hostel ? ` in ${feed.hostel}` : '';

  return (
    <section className="community-issues" aria-labelledby="community-issues-title">
      <div className="community-issues-header">
        <h2 className="community-issues-title" id="community-issues-title">
          Already reported{hostelLabel}
        </h2>
        <p className="community-issues-note">
          Same problem? Tap &ldquo;Me too&rdquo; instead of filing a new request. Problems backed by
          30 or more students are shown to everyone.
        </p>
      </div>

      {error && (
        <p className="community-issues-empty" role="alert">
          Could not load reported issues: {error}
        </p>
      )}
      {!error && feed === null && <p className="community-issues-empty">Loading…</p>}
      {!error && isEmpty && (
        <p className="community-issues-empty">
          Nothing reported by other students{hostelLabel || ' yet'} right now. When someone else
          reports a problem, it will show up here so you can back it with &ldquo;Me too&rdquo;.
        </p>
      )}

      <ul className="community-issues-strip">
        {(feed?.requests || []).map((item) => {
          const Icon = categoryIcon(item.category?.name);
          return (
            <li key={item.requestId} className="community-issues-tile">
              <div className="community-issues-tile-top">
                <span className="community-issues-category">
                  <Icon width={16} height={16} />
                  {item.category?.name || 'Other'}
                </span>
                <span className={`community-issues-status community-issues-status-${item.status}`}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </div>
              {item.hostel && item.hostel !== feed.hostel && (
                <span className="community-issues-elsewhere">
                  Widespread &middot; also affecting {item.hostel}
                </span>
              )}
              <p className="community-issues-description">{item.description}</p>
              <UpvoteButton item={item} onChange={(patch) => updateItem(item.requestId, patch)} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default CommunityIssues;
