import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getSchedules,
  createSchedule,
  setScheduleActive,
  deleteSchedule,
  runScheduleNow,
} from '../../services/schedulesService';
import { getCategories } from '../../services/categoriesService';
import { HOSTELS, PRIORITY_LABELS, PRIORITY_VALUES, STATUS_LABELS, categoryIcon } from '../../utils/requestFormat';
import { useLiveVersion } from '../../hooks/useLive';
import './PreventiveMaintenance.css';

const FREQUENCY_LABELS = {
  7: 'Every week',
  14: 'Every 2 weeks',
  21: 'Every 3 weeks',
  30: 'Every month',
  90: 'Every 3 months',
  180: 'Every 6 months',
  365: 'Every year',
};

const today = () => new Date().toISOString().slice(0, 10);

function dueLabel(schedule) {
  if (!schedule.active) return 'Paused';
  const days = Math.ceil((new Date(schedule.nextDueAt).getTime() - Date.now()) / 86400e3);
  if (schedule.dueNow || days <= 0) return 'Due now';
  return days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
}

// Administrator page: recurring inspections/servicing that the system turns
// into maintenance requests automatically (see server/src/services/
// schedules.service.js). Catching problems early beats waiting for reports.
function PreventiveMaintenance() {
  const liveVersion = useLiveVersion();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(() => getSchedules.peek() ?? null);
  const [categories, setCategories] = useState(() => getCategories.peek() ?? []);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  // The Reports page's "Plan preventive check" link prefills the form.
  const prefill = {
    title: searchParams.get('title') || '',
    hostel: searchParams.get('hostel') || '',
    room: searchParams.get('room') || '',
    categoryId: searchParams.get('categoryId') || '',
  };
  const [formOpen, setFormOpen] = useState(Boolean(prefill.title || prefill.hostel));
  const [form, setForm] = useState({
    title: prefill.title,
    description: '',
    categoryId: prefill.categoryId,
    hostel: prefill.hostel,
    room: prefill.room,
    priority: 'low',
    frequencyDays: '30',
    firstDueAt: today(),
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    getSchedules()
      .then(setData)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [liveVersion]);
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handleCreate(event) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await createSchedule({
        title: form.title,
        description: form.description,
        categoryId: form.categoryId,
        hostel: form.hostel,
        room: form.room,
        priority: form.priority,
        frequencyDays: Number(form.frequencyDays),
        firstDueAt: form.firstDueAt ? new Date(`${form.firstDueAt}T06:00:00`).toISOString() : undefined,
      });
      setFormOpen(false);
      setMessage('Schedule created. The first task appears when it falls due.');
      setForm((prev) => ({ ...prev, title: '', description: '', room: '' }));
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function act(id, fn, success) {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      const result = await fn();
      if (success) setMessage(success(result));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const schedules = data?.schedules ?? null;

  return (
    <main className="preventive">
      <header className="preventive-header">
        <div>
          <h1 className="preventive-title">Preventive Maintenance</h1>
          <p className="preventive-subtitle">
            Schedule regular checks (for example, inspect the geysers every month). When one falls due the system
            creates the task automatically, so problems are caught before students have to report them.
          </p>
        </div>
        <button type="button" className="preventive-add" onClick={() => setFormOpen((o) => !o)}>
          {formOpen ? 'Close' : '+ New schedule'}
        </button>
      </header>

      {message && <p className="preventive-message" role="status">{message}</p>}
      {error && <p className="preventive-error" role="alert">{error}</p>}

      {formOpen && (
        <form className="preventive-form" onSubmit={handleCreate}>
          <h2 className="preventive-section-title">New schedule</h2>

          <label className="preventive-label" htmlFor="ps-title">What needs doing?</label>
          <input id="ps-title" className="preventive-input" maxLength={100} placeholder="e.g. Inspect and service geysers"
            value={form.title} onChange={(e) => update('title', e.target.value)} />

          <label className="preventive-label" htmlFor="ps-desc">Notes <span className="preventive-optional">Optional</span></label>
          <textarea id="ps-desc" className="preventive-input" rows={2} placeholder="Anything the technician should check"
            value={form.description} onChange={(e) => update('description', e.target.value)} />

          <div className="preventive-grid">
            <div className="preventive-field">
              <label className="preventive-label" htmlFor="ps-category">Category</label>
              <select id="ps-category" className="preventive-input" value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
                <option value="" disabled>Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="preventive-field">
              <label className="preventive-label" htmlFor="ps-hostel">Hostel</label>
              <select id="ps-hostel" className="preventive-input" value={form.hostel} onChange={(e) => update('hostel', e.target.value)}>
                <option value="" disabled>Select hostel</option>
                {HOSTELS.filter((h) => h !== 'Other').map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="preventive-field">
              <label className="preventive-label" htmlFor="ps-room">Room / area <span className="preventive-optional">Optional</span></label>
              <input id="ps-room" className="preventive-input" placeholder="e.g. Block C" value={form.room} onChange={(e) => update('room', e.target.value)} />
            </div>
            <div className="preventive-field">
              <label className="preventive-label" htmlFor="ps-frequency">How often</label>
              <select id="ps-frequency" className="preventive-input" value={form.frequencyDays} onChange={(e) => update('frequencyDays', e.target.value)}>
                {Object.entries(FREQUENCY_LABELS).map(([days, label]) => <option key={days} value={days}>{label}</option>)}
              </select>
            </div>
            <div className="preventive-field">
              <label className="preventive-label" htmlFor="ps-priority">Priority of the task</label>
              <select id="ps-priority" className="preventive-input" value={form.priority} onChange={(e) => update('priority', e.target.value)}>
                {PRIORITY_VALUES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div className="preventive-field">
              <label className="preventive-label" htmlFor="ps-first">First task due</label>
              <input id="ps-first" type="date" className="preventive-input" value={form.firstDueAt} onChange={(e) => update('firstDueAt', e.target.value)} />
            </div>
          </div>

          {formError && <p className="preventive-error" role="alert">{formError}</p>}
          <button type="submit" className="preventive-save" disabled={saving}>{saving ? 'Saving…' : 'Create schedule'}</button>
        </form>
      )}

      <section className="preventive-list-section">
        <h2 className="preventive-section-title">Schedules</h2>
        {schedules === null && !error && <p className="preventive-muted">Loading…</p>}
        {schedules && schedules.length === 0 && (
          <p className="preventive-muted">
            No schedules yet. Create one for anything that needs regular attention, or start from a
            &ldquo;Needs a Permanent Fix&rdquo; suggestion on the Reports page.
          </p>
        )}

        <ul className="preventive-list">
          {(schedules || []).map((s) => {
            const Icon = categoryIcon(s.category?.name);
            return (
              <li key={s.id} className={`preventive-item ${s.active ? '' : 'preventive-item-paused'}`}>
                <span className="preventive-icon"><Icon width={20} height={20} /></span>
                <div className="preventive-item-body">
                  <p className="preventive-item-title">
                    {s.title}
                    <span className={`preventive-chip ${s.dueNow ? 'preventive-chip-due' : ''}`}>{dueLabel(s)}</span>
                  </p>
                  <p className="preventive-item-meta">
                    {s.category?.name} &middot; {s.hostel}{s.room ? `, ${s.room}` : ''} &middot; {FREQUENCY_LABELS[s.frequencyDays] || `Every ${s.frequencyDays} days`} &middot; {PRIORITY_LABELS[s.priority]} priority
                  </p>
                  {s.description && <p className="preventive-item-notes">{s.description}</p>}
                  <p className="preventive-item-meta">
                    Next due {new Date(s.nextDueAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    {s.lastRequest && (
                      <>
                        {' '}&middot; last task{' '}
                        <Link to={`/manage-requests/${s.lastRequest.requestId}`} className="preventive-link">
                          #REQ-{s.lastRequest.requestId}
                        </Link>{' '}
                        ({STATUS_LABELS[s.lastRequest.status] || s.lastRequest.status})
                      </>
                    )}
                  </p>
                </div>
                <div className="preventive-actions">
                  <button type="button" className="preventive-btn" disabled={busyId === s.id}
                    onClick={() => act(s.id, () => runScheduleNow(s.id), (r) => `Task #REQ-${r.requestId} created.`)}>
                    Run now
                  </button>
                  <button type="button" className="preventive-btn" disabled={busyId === s.id}
                    onClick={() => act(s.id, () => setScheduleActive(s.id, !s.active))}>
                    {s.active ? 'Pause' : 'Resume'}
                  </button>
                  <button type="button" className="preventive-btn preventive-btn-danger" disabled={busyId === s.id}
                    onClick={() => window.confirm(`Delete the schedule "${s.title}"? Tasks already created are kept.`) && act(s.id, () => deleteSchedule(s.id))}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

export default PreventiveMaintenance;
