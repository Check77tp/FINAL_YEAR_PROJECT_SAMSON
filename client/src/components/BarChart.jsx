import './BarChart.css';

// Simple hand-rolled horizontal bar chart — no charting library needed for
// a handful of labeled counts (category breakdown, technician workload).
function BarChart({ items }) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <ul className="bar-chart">
      {items.map((item) => (
        <li key={item.label} className="bar-chart-row">
          <div className="bar-chart-row-top">
            <span className="bar-chart-label">{item.label}</span>
            <span className="bar-chart-value">{item.value}</span>
          </div>
          <div className="bar-chart-track">
            <div className="bar-chart-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default BarChart;
