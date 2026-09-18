import './LineChart.css';

const WIDTH = 300;
const HEIGHT = 80;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Simple hand-rolled line chart — no charting library needed for a 7-point
// trend. `points` is [{ date: 'YYYY-MM-DD', resolvedCount }].
function LineChart({ points }) {
  const max = Math.max(1, ...points.map((p) => p.resolvedCount));
  const stepX = points.length > 1 ? WIDTH / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = HEIGHT - (p.resolvedCount / max) * HEIGHT;
    return { x, y, ...p };
  });

  const linePath = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="line-chart-svg" preserveAspectRatio="none">
        <polyline points={linePath} className="line-chart-line" />
        {coords.map((c) => (
          <circle key={c.date} cx={c.x} cy={c.y} r="3" className="line-chart-dot" />
        ))}
      </svg>
      <div className="line-chart-labels">
        {points.map((p) => (
          <span key={p.date} className="line-chart-label">
            {DAY_LABELS[new Date(`${p.date}T00:00:00Z`).getUTCDay()]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default LineChart;
