// Background jobs. Kept deliberately simple — plain timers inside the Express
// process, no queue or cron service — which is right for a single-instance
// deployment. Each job catches its own errors so one failure can never crash
// the server or stop the other jobs.
import { NODE_ENV } from '../config/env.js';
import { runOverdueCheck } from '../services/overdue.service.js';
import { runWeeklyDigestIfDue } from '../services/digest.service.js';

const OVERDUE_CHECK_EVERY_MS = 60 * 60 * 1000; // hourly: alerts/reminders go out on the first check after they fall due
const FIRST_RUN_DELAY_MS = 30 * 1000; // let the server finish starting first

let overdueWarned = false;
let digestWarned = false;
const DIGEST_CHECK_EVERY_MS = 60 * 60 * 1000; // hourly; the service decides whether it is actually due

async function safeOverdueCheck() {
  try {
    const flagged = await runOverdueCheck();
    if (flagged > 0) console.log(`Overdue monitor: alerted about ${flagged} request(s)`);
    overdueWarned = false;
  } catch (err) {
    // Most likely cause: migration 011 hasn't been run yet. Say so once, not every hour.
    if (!overdueWarned) {
      console.error('Overdue monitor failed (has sql/011 been run?):', err.message);
      overdueWarned = true;
    }
  }
}

async function safeDigestCheck() {
  try {
    const result = await runWeeklyDigestIfDue();
    if (result.sent) console.log(`Weekly summary emailed to ${result.sent} administrator(s)`);
    digestWarned = false;
  } catch (err) {
    if (!digestWarned) {
      console.error('Weekly summary job failed (has sql/011 been run? is SMTP correct?):', err.message);
      digestWarned = true;
    }
  }
}

export function startScheduler() {
  if (NODE_ENV === 'test') return;

  setTimeout(safeOverdueCheck, FIRST_RUN_DELAY_MS);
  setInterval(safeOverdueCheck, OVERDUE_CHECK_EVERY_MS);

  setTimeout(safeDigestCheck, FIRST_RUN_DELAY_MS);
  setInterval(safeDigestCheck, DIGEST_CHECK_EVERY_MS);
}
