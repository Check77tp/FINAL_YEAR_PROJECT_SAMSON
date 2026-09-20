import { useEffect, useState } from 'react';
import { getCommunityRequests } from '../services/requestsService';
import { STATUS_LABELS, categoryIcon } from '../utils/requestFormat';
import UpvoteButton from './UpvoteButton';
import './CommunityIssues.css';

// Horizontal, swipeable strip of issues other students have already reported
// in the student's hostel. The point is deduplication: if your problem is
// already here, tap "Me too" instead of filing another request — the count
// tells administrators how many people it affects.
function CommunityIssues() {
  const [feed, setFeed] = useState(() => getCommunityRequests.peek() ?? null);
  const [error, setError] = useState('');

  useEffect(() => {
    getCommunityRequests()
      .then(setFeed)
      .catch((err) => setError(err.message));
  }, []);

  function updateItem(requestId, patch) {
    setFeed((prev) => ({
      ...prev,
      requests: prev.requests.map((r) => (r.requestId === requestId ? { ...r, ...patch } : r)),
    }));
  }

  if (error) return null; // a broken side widget shouldn't clutter the dashboard
  if (!feed || feed.requests.length === 0) return null;

  return (
    <section className="community-issues" aria-labelledby="community-issues-title">
      <div className="community-issues-header">
        <h2 className="community-issues-title" id="community-issues-title">
          Already reported{feed.hostel ? ` in ${feed.hostel}` : ''}
        </h2>
        <p className="community-issues-note">
          Same problem? Tap &ldquo;Me too&rdquo; instead of filing a new request.
        </p>
      </div>

      <ul className="community-issues-strip">
        {feed.requests.map((item) => {
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
