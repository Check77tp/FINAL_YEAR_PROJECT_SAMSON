import { useEffect, useState } from 'react';
import { getPushStatus, enablePush, disablePush } from '../services/pushService';
import './NotificationSettings.css';

// Account Settings card for turning push notifications on/off for THIS
// device. Each device subscribes separately (phone vs laptop).
function NotificationSettings() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPushStatus()
      .then(setStatus)
      .catch(() => setStatus({ supported: false, permission: 'denied', subscribed: false }));
  }, []);

  async function handleToggle() {
    setBusy(true);
    setError('');
    try {
      if (status.subscribed) await disablePush();
      else await enablePush();
      setStatus(await getPushStatus());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  const blocked = status.supported && status.permission === 'denied';

  return (
    <section className="notification-settings">
      <div className="notification-settings-text">
        <p className="notification-settings-title">Push Notifications</p>
        <p className="notification-settings-note">
          {!status.supported
            ? 'This browser does not support push notifications. On iPhone, add the app to your Home Screen first.'
            : blocked
              ? 'Notifications are blocked for this site. Allow them in your browser settings to turn this on.'
              : 'Get alerts about new assignments and status changes, even when the app is closed.'}
        </p>
        {error && (
          <p className="notification-settings-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={status.subscribed}
        aria-label="Push notifications on this device"
        className={`notification-settings-switch ${
          status.subscribed ? 'notification-settings-switch-on' : ''
        }`}
        onClick={handleToggle}
        disabled={busy || !status.supported || blocked}
      >
        <span className="notification-settings-knob" />
      </button>
    </section>
  );
}

export default NotificationSettings;
