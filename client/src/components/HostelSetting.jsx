import { useEffect, useState } from 'react';
import { getMyHostel, setMyHostel } from '../services/announcementsService';
import { HOSTELS } from '../utils/requestFormat';
import './HostelSetting.css';

// Account Settings card (students): which hostel you live in. It is used to
// send you announcements for your hostel and to pre-fill your community feed.
function HostelSetting() {
  const [hostel, setHostel] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getMyHostel()
      .then((h) => setHostel(h || ''))
      .catch(() => {}) // not migrated yet / offline: just show an empty choice
      .finally(() => setLoaded(true));
  }, []);

  async function handleChange(event) {
    const value = event.target.value;
    setHostel(value);
    setMessage('');
    setError('');
    try {
      await setMyHostel(value);
      setMessage('Saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!loaded) return null;

  return (
    <section className="hostel-setting">
      <div className="hostel-setting-text">
        <p className="hostel-setting-title">My hostel</p>
        <p className="hostel-setting-note">
          Choose where you live to receive announcements for your hostel.
        </p>
        {message && <p className="hostel-setting-saved" role="status">{message}</p>}
        {error && <p className="hostel-setting-error" role="alert">{error}</p>}
      </div>
      <select
        className="hostel-setting-select"
        value={hostel}
        onChange={handleChange}
        aria-label="My hostel"
      >
        <option value="" disabled>Select your hostel</option>
        {HOSTELS.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </section>
  );
}

export default HostelSetting;
