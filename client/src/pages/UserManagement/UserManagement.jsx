import { useEffect, useState } from 'react';
import { getAllUsers, createStaffAccount } from '../../services/usersService';
import { AVAILABILITY_LABELS, formatDate } from '../../utils/requestFormat';
import { PlusIcon } from '../../components/icons';
import './UserManagement.css';

const FILTERS = ['all', 'student', 'technician', 'administrator'];
const FILTER_LABELS = {
  all: 'All',
  student: 'Students',
  technician: 'Technicians',
  administrator: 'Administrators',
};

const EMPTY_FORM = { name: '', email: '', idNumber: '', password: '', role: 'technician' };

// admin_dashboard_unza_maintenance's "User Management" sidebar item never
// had a page behind it — this is that page. The one real, previously-
// impossible-without-a-developer capability it unlocks: creating a
// technician or administrator account. Public registration
// (auth.service.js's registerStudent) is student-only, so before this page
// existed, every staff account in this system was provisioned by hand
// directly against Supabase.
function UserManagement() {
  const [users, setUsers] = useState(() => getAllUsers.peek() ?? null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    getAllUsers()
      .then(setUsers)
      .catch((err) => setError(err.message));
  }

  const filtered = (users || []).filter((u) => filter === 'all' || u.role === filter);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setFormError('');

    if (!form.name.trim() || !form.idNumber.trim() || !form.email.trim()) {
      setFormError('Name, Staff ID, and email are all required.');
      return;
    }
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    setCreating(true);
    try {
      await createStaffAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        idNumber: form.idNumber.trim(),
        password: form.password,
        role: form.role,
      });
      setForm(EMPTY_FORM);
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="user-management">
      <header className="user-management-header">
        <div>
          <h1 className="user-management-title">User Management</h1>
          <p className="user-management-subtitle">
            View all accounts, and provision technician or administrator access.
          </p>
        </div>
        <button
          type="button"
          className="user-management-add-button"
          onClick={() => setFormOpen((open) => !open)}
        >
          <PlusIcon width={18} height={18} />
          Add Staff Account
        </button>
      </header>

      {formOpen && (
        <form className="user-management-form" onSubmit={handleCreate}>
          <h2 className="user-management-form-title">New Staff Account</h2>
          <p className="user-management-form-note">
            Creates a technician or administrator login. Students self-register from the login
            screen instead.
          </p>

          <div className="user-management-form-grid">
            <div className="user-management-field">
              <label htmlFor="staff-name">Full Name</label>
              <input
                id="staff-name"
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>
            <div className="user-management-field">
              <label htmlFor="staff-id">Staff ID</label>
              <input
                id="staff-id"
                type="text"
                placeholder="e.g. TECH-2026-002"
                value={form.idNumber}
                onChange={(e) => updateField('idNumber', e.target.value)}
              />
            </div>
            <div className="user-management-field">
              <label htmlFor="staff-email">Email</label>
              <input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>
            <div className="user-management-field">
              <label htmlFor="staff-password">Temporary Password</label>
              <input
                id="staff-password"
                type="text"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
              />
            </div>
            <div className="user-management-field">
              <label htmlFor="staff-role">Role</label>
              <select
                id="staff-role"
                value={form.role}
                onChange={(e) => updateField('role', e.target.value)}
              >
                <option value="technician">Technician</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
          </div>

          {formError && (
            <p className="user-management-error" role="alert">
              {formError}
            </p>
          )}

          <div className="user-management-form-actions">
            <button type="submit" className="user-management-submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create Account'}
            </button>
            <button
              type="button"
              className="user-management-cancel"
              onClick={() => {
                setFormOpen(false);
                setForm(EMPTY_FORM);
                setFormError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="user-management-tabs" role="tablist">
        {FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={filter === status}
            className={`user-management-tab ${filter === status ? 'user-management-tab-selected' : ''}`}
            onClick={() => setFilter(status)}
          >
            {FILTER_LABELS[status]}
          </button>
        ))}
      </div>

      {error && (
        <p className="user-management-error" role="alert">
          Could not load users: {error}
        </p>
      )}
      {!error && users === null && <p className="user-management-loading">Loading users…</p>}
      {!error && users !== null && filtered.length === 0 && (
        <p className="user-management-empty">No accounts with this role yet.</p>
      )}

      {filtered.length > 0 && (
        <>
          <div className="user-management-list-header" aria-hidden="true">
            <span>Name</span>
            <span>Staff/Student ID</span>
            <span>Email</span>
            <span>Role</span>
            <span>Joined</span>
          </div>

          <ul className="user-management-list">
            {filtered.map((u) => (
              <li key={u.id} className="user-management-row">
                <span className="user-management-row-name">{u.name}</span>
                <span className="user-management-row-id">{u.idNumber}</span>
                <span className="user-management-row-email">{u.email}</span>
                <span className={`user-management-role user-management-role-${u.role}`}>
                  {u.role}
                  {u.role === 'technician' && u.availabilityStatus && (
                    <span
                      className={`user-management-availability user-management-availability-${u.availabilityStatus}`}
                    >
                      {AVAILABILITY_LABELS[u.availabilityStatus]}
                    </span>
                  )}
                </span>
                <span className="user-management-row-date">{formatDate(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

export default UserManagement;
