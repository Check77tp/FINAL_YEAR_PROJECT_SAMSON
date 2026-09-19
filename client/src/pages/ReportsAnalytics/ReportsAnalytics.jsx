import { useEffect, useState } from 'react';
import { getAnalytics } from '../../services/reportsService';
import { getAllRequests } from '../../services/requestsService';
import { AVAILABILITY_LABELS, STATUS_LABELS, PRIORITY_LABELS, formatDate } from '../../utils/requestFormat';
import { downloadCsv } from '../../utils/csv';
import BarChart from '../../components/BarChart';
import LineChart from '../../components/LineChart';
import { DownloadIcon, PrinterIcon } from '../../components/icons';
import './ReportsAnalytics.css';

const CSV_COLUMNS = [
  { key: 'requestId', label: 'Request ID' },
  { key: 'student', label: 'Student' },
  { key: 'studentId', label: 'Student ID' },
  { key: 'category', label: 'Category' },
  { key: 'hostel', label: 'Hostel' },
  { key: 'room', label: 'Room' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Date Reported' },
  { key: 'technician', label: 'Assigned Technician' },
];

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
  const [requests, setRequests] = useState(null);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    getAnalytics()
      .then(setAnalytics)
      .catch((err) => setError(err.message));
    getAllRequests()
      .then(setRequests)
      .catch(() => {});
  }, []);

  function handleExportCsv() {
    setExportError('');
    if (!requests || requests.length === 0) {
      setExportError('No requests to export yet.');
      return;
    }
    const rows = requests.map((r) => ({
      requestId: `REQ-${r.requestId}`,
      student: r.student?.name || '',
      studentId: r.student?.idNumber || '',
      category: r.category?.name || 'Uncategorized',
      hostel: r.hostel || '',
      room: r.room || '',
      priority: PRIORITY_LABELS[r.priority] || r.priority || '',
      status: STATUS_LABELS[r.status] || r.status,
      createdAt: formatDate(r.createdAt),
      technician: r.technician?.name || 'Unassigned',
    }));
    downloadCsv(`unza-maintenance-requests-${new Date().toISOString().slice(0, 10)}.csv`, CSV_COLUMNS, rows);
  }

  return (
    <main className="reports-analytics">
      <header className="reports-analytics-header">
        <div>
          <h1 className="reports-analytics-title">Reports &amp; Analytics</h1>
          <p className="reports-analytics-subtitle">
            Performance oversight for hostel maintenance operations.
          </p>
        </div>
        <div className="reports-analytics-export-actions">
          <button type="button" className="reports-analytics-export-button" onClick={handleExportCsv}>
            <DownloadIcon width={18} height={18} />
            Export CSV
          </button>
          <button
            type="button"
            className="reports-analytics-export-button"
            onClick={() => window.print()}
          >
            <PrinterIcon width={18} height={18} />
            Print / Save as PDF
          </button>
        </div>
      </header>

      {exportError && (
        <p className="reports-analytics-error" role="alert">
          {exportError}
        </p>
      )}

      <div className="reports-analytics-print-header">
        <h2>UNZA Hostel Maintenance — Reports &amp; Analytics</h2>
        <p>Generated {new Date().toLocaleString()}</p>
      </div>

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
