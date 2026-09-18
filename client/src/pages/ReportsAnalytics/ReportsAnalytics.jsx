import { useEffect, useState } from 'react';
import { getAnalytics } from '../../services/reportsService';
import { AVAILABILITY_LABELS } from '../../utils/requestFormat';
import BarChart from '../../components/BarChart';
import LineChart from '../../components/LineChart';
import './ReportsAnalytics.css';

function formatResolutionTime(hours) {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)}h`;
}

function formatRating(rating) {
  if (rating === null) return '—';
  return `${rating.toFixed(1)} / 5`;
}

function ReportsAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAnalytics()
      .then(setAnalytics)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="reports-analytics">
      <header className="reports-analytics-header">
        <h1 className="reports-analytics-title">Reports &amp; Analytics</h1>
        <p className="reports-analytics-subtitle">
          Performance oversight for hostel maintenance operations.
        </p>
      </header>

      {error && (
        <p className="reports-analytics-error" role="alert">
          Could not load analytics: {error}
        </p>
      )}

      {!error && !analytics && <p className="reports-analytics-loading">Loading analytics…</p>}

      {analytics && (
        <>
          <div className="reports-analytics-stats">
            <div className="reports-analytics-stat">
              <span className="reports-analytics-stat-label">Avg. Resolution Time</span>
              <span className="reports-analytics-stat-value">
                {formatResolutionTime(analytics.averageResolutionHours)}
              </span>
            </div>
            <div className="reports-analytics-stat">
              <span className="reports-analytics-stat-label">Requests This Month</span>
              <span className="reports-analytics-stat-value">{analytics.thisMonth.totalRequests}</span>
            </div>
            <div className="reports-analytics-stat">
              <span className="reports-analytics-stat-label">Resolved This Month</span>
              <span className="reports-analytics-stat-value">{analytics.thisMonth.resolved}</span>
            </div>
            <div className="reports-analytics-stat">
              <span className="reports-analytics-stat-label">Average Rating</span>
              <span className="reports-analytics-stat-value">{formatRating(analytics.averageRating)}</span>
            </div>
          </div>

          <section className="reports-analytics-section">
            <h2 className="reports-analytics-section-title">Resolution Trend (Last 7 Days)</h2>
            <p className="reports-analytics-section-note">Requests marked resolved, per day.</p>
            <LineChart points={analytics.resolutionTrend} />
          </section>

          <div className="reports-analytics-charts">
            <section className="reports-analytics-section">
              <h2 className="reports-analytics-section-title">Requests by Category</h2>
              {analytics.requestsByCategory.length > 0 ? (
                <BarChart
                  items={analytics.requestsByCategory.map((c) => ({ label: c.name, value: c.count }))}
                />
              ) : (
                <p className="reports-analytics-empty">No requests submitted yet.</p>
              )}
            </section>

            <section className="reports-analytics-section">
              <h2 className="reports-analytics-section-title">Requests by Hostel</h2>
              {analytics.requestsByHostel.length > 0 ? (
                <BarChart
                  items={analytics.requestsByHostel.map((h) => ({ label: h.name, value: h.count }))}
                />
              ) : (
                <p className="reports-analytics-empty">No requests submitted yet.</p>
              )}
            </section>

            <section className="reports-analytics-section">
              <h2 className="reports-analytics-section-title">Technician Workload</h2>
              <p className="reports-analytics-section-note">
                Requests currently assigned or in progress, per technician. Label shows their current
                availability status.
              </p>
              {analytics.workloadByTechnician.length > 0 ? (
                <BarChart
                  items={analytics.workloadByTechnician.map((t) => ({
                    label: `${t.name} (${AVAILABILITY_LABELS[t.availabilityStatus] || 'Unknown'})`,
                    value: t.activeRequests,
                  }))}
                />
              ) : (
                <p className="reports-analytics-empty">No technician accounts yet.</p>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}

export default ReportsAnalytics;
