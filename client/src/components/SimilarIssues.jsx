import { useEffect, useState } from 'react';
import { getCommunityRequests } from '../services/requestsService';
import UpvoteButton from './UpvoteButton';
import './SimilarIssues.css';

// Shown on the request form once a category and hostel are chosen: if other
// students have already reported the same kind of issue in that hostel, offer
// "Me too" before the student files a duplicate. Purely advisory — the student
// can still submit their own request.
function SimilarIssues({ hostel, categoryId }) {
  const [feed, setFeed] = useState(null);

  useEffect(() => {
    if (!hostel) return undefined;
    let cancelled = false;
    getCommunityRequests(hostel)
      .then((data) => {
        if (!cancelled) setFeed({ hostel, requests: data.requests });
      })
      .catch(() => {}); // advisory widget: fail silently
    return () => {
      cancelled = true;
    };
  }, [hostel]);

  function updateItem(requestId, patch) {
    setFeed((prev) => ({
      ...prev,
      requests: prev.requests.map((r) => (r.requestId === requestId ? { ...r, ...patch } : r)),
    }));
  }

  if (!hostel || !categoryId || !feed || feed.hostel !== hostel) return null;

  const similar = feed.requests.filter((r) => r.category?.id === categoryId).slice(0, 3);
  if (similar.length === 0) return null;

  return (
    <aside className="similar-issues" aria-live="polite">
      <h3 className="similar-issues-title">Already reported in {hostel}</h3>
      <p className="similar-issues-note">
        Is one of these your problem? Tap &ldquo;Me too&rdquo; and skip the new request.
      </p>
      <ul className="similar-issues-list">
        {similar.map((item) => (
          <li key={item.requestId} className="similar-issues-item">
            <span className="similar-issues-description">{item.description}</span>
            <UpvoteButton item={item} onChange={(patch) => updateItem(item.requestId, patch)} />
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default SimilarIssues;
