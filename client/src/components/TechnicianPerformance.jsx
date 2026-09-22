import { useEffect, useState } from 'react';
import { getTechnicianPerformance } from '../services/reportsService';
import { AVAILABILITY_LABELS } from '../utils/requestFormat';
import { StarIcon } from './icons';
import { useLiveVersion } from '../hooks/useLive';
import './TechnicianPerformance.css';

const WINDOWS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 0, label: 'All time' },
];

export function formatDuration(hours) {
  if (hours === null || hours === undefined) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

// Admin table: how each technician is doing over a time window - jobs
// resolved, average time, share finished within the SLA target, jobs on hand,
// and students' ratings.
function TechnicianPerformance() {
  const liveVersion = useLiveVersion();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(() => getTechnicianPerformance.peek(30) ?? null);
  const [error, setError] = useState('');

  useEffect(() => {
    getTechnicianPerformance(days)
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [days, liveVersion]);

  const rows = data?.technicians || [];
  const top = rows[0]?.resolved > 0 ? rows[0] : null;

  return (
    <section className="technician-performance">
      <div className="technician-performance-header">
        <div>
          <h2 className="technician-performance-title">Technician Performance</h2>
          <p className="technician-performance-note">
            Time is counted from when the job was assigned. &ldquo;On time&rdquo; means resolved within the
            request&rsquo;s target (critical 4h, high 24h, medium 72h, low 1 week).
          </p>
        </div>
        <div className="technician-performance-windows" role="radiogroup" aria-label="Time window">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              role="radio"
              aria-checked={days === w.value}
              className={`technician-performance-window ${days === w.value ? 'technician-performance-window-on' : ''}`}
              onClick={() => setDays(w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="technician-performance-error" role="alert">{error}</p>}
      {!data && !error && <p className="technician-performance-muted">Loading…</p>}
      {data && rows.length === 0 && <p className="technician-performance-muted">No technician accounts yet.</p>}

      {top && (
        <p className="technician-performance-top">
          Most jobs resolved: <strong>{top.name}</strong> ({top.resolved})
        </p>
      )}

      {rows.length > 0 && (
        <div className="technician-performance-scroll">
          <table className="technician-performance-table">
            <thead>
              <tr>
                <th scope="col">Technician</th>
                <th scope="col">Resolved</th>
                <th scope="col">Avg. time</th>
                <th scope="col">On time</th>
                <th scope="col">On hand</th>
                <th scope="col">Overdue</th>
                <th scope="col">Rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <th scope="row" className="technician-performance-name">
                    {t.name}
                    <span className={`technician-performance-status technician-performance-status-${t.availabilityStatus}`}>
                      {AVAILABILITY_LABELS[t.availabilityStatus] || ''}
                    </span>
                  </th>
                  <td className="technician-performance-strong">{t.resolved}</td>
                  <td>{formatDuration(t.avgResolutionHours)}</td>
                  <td>
                    {t.onTimeRate === null ? (
                      '—'
                    ) : (
                      <span className="technician-performance-bar" title={`${t.onTimeRate}% resolved on time`}>
                        <span className="technician-performance-bar-fill" style={{ width: `${t.onTimeRate}%` }} />
                        <span className="technician-performance-bar-label">{t.onTimeRate}%</span>
                      </span>
                    )}
                  </td>
                  <td>{t.active}</td>
                  <td className={t.overdueNow > 0 ? 'technician-performance-alert' : ''}>{t.overdueNow}</td>
                  <td>
                    {t.avgRating === null ? (
                      '—'
                    ) : (
                      <span className="technician-performance-rating">
                        <StarIcon width={14} height={14} />
                        {t.avgRating.toFixed(1)}
                        <small> ({t.ratingCount})</small>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default TechnicianPerformance;
