import { ResponsiveContainer, LineChart as RLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import './LineChart.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 7-day resolution trend. Built on Recharts for the axes, dashed grid,
// smooth curve, hover tooltip and the draw-in animation on first render.
// `points` is [{ date: 'YYYY-MM-DD', resolvedCount }].
function LineChart({ points }) {
  const data = points.map((p) => ({
    day: DAY_LABELS[new Date(`${p.date}T00:00:00Z`).getUTCDay()],
    resolved: p.resolvedCount,
  }));

  return (
    <div className="line-chart">
      <ResponsiveContainer width="100%" height={300}>
        <RLineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.5} />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} tickLine={false} />
          <Tooltip formatter={(value) => [`${value} resolved`, '']} separator="" />
          <Line
            type="monotone"
            dataKey="resolved"
            stroke="#006398"
            strokeWidth={3}
            dot={{ r: 3, fill: '#006398', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            animationDuration={1100}
          />
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LineChart;
