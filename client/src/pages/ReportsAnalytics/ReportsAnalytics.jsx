import { useEffect, useState } from 'react';
import { getAnalytics } from '../../services/reportsService';
import BarChart from '../../components/BarChart';
import './ReportsAnalytics.css';

function formatResolutionTime(hours) {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)}h`;
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
          </div>

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
              <h2 className="reports-analytics-section-title">Technician Workload</h2>
              <p className="reports-analytics-section-note">
                Requests currently assigned or in progress, per technician.
              </p>
              {analytics.workloadByTechnician.length > 0 ? (
                <BarChart
                  items={analytics.workloadByTechnician.map((t) => ({ label: t.name, value: t.activeRequests }))}
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
