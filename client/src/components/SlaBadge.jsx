import { useEffect, useState } from 'react';
import './SlaBadge.css';

const HOUR_MS = 60 * 60 * 1000;
const AT_RISK_FRACTION = 0.25; // keep in step with server/src/utils/sla.js

function formatHours(hours) {
  const abs = Math.abs(hours);
  if (abs < 1) return `${Math.max(1, Math.round(abs * 60))}m`;
  if (abs < 48) return `${Math.round(abs)}h`;
  return `${Math.round(abs / 24)}d`;
}

// Live SLA state. The server decides the deadline (sla.dueAt / targetHours);
// this recomputes the countdown from that fixed deadline every minute so a
// page left open never shows a stale "due in 2h".
function useTick(intervalMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// Returns 'overdue' | 'at_risk' | 'on_track' | 'done' for a request's sla.
export function slaStateAt(sla, now) {
  if (!sla || sla.state === 'done') return sla?.state ?? null;
  const remaining = (new Date(sla.dueAt).getTime() - now) / HOUR_MS;
  if (remaining < 0) return 'overdue';
  if (remaining < sla.targetHours * AT_RISK_FRACTION) return 'at_risk';
  return 'on_track';
}

// Small pill: "Due in 5h" / "Due soon · 40m" / "Overdue 3h". Hidden for
// finished requests, and when the request has no SLA.
function SlaBadge({ sla }) {
  const now = useTick(60_000);
  if (!sla || sla.state === 'done') return null;

  const state = slaStateAt(sla, now);
  const hours = (new Date(sla.dueAt).getTime() - now) / HOUR_MS;

  const label =
    state === 'overdue'
      ? `Overdue ${formatHours(hours)}`
      : state === 'at_risk'
        ? `Due soon · ${formatHours(hours)}`
        : `Due in ${formatHours(hours)}`;

  return (
    <span
      className={`sla-badge sla-badge-${state}`}
      title={`Target: resolved within ${sla.targetHours} hours of being reported`}
    >
      {label}
    </span>
  );
}

export default SlaBadge;
