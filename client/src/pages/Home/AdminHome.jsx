import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAllRequests } from '../../services/requestsService';
import { getAnalytics } from '../../services/reportsService';
import { STATUS_LABELS, PRIORITY_LABELS, categoryIcon, formatDate } from '../../utils/requestFormat';
import DonutChart from '../../components/DonutChart';
import LineChart from '../../components/LineChart';
import './AdminHome.css';

function formatResolutionTime(hours) {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)}h`;
}

// admin_dashboard_unza_maintenance reference. This is a welcome/overview
// glance, not a duplicate of the full Reports & Analytics page — the deeper
// breakdowns (per-hostel chart, resolution trend line, technician workload +
// availability, average rating) live there instead of being duplicated
// here. The category breakdown uses the mockup's original ring chart
// (DonutChart) rather than Reports' bar chart, so the two pages read as
// distinct at a glance rather than near-duplicates.
function AdminHome() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(() => getAnalytics.peek() ?? null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [requests, setRequests] = useState(() => getAllRequests.peek() ?? null);
  const [requestsError, setRequestsError] = useState('');

  useEffect(() => {
    getAnalytics()
      .then(setAnalytics)
      .catch((err) => setAnalyticsError(err.message));
    getAllRequests()
      .then(setRequests)
      .catch((err) => setRequestsError(err.message));
  }, []);

  // Most urgent first — a "needs attention" list that isn't priority-sorted
  // isn't actually surfacing what needs attention.
  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const needsAttention = (requests || [])
    .filter((r) => r.status === 'open')
    .slice()
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4))
    .slice(0, 3);

  return (
    <main className="admin-home">
      <header className="admin-home-header">
        <h1 className="admin-home-title">Maintenance Overview</h1>
        <p className="admin-home-subtitle">
          Welcome back, {user?.name?.split(' ')[0]} — here&rsquo;s the current state of hostel
          maintenance operations.
        </p>
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

          <div className="admin-home-charts">
            {analytics.requestsByCategory.length > 0 && (
              <section className="admin-home-section admin-home-donut-section">
                <h2 className="admin-home-section-title">Issue Categories</h2>
                <DonutChart
                  items={analytics.requestsByCategory.map((c) => ({ label: c.name, value: c.count }))}
                />
              </section>
            )}

            <section className="admin-home-section">
              <h2 className="admin-home-section-title">Resolution Trend</h2>
              <p className="admin-home-section-note">Requests resolved per day, last 7 days.</p>
              <LineChart points={analytics.resolutionTrend} />
            </section>
          </div>
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
                  {request.priority && (
                    <span className={`admin-home-priority admin-home-priority-${request.priority}`}>
                      {PRIORITY_LABELS[request.priority]}
                    </span>
                  )}
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
