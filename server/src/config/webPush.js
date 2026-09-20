// Web Push (VAPID) configuration. VAPID keys identify this server to the
// browsers' push services (Google, Mozilla, Apple), so only this server can
// send notifications to the subscriptions it created. If the keys are not
// set, push is simply disabled — the rest of the app is unaffected.
import './env.js';
import webpush from 'web-push';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

export const pushEnabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
export const vapidPublicKey = pushEnabled ? VAPID_PUBLIC_KEY : null;

if (pushEnabled) {
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Sends one notification. Rejects with an error carrying `statusCode`
// (404/410 = the subscription no longer exists). TTL: if the device is
// offline, the push service holds the message for up to a day.
export function sendPushNotification(subscription, payload) {
  return webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
}
