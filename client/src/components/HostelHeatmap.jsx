import { useMemo, useState } from 'react';
import './HostelHeatmap.css';

const ACTIVE_STATUSES = ['open', 'assigned', 'in_progress'];

// Turns a flat request list into a hostel x category grid of counts.
// Rows are sorted busiest-first so the worst hostel is at the top.
function buildGrid(requests) {
  const categories = new Set();
  const counts = new Map(); // hostel -> Map(category -> n)
  for (const r of requests) {
    const hostel = r.hostel || 'Unspecified';
    const category = r.category?.name || 'Uncategorized';
    categories.add(category);
    if (!counts.has(hostel)) counts.set(hostel, new Map());
    const row = counts.get(hostel);
    row.set(category, (row.get(category) || 0) + 1);
  }

  const categoryList = [...categories].sort();
  const rows = [...counts.entries()]
    .map(([hostel, row]) => ({
      hostel,
      cells: categoryList.map((c) => row.get(c) || 0),
      total: [...row.values()].reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total || a.hostel.localeCompare(b.hostel));

  const max = Math.max(0, ...rows.flatMap((r) => r.cells));
  return { categoryList, rows, max };
}

// Admin analytics: where do problems cluster? Darker cell = more requests of
// that category in that hostel. Answers "which hostel needs attention, and
// with what" at a glance — the input for planning maintenance rounds.
function HostelHeatmap({ requests }) {
  const [scope, setScope] = useState('all'); // 'all' | 'active'

  const grid = useMemo(() => {
    const scoped = scope === 'active' ? requests.filter((r) => ACTIVE_STATUSES.includes(r.status)) : requests;
    return buildGrid(scoped);
  }, [requests, scope]);

  const top = grid.rows[0];
  const topCategoryIndex = top ? top.cells.indexOf(Math.max(...top.cells)) : -1;

  return (
    <section className="hostel-heatmap">
      <div className="hostel-heatmap-header">
        <div>
          <h2 className="hostel-heatmap-title">Hostel Hotspots</h2>
          <p className="hostel-heatmap-note">
            Requests by hostel and category — darker means more.
          </p>
        </div>
        <div className="hostel-heatmap-scope" role="radiogroup" aria-label="Which requests to include">
          {[
            ['all', 'All time'],
            ['active', 'Still open'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={scope === value}
              className={`hostel-heatmap-scope-option ${scope === value ? 'hostel-heatmap-scope-selected' : ''}`}
              onClick={() => setScope(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {grid.rows.length === 0 ? (
        <p className="hostel-heatmap-empty">
          {scope === 'active' ? 'No open requests right now.' : 'No requests submitted yet.'}
        </p>
      ) : (
        <>
          <p className="hostel-heatmap-insight">
            <strong>{top.hostel}</strong> has the most {scope === 'active' ? 'open ' : ''}requests (
            {top.total}), mostly <strong>{grid.categoryList[topCategoryIndex]}</strong> (
            {top.cells[topCategoryIndex]}).
          </p>

          <div className="hostel-heatmap-scroll">
            <table className="hostel-heatmap-table">
              <thead>
                <tr>
                  <th scope="col" className="hostel-heatmap-corner">Hostel</th>
                  {grid.categoryList.map((c) => (
                    <th key={c} scope="col">{c}</th>
                  ))}
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((row, rowIndex) => (
                  <tr key={row.hostel}>
                    <th scope="row" className="hostel-heatmap-rowhead">{row.hostel}</th>
                    {row.cells.map((n, i) => {
                      const heat = grid.max ? n / grid.max : 0;
                      return (
                        <td
                          key={grid.categoryList[i]}
                          className={`hostel-heatmap-cell ${heat > 0.55 ? 'hostel-heatmap-cell-hot' : ''}`}
                          style={{ '--heat': heat, animationDelay: `${rowIndex * 60 + i * 30}ms` }}
                          title={`${row.hostel} · ${grid.categoryList[i]}: ${n}`}
                        >
                          {n || ''}
                        </td>
                      );
                    })}
                    <td className="hostel-heatmap-total">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default HostelHeatmap;
