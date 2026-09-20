// Outgoing email (SMTP via nodemailer). Used only for the administrators'
// weekly summary. If SMTP_HOST / SMTP_USER / SMTP_PASS aren't set, email is
// simply disabled — the rest of the app never depends on it.
//
// Works with any SMTP provider. For Gmail: SMTP_HOST=smtp.gmail.com,
// SMTP_PORT=465, SMTP_USER=<your address>, SMTP_PASS=<an "App password">
// (Google Account -> Security -> 2-Step Verification -> App passwords).
import './env.js';
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, APP_URL } = process.env;

export const mailEnabled = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
export const appUrl = APP_URL || 'http://localhost:5173';

const transporter = mailEnabled
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 465,
      secure: (Number(SMTP_PORT) || 465) === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

export function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: MAIL_FROM || `UNZA Hostel Maintenance <${SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });
}
