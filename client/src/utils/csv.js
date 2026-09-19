// Minimal CSV export — no library needed for "array of objects -> a file
// the browser downloads," matching this project's pattern of avoiding new
// dependencies where the scope doesn't call for one.

function escapeCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  // Quote whenever the value could otherwise be misread: a comma, a quote
  // (doubled per CSV convention), or a newline.
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// `rows` is an array of plain objects; `columns` is [{ key, label }] in the
// order they should appear. Triggers a browser download named `filename`.
export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));
  const csv = [header, ...lines].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
