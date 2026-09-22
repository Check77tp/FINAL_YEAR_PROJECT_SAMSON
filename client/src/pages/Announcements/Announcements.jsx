import { useEffect, useState } from 'react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../../services/announcementsService';
import { HOSTELS } from '../../utils/requestFormat';
import { MegaphoneIcon } from '../../components/icons';
import { useLiveVersion } from '../../hooks/useLive';
import './Announcements.css';

const EXPIRY_OPTIONS = [
  { value: '', label: 'Never expires' },
  { value: '24', label: 'After 1 day' },
  { value: '72', label: 'After 3 days' },
  { value: '168', label: 'After 1 week' },
];

const EMPTY_FORM = { title: '', message: '', hostel: '', expiry: '' };

// Administrator page: post a notice to one hostel or to every hostel. Students
// in the audience see it as a banner on their dashboard and get a push
// notification on their phone.
function Announcements() {
  const liveVersion = useLiveVersion();
  const [items, setItems] = useState(() => getAnnouncements.peek() ?? null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  function load() {
    getAnnouncements()
      .then(setItems)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [liveVersion]);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setNotice('');
    setSending(true);
    try {
      const expiresAt = form.expiry
        ? new Date(Date.now() + Number(form.expiry) * 3600 * 1000).toISOString()
        : null;
      const result = await createAnnouncement({
        title: form.title,
        message: form.message,
        hostel: form.hostel,
        expiresAt,
      });
      setNotice(
        `Announcement posted to ${form.hostel || 'all hostels'} (${result.recipients} student${
          result.recipients === 1 ? '' : 's'
        } notified).`
      );
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this announcement? Students will no longer see it.')) return;
    try {
      await deleteAnnouncement(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="announcements">
      <header className="announcements-header">
        <h1 className="announcements-title">Announcements</h1>
        <p className="announcements-subtitle">
          Send a notice to the students of one hostel, or all of them. It appears on their dashboard and is pushed
          to their phones.
        </p>
      </header>

      <form className="announcements-form" onSubmit={handleSubmit}>
        <h2 className="announcements-section-title">New announcement</h2>

        <label className="announcements-label" htmlFor="announcement-title">Title</label>
        <input
          id="announcement-title"
          className="announcements-input"
          maxLength={80}
          placeholder="e.g. Water cut in Block C"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
        />

        <label className="announcements-label" htmlFor="announcement-message">Message</label>
        <textarea
          id="announcement-message"
          className="announcements-input announcements-textarea"
          rows={4}
          maxLength={500}
          placeholder="e.g. There will be no running water from 10:00 to 12:00 while the pipes are repaired."
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
        />
        <span className="announcements-count">{form.message.length}/500</span>

        <div className="announcements-row">
          <div className="announcements-field">
            <label className="announcements-label" htmlFor="announcement-hostel">Send to</label>
            <select
              id="announcement-hostel"
              className="announcements-input"
              value={form.hostel}
              onChange={(e) => update('hostel', e.target.value)}
            >
              <option value="">All hostels</option>
              {HOSTELS.filter((h) => h !== 'Other').map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div className="announcements-field">
            <label className="announcements-label" htmlFor="announcement-expiry">Expires</label>
            <select
              id="announcement-expiry"
              className="announcements-input"
              value={form.expiry}
              onChange={(e) => update('expiry', e.target.value)}
            >
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {formError && <p className="announcements-error" role="alert">{formError}</p>}
        {notice && <p className="announcements-notice" role="status">{notice}</p>}

        <button type="submit" className="announcements-send" disabled={sending}>
          <MegaphoneIcon width={18} height={18} />
          {sending ? 'Sending…' : 'Post announcement'}
        </button>
      </form>

      <section className="announcements-list-section">
        <h2 className="announcements-section-title">Posted announcements</h2>
        {error && <p className="announcements-error" role="alert">{error}</p>}
        {items === null && !error && <p className="announcements-muted">Loading…</p>}
        {items && items.length === 0 && <p className="announcements-muted">No announcements yet.</p>}

        <ul className="announcements-list">
          {(items || []).map((a) => (
            <li key={a.id} className={`announcements-item ${a.active ? '' : 'announcements-item-expired'}`}>
              <div className="announcements-item-body">
                <p className="announcements-item-title">
                  {a.title}
                  <span className="announcements-chip">{a.hostel || 'All hostels'}</span>
                  <span className={`announcements-chip ${a.active ? 'announcements-chip-active' : ''}`}>
                    {a.active ? 'Active' : 'Expired'}
                  </span>
                </p>
                <p className="announcements-item-message">{a.message}</p>
                <p className="announcements-item-meta">
                  {new Date(a.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  {a.createdBy ? ` · ${a.createdBy}` : ''}
                  {a.expiresAt
                    ? ` · expires ${new Date(a.expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
                    : ''}
                </p>
              </div>
              <button type="button" className="announcements-delete" onClick={() => handleDelete(a.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default Announcements;
