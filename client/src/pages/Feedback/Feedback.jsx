import { useEffect, useState } from 'react';
import { submitFeedback, getMyFeedback } from '../../services/feedbackService';
import { StarIcon } from '../../components/icons';
import './Feedback.css';

const CATEGORIES = [
  { value: 'general', label: 'General feedback' },
  { value: 'suggestion', label: 'A suggestion' },
  { value: 'bug', label: 'Something is broken' },
];

// A review of the APP ITSELF - separate from rating a technician's work on
// one request (see RequestDetail's "Rate This Repair"). This exists so a
// student who has no direct line to the developer still has a way to be
// heard; an administrator reads what comes in on the "App Feedback" page.
function Feedback() {
  const [items, setItems] = useState(() => getMyFeedback.peek() ?? null);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  function load() {
    getMyFeedback()
      .then(setItems)
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setNotice('');

    if (!rating) {
      setFormError('Choose a star rating first.');
      return;
    }

    setSending(true);
    try {
      await submitFeedback({ rating, category, message });
      setNotice("Thanks - your feedback has been sent to the development team.");
      setRating(0);
      setCategory('general');
      setMessage('');
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="feedback-page">
      <header className="feedback-page-header">
        <h1 className="feedback-page-title">Send Feedback</h1>
        <p className="feedback-page-subtitle">
          Tell us how the app is working for you - a bug you spotted, something that could be easier to use, or
          just your overall impression. This goes straight to the development team.
        </p>
      </header>

      <form className="feedback-page-form" onSubmit={handleSubmit}>
        <label className="feedback-page-label" htmlFor="feedback-rating">How would you rate the app overall?</label>
        <div
          id="feedback-rating"
          className="feedback-page-stars"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="feedback-page-star-button"
              disabled={sending}
              onMouseEnter={() => setHoverRating(n)}
              onClick={() => setRating(n)}
              aria-label={`Rate ${n} out of 5`}
            >
              <StarIcon width={28} height={28} className={n <= (hoverRating || rating) ? 'feedback-page-star-filled' : ''} />
            </button>
          ))}
        </div>

        <label className="feedback-page-label" htmlFor="feedback-category">What's this about?</label>
        <select
          id="feedback-category"
          className="feedback-page-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <label className="feedback-page-label" htmlFor="feedback-message">Details (optional)</label>
        <textarea
          id="feedback-message"
          className="feedback-page-input feedback-page-textarea"
          rows={4}
          maxLength={1000}
          placeholder="e.g. The photo upload is slow on my phone, or: I really like how easy it was to report an issue."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <span className="feedback-page-count">{message.length}/1000</span>

        {formError && <p className="feedback-page-error" role="alert">{formError}</p>}
        {notice && <p className="feedback-page-notice" role="status">{notice}</p>}

        <button type="submit" className="feedback-page-send" disabled={sending}>
          {sending ? 'Sending…' : 'Send Feedback'}
        </button>
      </form>

      <section className="feedback-page-history">
        <h2 className="feedback-page-section-title">Your past feedback</h2>
        {error && <p className="feedback-page-error" role="alert">{error}</p>}
        {items === null && !error && <p className="feedback-page-muted">Loading…</p>}
        {items && items.length === 0 && <p className="feedback-page-muted">You haven&rsquo;t sent any feedback yet.</p>}

        <ul className="feedback-page-history-list">
          {(items || []).map((f) => (
            <li key={f.id} className="feedback-page-history-item">
              <div className="feedback-page-stars feedback-page-stars-small" aria-label={`Rated ${f.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} width={16} height={16} className={n <= f.rating ? 'feedback-page-star-filled' : ''} />
                ))}
              </div>
              {f.message && <p className="feedback-page-history-message">{f.message}</p>}
              <p className="feedback-page-history-meta">
                {CATEGORIES.find((c) => c.value === f.category)?.label || f.category}
                {' · '}
                {new Date(f.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default Feedback;
