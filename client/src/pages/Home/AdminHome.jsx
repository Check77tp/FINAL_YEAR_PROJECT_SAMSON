import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAllRequests } from '../../services/requestsService';
import { getAnalytics } from '../../services/reportsService';
import { STATUS_LABELS, categoryIcon, formatDate } from '../../utils/requestFormat';
import BarChart from '../../components/BarChart';
import './AdminHome.css';

function formatResolutionTime(hours) {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)}h`;
}

// admin_dashboard_unza_maintenance reference. This is a welcome/overview
// glance, not a duplicate of the full Reports & Analytics page — trimmed to
// what's real: no per-hostel breakdown (no location field), no response-time
// trend line (no daily time-series tracking), no system activity log (no
// audit log table), no technician "deployed" status.
function AdminHome() {
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [requests, setRequests] = useState(null);
  const [requestsError, setRequestsError] = useState('');

  useEffect(() => {
    getAnalytics()
      .then(setAnalytics)
      .catch((err) => setAnalyticsError(err.message));
    getAllRequests()
      .then(setRequests)
      .catch((err) => setRequestsError(err.message));
  }, []);

  const needsAttention = (requests || []).filter((r) => r.status === 'open').slice(0, 3);

  return (
    <main className="admin-home">
      <header className="admin-home-header">
        <div>
          <h1 className="admin-home-title">Maintenance Overview</h1>
          <p className="admin-home-subtitle">
            Welcome back, {user?.name?.split(' ')[0]} — here&rsquo;s the current state of hostel
            maintenance operations.
          </p>
        </div>
        <button type="button" className="admin-home-logout" onClick={logout}>
          Log Out
        </button>
      </header>

      {analyticsError && (
        <p className="admin-home-error" role="alert">
          Could not load overview stats: {analyticsError}
        </p>
      )}

      {analytics && (
        <>
          <div className="admin-home-stats">
            <div className="admin-home-stat">
              <span className="admin-home-stat-label">Avg. Resolution Time</span>
              <span className="admin-home-stat-value">
                {formatResolutionTime(analytics.averageResolutionHours)}
              </span>
            </div>
            <div className="admin-home-stat">
              <span className="admin-home-stat-label">Requests This Month</span>
              <span className="admin-home-stat-value">{analytics.thisMonth.totalRequests}</span>
            </div>
            <div className="admin-home-stat">
              <span className="admin-home-stat-label">Resolved This Month</span>
              <span className="admin-home-stat-value">{analytics.thisMonth.resolved}</span>
            </div>
          </div>

          {analytics.requestsByCategory.length > 0 && (
            <section className="admin-home-section">
              <h2 className="admin-home-section-title">Requests by Category</h2>
              <BarChart
                items={analytics.requestsByCategory.map((c) => ({ label: c.name, value: c.count }))}
              />
            </section>
          )}
        </>
      )}

      <div className="admin-home-links">
        <Link to="/manage-requests" className="admin-home-link admin-home-link-primary">
          Manage Requests
        </Link>
        <Link to="/reports" className="admin-home-link">
          Reports &amp; Analytics
        </Link>
      </div>

      <section className="admin-home-section">
        <div className="admin-home-section-header">
          <h2 className="admin-home-section-title">Needs Attention</h2>
          <Link to="/manage-requests" className="admin-home-view-all">
            View All &rarr;
          </Link>
        </div>
        <p className="admin-home-section-note">Open requests not yet assigned to a technician.</p>

        {requestsError && (
          <p className="admin-home-error" role="alert">
            Could not load requests: {requestsError}
          </p>
        )}
        {!requestsError && requests === null && <p className="admin-home-loading">Loading…</p>}
        {!requestsError && requests !== null && needsAttention.length === 0 && (
          <p className="admin-home-empty">Nothing needs attention right now — all caught up.</p>
        )}

        {needsAttention.length > 0 && (
          <ul className="admin-home-request-list">
            {needsAttention.map((request) => {
              const Icon = categoryIcon(request.category?.name);
              return (
                <li key={request.requestId} className="admin-home-request-row">
                  <span className="admin-home-request-id">#REQ-{request.requestId}</span>
                  <span className="admin-home-request-category">
                    <Icon width={16} height={16} />
                    {request.category?.name || 'Uncategorized'}
                  </span>
                  <span className="admin-home-request-student">{request.student?.name}</span>
                  <span className={`admin-home-status admin-home-status-${request.status}`}>
                    {STATUS_LABELS[request.status] || request.status}
                  </span>
                  <span className="admin-home-request-date">{formatDate(request.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

export default AdminHome;
