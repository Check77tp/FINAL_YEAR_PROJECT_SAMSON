import { useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { updateOwnProfile } from '../../services/usersService';
import { AVAILABILITY_LABELS } from '../../utils/requestFormat';
import { CameraIcon } from '../../components/icons';
import './Profile.css';

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

// user_profile_unza_maintenance reference, trimmed to what's real: no
// Two-Factor Auth, login-attempt alerts, notification subscriptions, or
// theme/language settings — none of that is backed by anything this app
// actually has. Email, ID number, and role are read-only (see
// users.service.js's updateOwnProfile for why).
function Profile() {
  const { user, updateUser, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedNote, setSavedNote] = useState(false);

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPhotoError('');
    setSavedNote(false);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError('Photo must be a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Photo must be 3MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setPhotoDataUrl(reader.result);
      setSaving(true);
      setSaveError('');
      try {
        const updated = await updateOwnProfile({ photoDataUrl: reader.result });
        updateUser(updated);
        setSavedNote(true);
      } catch (err) {
        setSaveError(err.message);
      } finally {
        setSaving(false);
      }
    };
    reader.onerror = () => setPhotoError('Could not read that file — please try again.');
    reader.readAsDataURL(file);
  }

  async function handleSaveName(event) {
    event.preventDefault();
    if (!name.trim()) {
      setSaveError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateOwnProfile({ name: name.trim() });
      updateUser(updated);
      setEditing(false);
      setSavedNote(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const avatarSrc = photoDataUrl || user?.avatar_url;

  return (
    <main className="profile">
      <header className="profile-header">
        <div>
          <h1 className="profile-title">Account Settings</h1>
          <p className="profile-subtitle">View your account details and update your profile.</p>
        </div>
        {!editing && (
          <button type="button" className="profile-edit-button" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )}
      </header>

      <section className="profile-card">
        <div className="profile-avatar-row">
          <div className="profile-avatar-wrap">
            {avatarSrc ? (
              <img src={avatarSrc} alt={user?.name} className="profile-avatar" />
            ) : (
              <div className="profile-avatar profile-avatar-initials">{initials(user?.name)}</div>
            )}
            <button
              type="button"
              className="profile-avatar-edit"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile photo"
              disabled={saving}
            >
              <CameraIcon width={16} height={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="profile-file-input"
              onChange={handlePhotoChange}
            />
          </div>

          {user?.role === 'technician' && user?.availability_status && (
            <span
              className={`profile-availability profile-availability-${user.availability_status}`}
            >
              {AVAILABILITY_LABELS[user.availability_status]}
            </span>
          )}
        </div>

        {photoError && (
          <p className="profile-error" role="alert">
            {photoError}
          </p>
        )}

        {editing ? (
          <form className="profile-name-form" onSubmit={handleSaveName}>
            <label className="profile-field-label" htmlFor="profile-name-input">
              Full Name
            </label>
            <input
              id="profile-name-input"
              type="text"
              className="profile-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="profile-name-actions">
              <button type="submit" className="profile-save-button" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="profile-cancel-button"
                onClick={() => {
                  setEditing(false);
                  setName(user?.name || '');
                  setSaveError('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-fields">
            <div className="profile-field">
              <span className="profile-field-label">Full Name</span>
              <span className="profile-field-value">{user?.name}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Student/Staff ID</span>
              <span className="profile-field-value">{user?.id_number}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Email Address</span>
              <span className="profile-field-value">{user?.email}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">Role</span>
              <span className="profile-field-value profile-role">{user?.role}</span>
            </div>
          </div>
        )}

        {saveError && (
          <p className="profile-error" role="alert">
            {saveError}
          </p>
        )}
        {savedNote && !saveError && <p className="profile-saved-note">Saved.</p>}
      </section>

      <section className="profile-signout">
        <div>
          <p className="profile-signout-title">Sign Out</p>
          <p className="profile-signout-note">Disconnect from the UNZA maintenance system.</p>
        </div>
        <button type="button" className="profile-signout-button" onClick={logout}>
          Log Out
        </button>
      </section>
    </main>
  );
}

export default Profile;
