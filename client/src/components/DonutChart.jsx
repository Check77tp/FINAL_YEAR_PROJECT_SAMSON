import './DonutChart.css';

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const COLORS = ['#2e7d32', '#006398', '#923357', '#c2410c', '#6d28d9'];

// admin_dashboard_unza_maintenance's "Issue Categories" ring chart — never
// built (AdminHome used the same BarChart as Reports & Analytics for this,
// which is why the two pages read as near-duplicates). Hand-rolled SVG, no
// charting library, matching BarChart/LineChart's existing pattern.
function DonutChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;

  return (
    <div className="donut-chart">
      <div className="donut-chart-ring">
        <svg viewBox="0 0 100 100" className="donut-chart-svg">
          <circle cx="50" cy="50" r={RADIUS} className="donut-chart-track" />
          {total > 0 &&
            items.map((item, i) => {
              const fraction = item.value / total;
              const dash = fraction * CIRCUMFERENCE;
              const offset = CIRCUMFERENCE * (1 - cumulative);
              cumulative += fraction;
              return (
                <circle
                  key={item.label}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth="16"
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  strokeDashoffset={offset}
                  transform="rotate(-90 50 50)"
                />
              );
            })}
        </svg>
        <div className="donut-chart-center">
          <span className="donut-chart-total">{total}</span>
          <span className="donut-chart-total-label">Total</span>
        </div>
      </div>

      <ul className="donut-chart-legend">
        {items.map((item, i) => (
          <li key={item.label}>
            <span className="donut-chart-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="donut-chart-legend-label">{item.label}</span>
            <span className="donut-chart-legend-pct">
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DonutChart;
