import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import './DonutChart.css';

// Slice colours reuse the project's semantic palette (green / blue / rose /
// orange / violet) so the chart matches the rest of the UI.
const COLORS = ['#2e7d32', '#006398', '#923357', '#c2410c', '#6d28d9'];

// Ring chart for the admin dashboard's "Issue Categories" widget
// (admin_dashboard_unza_maintenance). Built on Recharts so the slices sweep
// in on first render and highlight/tooltip on hover. `items` is
// [{ label, value }].
function DonutChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="donut-chart">
      <div className="donut-chart-ring">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              cornerRadius={4}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              animationDuration={900}
            >
              {items.map((item, i) => (
                <Cell key={item.label} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} request${value === 1 ? '' : 's'}`, name]} />
          </PieChart>
        </ResponsiveContainer>
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
