import { useEffect, useState } from 'react';
import { getMyPerformance } from '../services/reportsService';
import { formatDuration } from './TechnicianPerformance';
import { StarIcon } from './icons';
import { useLiveVersion } from '../hooks/useLive';
import './MyPerformance.css';

// The technician's own scorecard for the last 30 days. Purely motivating: it
// shows your numbers and your position, not other people's details.
function MyPerformance() {
  const liveVersion = useLiveVersion();
  const [data, setData] = useState(() => getMyPerformance.peek(30) ?? null);

  useEffect(() => {
    getMyPerformance(30)
      .then(setData)
      .catch(() => {}); // a scorecard failing must never block the task list
  }, [liveVersion]);

  const p = data?.performance;
  if (!p) return null;

  const stats = [
    { label: 'Resolved', value: p.resolved },
    { label: 'Avg. time', value: formatDuration(p.avgResolutionHours) },
    { label: 'On time', value: p.onTimeRate === null ? '—' : `${p.onTimeRate}%` },
    {
      label: 'Rating',
      value: p.avgRating === null ? '—' : (
        <span className="my-performance-rating">
          <StarIcon width={16} height={16} />
          {p.avgRating.toFixed(1)}
        </span>
      ),
    },
  ];

  return (
    <section className="my-performance">
      <div className="my-performance-header">
        <h2 className="my-performance-title">My Performance</h2>
        <span className="my-performance-window">Last 30 days</span>
      </div>

      <ul className="my-performance-stats">
        {stats.map((s) => (
          <li key={s.label} className="my-performance-stat">
            <span className="my-performance-value">{s.value}</span>
            <span className="my-performance-label">{s.label}</span>
          </li>
        ))}
      </ul>

      {data.rank && data.outOf > 1 && p.resolved > 0 && (
        <p className="my-performance-rank">
          You are <strong>#{data.rank}</strong> of {data.outOf} technicians by jobs resolved. Keep it up!
        </p>
      )}
      {p.overdueNow > 0 && (
        <p className="my-performance-warning">
          {p.overdueNow} of your jobs {p.overdueNow === 1 ? 'is' : 'are'} overdue — tackling {p.overdueNow === 1 ? 'it' : 'them'} first helps your on-time rate.
        </p>
      )}
    </section>
  );
}

export default MyPerformance;
