import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getMyRequests } from '../../services/requestsService';
import { STATUS_LABELS, categoryIcon, formatDate } from '../../utils/requestFormat';
import { PlusIcon, ClipboardListIcon, CheckCircleIcon } from '../../components/icons';
import StatCard from '../../components/StatCard';
import CommunityIssues from '../../components/CommunityIssues';
import AnnouncementBanner from '../../components/AnnouncementBanner';
import './StudentHome.css';
import { useLiveVersion } from '../../hooks/useLive';

// student_dashboard_unza_maintenance / home_unza_mobile reference. Trimmed
// to what the schema actually has: no hostel/room location, no "priority"
// stat (no priority field on maintenance_requests).
const ACTIVE_STATUSES = ['open', 'assigned', 'in_progress'];
const COMPLETED_STATUSES = ['resolved', 'closed'];

function StudentHome() {
  const liveVersion = useLiveVersion(); // refetch when the server reports a change
  const { user } = useAuth();
  const [requests, setRequests] = useState(() => getMyRequests.peek() ?? null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyRequests()
      .then(setRequests)
      .catch((err) => setError(err.message));
  }, [liveVersion]);

  const activeCount = (requests || []).filter((r) => ACTIVE_STATUSES.includes(r.status)).length;
  const completedCount = (requests || []).filter((r) => COMPLETED_STATUSES.includes(r.status)).length;
  const recent = (requests || []).slice(0, 3);

  return (
    <main className="student-home">
      <header className="student-home-header">
        <h1 className="student-home-title">Hello, {user?.name?.split(' ')[0]}!</h1>
        <p className="student-home-subtitle">
          Track your existing hostel issues or report new ones quickly.
        </p>
      </header>

      <AnnouncementBanner />

      <div className="student-home-stats">
        <StatCard icon={<ClipboardListIcon width={20} height={20} />} label="Active Requests" value={activeCount} tone="primary" />
        <StatCard icon={<CheckCircleIcon width={20} height={20} />} label="Completed" value={completedCount} tone="secondary" />
      </div>

      <Link to="/requests/new" className="student-home-new">
        <PlusIcon width={18} height={18} />
        Report New Issue
      </Link>

      <CommunityIssues />

      <section className="student-home-recent">
        <div className="student-home-recent-header">
          <h2 className="student-home-recent-title">Recent Requests</h2>
          <Link to="/requests" className="student-home-view-all">
            View All &rarr;
          </Link>
        </div>

        {error && (
          <p className="student-home-error" role="alert">
            Could not load your requests: {error}
          </p>
        )}
        {!error && requests === null && <p className="student-home-loading">Loading…</p>}
        {!error && requests !== null && recent.length === 0 && (
          <p className="student-home-empty">No requests yet — report an issue to get started.</p>
        )}

        {recent.length > 0 && (
          <ul className="student-home-recent-list">
            {recent.map((request) => {
              const Icon = categoryIcon(request.category?.name);
              return (
                <li key={request.requestId}>
                  <Link to={`/requests/${request.requestId}`} className="student-home-recent-card">
                    <span className="student-home-recent-icon">
                      <Icon width={18} height={18} />
                    </span>
                    <div className="student-home-recent-body">
                      <p className="student-home-recent-description">{request.description}</p>
                      <p className="student-home-recent-date">{formatDate(request.createdAt)}</p>
                    </div>
                    <span className={`student-home-status student-home-status-${request.status}`}>
                      {STATUS_LABELS[request.status] || request.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

export default StudentHome;
