// Browser side of Web Push: asks permission, subscribes this device with the
// push service, and tells the Express API about the subscription. The client
// still never talks to Supabase — it only calls the server's /push routes.
import { apiGet, apiPost } from './api';

// Remembers that the user chose to receive notifications, so we can quietly
// re-enable them after a logout/login on the same device (logout has to
// remove the device's subscription — see disablePush).
const OPT_IN_KEY = 'push_opt_in';

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// The subscription key travels as URL-safe base64; the browser API wants
// raw bytes.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// -> { supported, permission: 'granted'|'denied'|'default', subscribed }
export async function getPushStatus() {
  if (!isPushSupported()) return { supported: false, permission: 'denied', subscribed: false };
  const subscription = await currentSubscription();
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: Boolean(subscription) && Notification.permission === 'granted',
  };
}

export async function enablePush() {
  if (!isPushSupported()) {
    throw new Error('This browser does not support push notifications.');
  }

  const { publicKey } = await apiGet('/push/public-key');
  if (!publicKey) {
    throw new Error('Push notifications are not enabled on the server yet.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked. Allow them in your browser settings and try again.');
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await apiPost('/push/subscribe', { subscription: subscription.toJSON() }, { auth: true });
  try {
    localStorage.setItem(OPT_IN_KEY, '1');
  } catch {
    // storage unavailable — the toggle still works, just no silent re-enable
  }
}

// `forget: true` (the user turned the toggle off) clears the opt-in flag;
// logging out passes false so notifications come back on next login.
export async function disablePush({ forget = true } = {}) {
  if (!isPushSupported()) return;
  const subscription = await currentSubscription();
  if (subscription) {
    // Server first, while the user's token is still valid.
    await apiPost('/push/unsubscribe', { endpoint: subscription.endpoint }, { auth: true }).catch(() => {});
    await subscription.unsubscribe();
  }
  if (forget) {
    try {
      localStorage.removeItem(OPT_IN_KEY);
    } catch {
      // ignore
    }
  }
}

// After login: if this user previously opted in on this device and the
// browser permission is still granted, subscribe again without prompting.
export async function resubscribeIfOptedIn() {
  try {
    if (!isPushSupported() || Notification.permission !== 'granted') return;
    if (localStorage.getItem(OPT_IN_KEY) !== '1') return;
    await enablePush();
  } catch {
    // best effort only
  }
}
