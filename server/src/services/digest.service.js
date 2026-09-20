// Business logic layer for the administrators' weekly summary email.
// Framework-agnostic. The statistics and the email template are pure
// functions (unit-tested); sendWeeklyDigest / runWeeklyDigestIfDue do the I/O.
import * as reportsRepository from '../repositories/reports.repository.js';
import * as requestsRepository from '../repositories/requests.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as jobsRepository from '../repositories/jobs.repository.js';
import { mailEnabled, sendMail, appUrl } from '../config/mailer.js';
import { computeAverageResolutionHours } from './reports.service.js';
import { computeSla } from '../utils/sla.js';
import { httpError } from '../utils/httpError.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const JOB_NAME = 'weekly_digest';

// Sent Mondays at 06:00 UTC = 08:00 in Lusaka (CAT, UTC+2, no daylight saving).
const SEND_DAY_UTC = 1; // Monday
const SEND_HOUR_UTC = 6;

function topEntry(counts) {
  let best = null;
  for (const [name, count] of counts) {
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

function tally(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

// Pure. requestRows: { request_id, created_at, hostel, category:{name} }
// historyRows: { request_id, new_status, changed_at } (open + resolved events)
// activeRows: { priority, status, created_at } for requests still in progress.
export function computeWeeklyStats({ requestRows, historyRows, activeRows, now = new Date() }) {
  const end = now.getTime();
  const start = end - 7 * DAY_MS;
  const previousStart = start - 7 * DAY_MS;

  const inWindow = (iso, from, to) => {
    const t = new Date(iso).getTime();
    return t >= from && t < to;
  };

  const newThisWeek = requestRows.filter((r) => inWindow(r.created_at, start, end));
  const newLastWeek = requestRows.filter((r) => inWindow(r.created_at, previousStart, start));

  const resolvedEvents = historyRows.filter(
    (h) => h.new_status === 'resolved' && inWindow(h.changed_at, start, end)
  );
  const resolvedIds = new Set(resolvedEvents.map((h) => h.request_id));
  const avgResolutionHours = computeAverageResolutionHours(
    historyRows.filter((h) => resolvedIds.has(h.request_id))
  );

  const overdueNow = activeRows.filter(
    (r) => computeSla({ priority: r.priority, status: r.status, createdAt: r.created_at, now })?.state === 'overdue'
  ).length;

  return {
    periodStart: new Date(start).toISOString(),
    periodEnd: new Date(end).toISOString(),
    newRequests: newThisWeek.length,
    newRequestsLastWeek: newLastWeek.length,
    resolved: resolvedEvents.length,
    avgResolutionHours,
    openNow: activeRows.length,
    overdueNow,
    topHostel: topEntry(tally(newThisWeek, (r) => r.hostel || 'Unspecified')),
    topCategory: topEntry(tally(newThisWeek, (r) => r.category?.name || 'Uncategorized')),
  };
}

function formatHours(hours) {
  if (hours === null || hours === undefined) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} h`;
}

function trendText(current, previous) {
  if (previous === 0) return current === 0 ? 'same as last week' : 'none last week';
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return 'same as last week';
  return `${pct > 0 ? '+' : ''}${pct}% vs last week`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Pure. Returns { subject, html, text } — inline styles only, because email
// clients strip <style> blocks and ignore external CSS.
export function renderDigestEmail(stats, { appUrl: url = appUrl } = {}) {
  const from = new Date(stats.periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const to = new Date(stats.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const subject = `Hostel maintenance — weekly summary (${from} – ${to})`;

  const rows = [
    ['New requests', String(stats.newRequests), trendText(stats.newRequests, stats.newRequestsLastWeek)],
    ['Resolved', String(stats.resolved), ''],
    ['Average resolution time', formatHours(stats.avgResolutionHours), 'for requests resolved this week'],
    ['Still open', String(stats.openNow), ''],
    ['Overdue right now', String(stats.overdueNow), stats.overdueNow > 0 ? 'needs attention' : 'all on track'],
  ];

  const highlights = [];
  if (stats.topHostel) highlights.push(`Busiest hostel: <strong>${escapeHtml(stats.topHostel.name)}</strong> (${stats.topHostel.count} new)`);
  if (stats.topCategory) highlights.push(`Most common issue: <strong>${escapeHtml(stats.topCategory.name)}</strong> (${stats.topCategory.count})`);

  const rowHtml = rows
    .map(
      ([label, value, note]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#40493d">${escapeHtml(label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;font-size:18px;color:${label.startsWith('Overdue') && stats.overdueNow > 0 ? '#ba1a1a' : '#181d17'}">${escapeHtml(value)}</td>
          <td style="padding:10px 0 10px 12px;border-bottom:1px solid #e5e7eb;color:#707a6c;font-size:12px">${escapeHtml(note)}</td>
        </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7fbf0;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0">
    <tr><td style="padding:24px 24px 8px">
      <div style="font-size:12px;font-weight:700;letter-spacing:.05em;color:#2e7d32">UNZA HOSTEL MAINTENANCE</div>
      <h1 style="margin:8px 0 4px;font-size:22px;color:#181d17">Weekly summary</h1>
      <div style="color:#707a6c;font-size:13px">${from} – ${to}</div>
    </td></tr>
    <tr><td style="padding:8px 24px"><table role="presentation" width="100%" style="border-collapse:collapse">${rowHtml}</table></td></tr>
    ${highlights.length ? `<tr><td style="padding:8px 24px;color:#181d17;font-size:14px;line-height:22px">${highlights.join('<br>')}</td></tr>` : ''}
    <tr><td style="padding:16px 24px 24px">
      <a href="${escapeHtml(url)}/reports" style="display:inline-block;padding:12px 20px;background:#2e7d32;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px">Open Reports &amp; Analytics</a>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `Hostel maintenance — weekly summary (${from} – ${to})`,
    '',
    ...rows.map(([label, value, note]) => `${label}: ${value}${note ? ` (${note})` : ''}`),
    '',
    stats.topHostel ? `Busiest hostel: ${stats.topHostel.name} (${stats.topHostel.count} new)` : '',
    stats.topCategory ? `Most common issue: ${stats.topCategory.name} (${stats.topCategory.count})` : '',
    '',
    `Reports: ${url}/reports`,
  ]
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n');

  return { subject, html, text };
}

async function loadStats(now) {
  const [requestRows, historyRows, activeRows] = await Promise.all([
    reportsRepository.findRequestsForCategoryAndMonthMetrics(),
    reportsRepository.findOpenAndResolvedHistory(),
    requestsRepository.findActiveRequestsForSla(),
  ]);
  return computeWeeklyStats({ requestRows, historyRows, activeRows, now });
}

// Administrator action ("Email me the summary now"): sends to that one
// administrator only — handy for previewing, and cannot spam anyone else.
export async function sendDigestToUser({ email, now = new Date() }) {
  if (!mailEnabled) {
    throw httpError('Email is not configured on the server (set SMTP_HOST, SMTP_USER and SMTP_PASS)', 503);
  }
  const message = renderDigestEmail(await loadStats(now));
  await sendMail({ to: email, ...message });
  return { sentTo: email };
}

// True once per week: it's at/after Monday 06:00 UTC and the job hasn't run
// since that moment. Pure, so the schedule logic is unit-tested.
export function isDigestDue(now, lastRun) {
  const day = now.getUTCDay();
  const sinceMonday = (day + 6) % 7; // days since the most recent Monday
  const slot = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - sinceMonday, SEND_HOUR_UTC);
  if (now.getTime() < slot) return false; // before this week's send time
  return !lastRun || lastRun.getTime() < slot;
}

// Called hourly by the scheduler. Sends to every administrator when due.
export async function runWeeklyDigestIfDue(now = new Date()) {
  if (!mailEnabled) return { skipped: 'email not configured' };

  const lastRun = await jobsRepository.findLastRun(JOB_NAME);
  if (!isDigestDue(now, lastRun)) return { skipped: 'not due' };

  const admins = await usersRepository.findUsersByRole('administrator');
  const recipients = admins.map((a) => a.email).filter(Boolean);
  if (recipients.length === 0) return { skipped: 'no administrator emails' };

  const message = renderDigestEmail(await loadStats(now));
  // Record the run FIRST: if sending throws halfway we prefer to miss one
  // week over sending duplicates on every hourly retry.
  await jobsRepository.recordRun(JOB_NAME, now);
  await Promise.all(recipients.map((to) => sendMail({ to, ...message })));

  return { sent: recipients.length };
}
