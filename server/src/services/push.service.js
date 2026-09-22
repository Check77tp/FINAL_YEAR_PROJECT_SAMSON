// Business logic layer for push notifications. Framework-agnostic — no
// req/res objects here.
//
// Key rule: a notification is a side effect, never part of the transaction.
// notifyUser / notifyAdministrators NEVER throw — if push is disabled, a
// device is offline, or a subscription has expired, the request lifecycle
// action that triggered them must still succeed.
import * as pushRepository from '../repositories/push.repository.js';
import * as usersRepository from '../repositories/users.repository.js';
import { pushEnabled, vapidPublicKey, sendPushNotification } from '../config/webPush.js';
import { httpError } from '../utils/httpError.js';

export function getPublicKey() {
  return vapidPublicKey;
}

// `subscription` is the browser's PushSubscription.toJSON():
// { endpoint, keys: { p256dh, auth } }.
export async function subscribe({ userId, subscription }) {
  if (!pushEnabled) {
    throw httpError('Push notifications are not enabled on this server', 503);
  }
  const { endpoint, keys } = subscription || {};
  if (typeof endpoint !== 'string' || !keys?.p256dh || !keys?.auth) {
    throw httpError('A valid push subscription is required', 400);
  }

  await pushRepository.upsertSubscription({
    userId,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  });
  return { subscribed: true };
}

export async function unsubscribe({ userId, endpoint }) {
  if (typeof endpoint !== 'string' || !endpoint) {
    throw httpError('endpoint is required', 400);
  }
  await pushRepository.deleteUserSubscriptionByEndpoint({ userId, endpoint });
  return { subscribed: false };
}

async function sendToUsers(userIds, payload) {
  if (!pushEnabled || userIds.length === 0) return;

  try {
    const subscriptions = await pushRepository.findSubscriptionsByUserIds(userIds);

    await Promise.all(
      subscriptions.map(async (row) => {
        try {
          await sendPushNotification(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            payload
          );
        } catch (err) {
          // 404/410 = the user revoked permission or uninstalled the app;
          // the subscription is dead, so stop trying it.
          if (err.statusCode === 404 || err.statusCode === 410) {
            await pushRepository.deleteSubscriptionByEndpoint(row.endpoint).catch(() => {});
          } else {
            console.error('Push delivery failed:', err.statusCode || err.message);
          }
        }
      })
    );
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
}

// payload: { title, body, url, tag } — `url` is where tapping the
// notification opens the app; `tag` collapses repeat notifications about the
// same request into one.
export function notifyUser(userId, payload) {
  return sendToUsers([userId], payload);
}

// Same payload to many users at once (e.g. an announcement to a hostel).
export function notifyUsers(userIds, payload) {
  return sendToUsers([...new Set(userIds)], payload);
}

export async function notifyAdministrators(payload) {
  if (!pushEnabled) return;
  try {
    const admins = await usersRepository.findUsersByRole('administrator');
    await sendToUsers(admins.map((a) => a.user_id), payload);
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
}
