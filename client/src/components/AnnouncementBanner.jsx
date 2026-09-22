import { useEffect, useState } from 'react';
import { getAnnouncements } from '../services/announcementsService';
import { MegaphoneIcon, XIcon } from './icons';
import { useLiveVersion } from '../hooks/useLive';
import './AnnouncementBanner.css';

const DISMISSED_KEY = 'dismissed_announcements';

function loadDismissed() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
}

// Notices from administrators, shown at the top of a dashboard. A student
// sees only the ones for their hostel plus all-hostel notices; a technician
// sees every active one, since they aren't tied to one hostel (see
// announcements.service.js). Either can dismiss one; the choice is
// remembered on this device.
function AnnouncementBanner() {
  const liveVersion = useLiveVersion();
  const [items, setItems] = useState(() => getAnnouncements.peek() ?? []);
  const [dismissed, setDismissed] = useState(loadDismissed);

  useEffect(() => {
    getAnnouncements()
      .then(setItems)
      .catch(() => {}); // a broken banner must never get in the way of the dashboard
  }, [liveVersion]);

  function dismiss(id) {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next.slice(-100)));
    } catch {
      /* storage unavailable - it just reappears next visit */
    }
  }

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <section className="announcement-banner" aria-label="Announcements">
      {visible.map((a) => (
        <article key={a.id} className="announcement-banner-item" role="status">
          <span className="announcement-banner-icon">
            <MegaphoneIcon width={20} height={20} />
          </span>
          <div className="announcement-banner-body">
            <p className="announcement-banner-title">
              {a.title}
              <span className="announcement-banner-scope">{a.hostel || 'All hostels'}</span>
            </p>
            <p className="announcement-banner-message">{a.message}</p>
            <p className="announcement-banner-meta">
              {new Date(a.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              {a.createdBy ? ` · ${a.createdBy}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="announcement-banner-close"
            onClick={() => dismiss(a.id)}
            aria-label={`Dismiss announcement: ${a.title}`}
          >
            <XIcon width={16} height={16} />
          </button>
        </article>
      ))}
    </section>
  );
}

export default AnnouncementBanner;
