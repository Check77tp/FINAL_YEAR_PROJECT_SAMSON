import { useEffect, useState } from 'react';
import { getAllFeedback } from '../../services/feedbackService';
import { StarIcon } from '../../components/icons';
import './AppFeedback.css';

const CATEGORY_LABELS = {
  general: 'General',
  suggestion: 'Suggestion',
  bug: 'Bug',
};

const FILTERS = ['all', 'bug', 'suggestion', 'general'];

// Administrator page: every review a student or technician has left about
// the app itself (separate from a technician's per-job rating - see
// ratings.repository.js for that). Read-only - there's nothing to action
// here beyond reading it.
function AppFeedback() {
  const [data, setData] = useState(() => getAllFeedback.peek() ?? null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getAllFeedback()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const items = data?.items || [];
  const visible = filter === 'all' ? items : items.filter((f) => f.category === filter);

  return (
    <main className="app-feedback">
      <header className="app-feedback-header">
        <h1 className="app-feedback-title">App Feedback</h1>
        <p className="app-feedback-subtitle">
          Reviews students and technicians have left about the app itself - a channel for feedback from people who
          don&rsquo;t have a direct line to the development team.
        </p>
      </header>

      {error && <p className="app-feedback-error" role="alert">Could not load feedback: {error}</p>}

      {data && (
        <div className="app-feedback-summary">
          <div className="app-feedback-summary-stat">
            <span className="app-feedback-summary-value">{data.averageRating ?? '—'}</span>
            <span className="app-feedback-summary-label">Average rating</span>
          </div>
          <div className="app-feedback-summary-stat">
            <span className="app-feedback-summary-value">{data.count}</span>
            <span className="app-feedback-summary-label">Total reviews</span>
          </div>
        </div>
      )}

      <div className="app-feedback-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`app-feedback-filter ${filter === f ? 'app-feedback-filter-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : CATEGORY_LABELS[f]}
          </button>
        ))}
      </div>

      {data === null && !error && <p className="app-feedback-muted">Loading…</p>}
      {data && visible.length === 0 && <p className="app-feedback-muted">No feedback in this category yet.</p>}

      <ul className="app-feedback-list">
        {visible.map((f) => (
          <li key={f.id} className="app-feedback-item">
            <div className="app-feedback-item-top">
              <div className="app-feedback-stars" aria-label={`Rated ${f.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} width={16} height={16} className={n <= f.rating ? 'app-feedback-star-filled' : ''} />
                ))}
              </div>
              <span className="app-feedback-chip">{CATEGORY_LABELS[f.category] || f.category}</span>
            </div>
            {f.message && <p className="app-feedback-item-message">{f.message}</p>}
            <p className="app-feedback-item-meta">
              {f.author ? `${f.author.name} (${f.author.role})` : 'A user'}
              {' · '}
              {new Date(f.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default AppFeedback;
