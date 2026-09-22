import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecurringIssues } from '../services/reportsService';
import { categoryIcon } from '../utils/requestFormat';
import { useLiveVersion } from '../hooks/useLive';
import './RecurringIssues.css';

// "Needs a permanent fix": faults that keep coming back to the same room or
// building (see server/src/services/recurrence.service.js). `limit` shortens
// the list for the dashboard.
function RecurringIssues({ limit, showLink = false }) {
  const liveVersion = useLiveVersion();
  const [issues, setIssues] = useState(() => getRecurringIssues.peek() ?? null);
  const [error, setError] = useState('');

  useEffect(() => {
    getRecurringIssues()
      .then(setIssues)
      .catch((err) => setError(err.message));
  }, [liveVersion]);

  const shown = issues ? (limit ? issues.slice(0, limit) : issues) : null;

  return (
    <section className="recurring-issues">
      <div className="recurring-issues-header">
        <div>
          <h2 className="recurring-issues-title">Needs a Permanent Fix</h2>
          <p className="recurring-issues-note">
            Faults that keep coming back to the same room (3+ in 60 days) or building (6+ in 30 days).
          </p>
        </div>
        {showLink && issues && issues.length > limit && (
          <Link to="/reports" className="recurring-issues-link">
            See all {issues.length} &rarr;
          </Link>
        )}
      </div>

      {error && <p className="recurring-issues-error" role="alert">Could not load: {error}</p>}
      {shown === null && !error && <p className="recurring-issues-muted">Analysing…</p>}
      {shown && shown.length === 0 && (
        <p className="recurring-issues-muted">
          No repeating problems detected. Nothing is coming back more often than it should.
        </p>
      )}

      <ul className="recurring-issues-list">
        {(shown || []).map((issue) => {
          const Icon = categoryIcon(issue.category.name);
          return (
            <li
              key={`${issue.scope}-${issue.hostel}-${issue.room}-${issue.category.id}`}
              className={`recurring-issues-item recurring-issues-item-${issue.severity}`}
            >
              <span className="recurring-issues-icon"><Icon width={20} height={20} /></span>
              <div className="recurring-issues-body">
                <p className="recurring-issues-heading">
                  {issue.category.name} &middot; {issue.hostel}
                  {issue.room ? `, ${issue.room}` : ' (whole building)'}
                  <span className={`recurring-issues-badge recurring-issues-badge-${issue.severity}`}>
                    {issue.count} in {issue.windowDays} days
                  </span>
                </p>
                <p className="recurring-issues-suggestion">{issue.suggestion}</p>
                <p className="recurring-issues-meta">
                  Requests {issue.requestIds.map((id) => `#${id}`).join(', ')}
                  {issue.openCount > 0 ? ` · ${issue.openCount} still open` : ''}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default RecurringIssues;
